/**
 * APPLICATION CONTROLLER
 * Điều khiển giao diện người dùng, vòng lặp bài tập, tương tác và quản lý dữ liệu
 */

import { AudioService } from './services/audio-service.js';
import { ToastView } from './views/toast-view.js';
import { ModalView } from './views/modal-view.js';
import { StateModel } from './models/state-model.js';
import { LessonModel } from './models/lesson-model.js';
import { GamificationService } from './services/gamification-service.js';

const DB_VERSION = 'sct2_db_v3_modular';

const App = {
    curLesson: "bai1",
    data: {},
    queue: [],
    total: 0,
    activeQ: null,
    slots: [],
    userTxt: '',
    checked: false,
    mode: 'parsing', // 'parsing' (xếp từ) hoặc 'typing' (tự gõ)
    // Gamification State (Tim tự hồi 20 phút & Streak chuẩn lịch Việt Nam)
    hearts: 5,
    maxHearts: 5,
    lastHeartLostTime: null,
    heartTimerInterval: null,
    REFILL_INTERVAL_MS: 20 * 60 * 1000, // 20 phút / 1 tim
    streak: 0,
    lastCompletedDate: null,

    firstTryCorrect: 0,
    attemptedQuestions: {},
    settings: {
        voiceSpeed: 0.98,
        autoAudio: true,
        showPinyin: true,
    },

    async init() {
        this.loadGamificationState();
        this.loadMode();
        this.loadSettings();

        // Khởi tạo bộ chọn cấp độ nếu có
        if (typeof LevelManager !== 'undefined') {
            LevelManager.init();
        }

        this.loadData();
        this.buildPicker();
        this.bindUI();

        // Tự động dò tìm và nạp bài học theo cấp độ
        const currentLevel = (typeof LevelManager !== 'undefined') ? LevelManager.currentLevel : 'hsk1';
        await this.loadLevelData(currentLevel);

        if (typeof NavigationHub !== 'undefined') {
            NavigationHub.init();
            NavigationHub.showDashboard();
        } else {
            const keys = Object.keys(this.data);
            const startKey = keys.includes(this.curLesson) ? this.curLesson : (keys[0] || 'bai1');
            this.start(startKey);
        }
    },

    // --- GAMIFICATION V2: HỆ THỐNG TIM TỰ HỒI & STREAK CHUẨN LỊCH ---
    getLocalDateString(d = new Date()) {
        try {
            return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
        } catch (e) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
    },

    loadGamificationState() {
        const gState = GamificationService.loadState();
        this.hearts = gState.hearts;
        this.maxHearts = gState.maxHearts;
        this.lastHeartLostTime = gState.lastHeartLostTime;
        this.streak = gState.streak;
        this.lastCompletedDate = gState.lastCompletedDate;

        this.updateHeartsUI();
        this.updateStreakUI();

        window.addEventListener('storage', (e) => {
            if (e.key === 'sct2_gamification_state' && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    this.hearts = typeof data.hearts === 'number' ? data.hearts : this.hearts;
                    this.lastHeartLostTime = data.lastHeartLostTime;
                    this.streak = typeof data.streak === 'number' ? data.streak : this.streak;
                    this.lastCompletedDate = data.lastCompletedDate;
                    this.updateHeartsUI();
                    this.updateStreakUI();
                    if (this.hearts > 0) {
                        document.getElementById('no-hearts-dialog')?.classList.add('hidden');
                        this.stopHeartCountdownTimer();
                    }
                } catch (err) {}
            }
        });
    },

    saveGamificationState() {
        GamificationService.hearts = this.hearts;
        GamificationService.lastHeartLostTime = this.lastHeartLostTime;
        GamificationService.streak = this.streak;
        GamificationService.lastCompletedDate = this.lastCompletedDate;
        GamificationService.saveState();
    },

    refreshHearts() {
        GamificationService.calcPassiveRegen();
        this.hearts = GamificationService.hearts;
        this.lastHeartLostTime = GamificationService.lastHeartLostTime;
        this.updateHeartsUI(true);
    },

    getHeartCountdownInfo() {
        const countdown = GamificationService.getCountdown();
        return {
            remainingMs: countdown ? 1 : 0,
            text: countdown || 'Đầy 5/5'
        };
    },

    updateHeartsUI(animate = false) {
        const el = document.getElementById('stat-hearts');
        if (el) el.textContent = this.hearts;

        const container = document.getElementById('heart-container');
        if (container) {
            if (this.hearts >= this.maxHearts) {
                container.title = `Số tim: ${this.hearts}/${this.maxHearts} (Đã đầy)`;
            } else {
                const countdown = this.getHeartCountdownInfo().text;
                container.title = `Số tim: ${this.hearts}/${this.maxHearts} (Hồi 1 tim sau: ${countdown} - Bấm để nạp đầy)`;
            }
        }

        const icon = document.getElementById('heart-icon');
        if (icon && animate) {
            icon.classList.remove('heart-beat');
            void icon.offsetWidth;
            icon.classList.add('heart-beat');
        }
    },

    decreaseHeart() {
        if (typeof NavigationHub !== 'undefined' && NavigationHub.testerMode) {
            return;
        }
        this.hearts = GamificationService.consumeHeart();
        this.lastHeartLostTime = GamificationService.lastHeartLostTime;
        this.updateHeartsUI(true);

        if (this.hearts === 0) {
            setTimeout(() => this.showNoHeartsModal(), 400);
        }
    },

    ensureToastContainer() {
        return ToastView.ensureContainer();
    },

    showToast(options = {}) {
        ToastView.show(options, arguments[1], arguments[2]);
    },

    refillHearts() {
        this.hearts = GamificationService.refillHearts();
        this.lastHeartLostTime = GamificationService.lastHeartLostTime;
        this.stopHeartCountdownTimer();
        this.updateHeartsUI(true);
        document.getElementById('no-hearts-dialog')?.classList.add('hidden');
        if (this.showToast) {
            this.showToast({
                title: 'Nạp Tim Thành Công',
                message: 'Đã hồi phục đầy 5 Tim! Bạn có thể tiếp tục học tập.',
                icon: '❤️',
                type: 'success',
                duration: 2500
            });
        }
    },

    // Hiển thị modal trạng thái tim và đếm ngược (thay thế hoàn toàn confirm/alert trình duyệt)
    showHeartStatusModal() {
        this.refreshHearts();
        const modal = document.getElementById('no-hearts-dialog');
        if (!modal) return;

        const iconEl = document.getElementById('heart-modal-icon');
        const titleEl = document.getElementById('heart-modal-title');
        const descEl = document.getElementById('heart-modal-desc');

        if (this.hearts === 0) {
            if (iconEl) iconEl.textContent = '💔';
            if (titleEl) titleEl.textContent = 'Bạn Đã Hết Tim!';
            if (descEl) descEl.textContent = 'Đừng nản lòng nhé! Tim đang tự động hồi lại sau mỗi 20 phút.';
        } else if (this.hearts < this.maxHearts) {
            if (iconEl) iconEl.textContent = '❤️';
            if (titleEl) titleEl.textContent = `Bạn Đang Còn ${this.hearts}/${this.maxHearts} Tim`;
            if (descEl) descEl.textContent = 'Cơ chế: Tự hồi 1 tim mỗi 20 phút. Bạn có thể bấm nút bên dưới để nạp đầy 5 tim ngay.';
        } else {
            this.showToast({
                title: 'Tim Đầy Đủ',
                message: 'Bạn đang có đủ 5/5 Tim, hãy tự tin luyện tập nhé!',
                icon: '❤️',
                type: 'success',
                duration: 2500
            });
            return;
        }

        modal.classList.remove('hidden');
        this.startHeartCountdownTimer();
    },

    showNoHeartsModal() {
        this.showHeartStatusModal();
    },

    startHeartCountdownTimer() {
        this.stopHeartCountdownTimer();
        const initialHearts = this.hearts;
        const updateTimer = () => {
            const prevHearts = this.hearts;
            this.refreshHearts();
            const timerEl = document.getElementById('heart-countdown-timer');
            if (timerEl) {
                const info = this.getHeartCountdownInfo();
                timerEl.textContent = info.text;
            }
            // Tự động mở khóa đóng modal khi hồi thêm ít nhất 1 tim hoặc đã đầy tim
            if (this.hearts >= this.maxHearts || (initialHearts === 0 && this.hearts > 0) || this.hearts > prevHearts) {
                this.stopHeartCountdownTimer();
                document.getElementById('no-hearts-dialog')?.classList.add('hidden');
                if (this.showToast) {
                    this.showToast({
                        title: 'Đã Hồi Tim',
                        message: 'Bạn đã có thêm Tim! Có thể tiếp tục làm bài ngay.',
                        icon: '❤️',
                        type: 'success',
                        duration: 2500
                    });
                }
            }
        };
        updateTimer();
        this.heartTimerInterval = setInterval(updateTimer, 1000);
    },

    stopHeartCountdownTimer() {
        if (this.heartTimerInterval) {
            clearInterval(this.heartTimerInterval);
            this.heartTimerInterval = null;
        }
    },

    // Kiểm tra tính hợp lệ của chuỗi Streak khi mở web
    checkStreakExpiry() {
        GamificationService.checkStreakExpiration();
        this.streak = GamificationService.streak;
    },

    recordLessonCompletionStreak() {
        const res = GamificationService.recordLessonCompletionStreak();
        this.streak = res.streak;
        this.lastCompletedDate = GamificationService.lastCompletedDate;

        if (res.action === 'first_today') {
            this.showToast({
                title: `Chuỗi Streak: 1 ngày liên tiếp! 🔥`,
                message: "Hôm nay bạn đã hoàn thành bài để giữ lửa thành công.",
                icon: "🔥",
                type: "streak",
                duration: 3500
            });
        } else if (res.action === 'increment') {
            this.showToast({
                title: `Chuỗi Streak: ${this.streak} ngày liên tiếp! 🔥`,
                message: "Hôm nay bạn đã hoàn thành bài để giữ lửa thành công.",
                icon: "🔥",
                type: "streak",
                duration: 3500
            });
        } else if (res.action === 'reset') {
            this.showToast({
                title: `Bắt đầu chuỗi Streak mới: 1 ngày! 🔥`,
                message: "Hôm nay bạn đã hoàn thành bài để giữ lửa thành công.",
                icon: "🔥",
                type: "streak",
                duration: 3500
            });
        }

        this.updateStreakUI(true);
    },

    updateStreakUI(animate = false) {
        const el = document.getElementById('stat-streak');
        if (el) el.textContent = this.streak;

        const container = document.getElementById('stat-streak-container');
        if (container) {
            container.title = `Chuỗi học tập: ${this.streak} ngày liên tiếp (Bấm để xem chi tiết)`;
        }

        if (animate && container) {
            container.classList.add('scale-110');
            setTimeout(() => container.classList.remove('scale-110'), 300);
        }
    },

    loadMode() {
        this.mode = StateModel.getPreferredMode();
        this.updateModeUI();
    },

    toggleMode() {
        this.mode = this.mode === 'parsing' ? 'typing' : 'parsing';
        StateModel.setPreferredMode(this.mode);
        this.updateModeUI();

        const ws = document.getElementById('interactive-workspace');
        if (ws && this.activeQ) {
            ws.innerHTML = '';
            if (this.mode === 'parsing') {
                this.renderParse(ws, this.activeQ);
            } else {
                this.renderTyping(ws, this.activeQ);
            }
        }

        const btn = document.getElementById('btn-submit-action');
        if (btn && !this.checked) {
            if (this.mode === 'parsing') {
                btn.disabled = this.slots.length === 0;
            } else {
                btn.disabled = !this.userTxt || !this.userTxt.trim();
            }
        }
    },

    updateModeUI() {
        const icon = document.getElementById('mode-icon');
        const label = document.getElementById('mode-label');
        const badge = document.getElementById('exercise-type-badge');
        if (this.mode === 'parsing') {
            if (icon) icon.textContent = '⌨️';
            if (label) label.textContent = 'Tự gõ';
            if (badge) badge.textContent = 'Kéo thả xếp câu';
        } else {
            if (icon) icon.textContent = '🧩';
            if (label) label.textContent = 'Xếp từ';
            if (badge) badge.textContent = 'Tự gõ bản dịch';
        }
    },

    loadSettings() {
        this.settings = StateModel.loadSettings();
        this.syncSettingsUI();
        this.applyPinyinVisibility();
    },

    saveSettings() {
        StateModel.saveSettings(this.settings);
    },

    syncSettingsUI() {
        const speedEl = document.getElementById('setting-voice-speed');
        if (speedEl) speedEl.value = String(this.settings.voiceSpeed);

        const autoAudioEl = document.getElementById('setting-auto-audio');
        if (autoAudioEl) autoAudioEl.checked = this.settings.autoAudio;

        const showPinyinEl = document.getElementById('setting-show-pinyin');
        if (showPinyinEl) showPinyinEl.checked = this.settings.showPinyin;

        const modeEl = document.getElementById('setting-default-mode');
        if (modeEl) modeEl.value = this.mode;

        const testerEl = document.getElementById('setting-tester-mode');
        if (testerEl && typeof NavigationHub !== 'undefined') {
            testerEl.checked = !!NavigationHub.testerMode;
        }
    },

    applyPinyinVisibility() {
        const pyEl = document.getElementById('anatomy-pinyin') || document.getElementById('source-pinyin-display');
        if (pyEl) {
            pyEl.style.display = this.settings.showPinyin ? '' : 'none';
        }
    },

    getLevelDbKey() {
        const level = (typeof LevelManager !== 'undefined' && LevelManager.currentLevel) ? LevelManager.currentLevel : 'hsk1';
        return level === 'hsk1' ? 'sct2_db_v2' : `sct2_db_v2_${level}`;
    },

    async loadLevelData(level = 'hsk1') {
        const discovered = await LessonModel.fetchLevelLessons(level);
        if (discovered && Object.keys(discovered).length > 0) {
            this.data = discovered;
            this.saveData();
        } else {
            this.data = {};
            this._showLoadError();
        }
        this.buildPicker();
        return discovered;
    },

    _showLoadError() {
        const overlay = document.getElementById('lesson-loading-overlay');
        if (overlay) {
            overlay.innerHTML = `
                <div class="flex flex-col items-center gap-4 p-8 text-center">
                    <div class="text-5xl">⚠️</div>
                    <div class="text-lg font-black text-slate-100">Không thể tải dữ liệu bài học</div>
                    <div class="text-sm text-slate-300">Kiểm tra kết nối mạng và thử lại.<br>Nếu vẫn lỗi, hãy tải lại trang (F5).</div>
                    <button onclick="location.reload()" class="mt-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm transition active:scale-95">
                        🔄 Thử lại
                    </button>
                </div>`;
            overlay.classList.remove('hidden');
        }
    },

    async autoDiscoverLessons() {
        const level = (typeof LevelManager !== 'undefined' && LevelManager.currentLevel) ? LevelManager.currentLevel : 'hsk1';
        return await this.loadLevelData(level);
    },

    loadData() {
        const level = (typeof LevelManager !== 'undefined' && LevelManager.currentLevel) ? LevelManager.currentLevel : 'hsk1';
        const cached = StateModel.loadCachedLessons(level);
        if (cached) {
            this.data = cached;
        } else {
            this.data = JSON.parse(JSON.stringify(window.SCT2_DATABASE || {}));
            this.saveData();
        }
    },

    saveData() {
        const level = (typeof LevelManager !== 'undefined' && LevelManager.currentLevel) ? LevelManager.currentLevel : 'hsk1';
        StateModel.saveCachedLessons(level, this.data);
    },

    buildPicker() {
        const sel = document.getElementById('lesson-picker');
        if (!sel) return;
        sel.innerHTML = '';

        const manifest = window.LESSON_MANIFEST || [];
        const manifestKeys = new Set(manifest.map(m => m.id));

        // Nạp danh mục từ LESSON_MANIFEST
        manifest.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.title;
            if (m.id === this.curLesson) opt.selected = true;
            sel.appendChild(opt);
        });

        // Nạp thêm các bài tự tạo trong LocalStorage (nếu có)
        Object.keys(this.data).forEach(k => {
            if (!manifestKeys.has(k)) {
                const opt = document.createElement('option');
                opt.value = k;
                opt.textContent = this.data[k].title || k;
                if (k === this.curLesson) opt.selected = true;
                sel.appendChild(opt);
            }
        });

        sel.onchange = (e) => this.start(e.target.value);
    },

    async loadLessonData(item) {
        return await LessonModel.fetchLesson(item);
    },

    async start(k) {
        const loader = document.getElementById('lesson-loading-overlay');
        if (loader) loader.classList.remove('hidden');

        try {
            this.curLesson = k;

            // Đồng bộ tiêu đề bài học trên Header và Lesson Picker
            const manifest = window.LESSON_MANIFEST || [];
            const item = manifest.find(m => m.id === k);
            const curTitle = this.data[k]?.title || (item ? item.title : k);
            const titleEl = document.getElementById('header-lesson-title');
            if (titleEl) titleEl.textContent = curTitle;
            const picker = document.getElementById('lesson-picker');
            if (picker) picker.value = k;

            // Tự động tải từ data/baiX.json nếu có trong manifest
            if (item && item.file) {
                const fetched = await this.loadLessonData(item);
                if (fetched && fetched.lessons && fetched.lessons.length > 0) {
                    this.data[k] = fetched;
                    this.saveData();
                    if (titleEl && fetched.title) titleEl.textContent = fetched.title;
                }
            }

            this.queue = this.data[k]?.lessons ? [...this.data[k].lessons] : [];
            this.total = this.queue.length;
            this.firstTryCorrect = 0;
            this.attemptedQuestions = {};
            this.nextQ();

            // Tự động mở popup tóm tắt trọng tâm (Briefing bài học) trước khi vào bài nếu bài học có quickNotes
            const currentQuickNotes = this.data[k]?.quickNotes || null;
            if (currentQuickNotes) {
                this.openLessonBriefingModal(true);
            }
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    },

    shuffleTiles(tiles, targetOrder = []) {
        if (!Array.isArray(tiles) || tiles.length <= 1) return tiles ? [...tiles] : [];
        const arr = [...tiles];

        // Thuật toán Fisher-Yates xáo trộn ngẫu nhiên toàn diện
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }

        // Đảm bảo thứ tự hiển thị KHÔNG bị vô tình trùng 100% với đáp án đúng targetOrder
        if (targetOrder && targetOrder.length > 1) {
            const isIdentical = () => {
                const targetIdsInArr = arr.map(t => t.id).filter(id => targetOrder.includes(id));
                if (targetIdsInArr.length !== targetOrder.length) return false;
                return targetIdsInArr.every((id, idx) => id === targetOrder[idx]);
            };

            let tries = 0;
            while (isIdentical() && tries < 10) {
                const idx1 = Math.floor(Math.random() * arr.length);
                const idx2 = (idx1 + 1 + Math.floor(Math.random() * (arr.length - 1))) % arr.length;
                [arr[idx1], arr[idx2]] = [arr[idx2], arr[idx1]];
                tries++;
            }
        }

        return arr;
    },

    nextQ() {
        this.refreshHearts();
        const isTester = (typeof NavigationHub !== 'undefined') && NavigationHub.testerMode;
        if (this.hearts <= 0 && !isTester) {
            this.showNoHeartsModal();
            return;
        }

        if (this.queue.length === 0) return this.showVictory();
        this.activeQ = this.queue[0];
        this.slots = [];
        this.userTxt = '';
        this.checked = false;

        // Xáo trộn ngẫu nhiên các khối từ hiển thị (đảm bảo không bao giờ trùng thứ tự đáp án chuẩn)
        this.activeQ.displayTiles = this.shuffleTiles(this.activeQ.tiles || [], this.activeQ.targetOrder || []);

        this.render();
    },

    toggleAnatomy(forceOpen = null) {
        ModalView.toggleAnatomy(forceOpen);
    },

    resetAnatomyCard() {
        ModalView.resetAnatomyCard();
    },

    updateProgressBar() {
        if (this.total === 0) return;
        const done = Math.max(0, this.total - this.queue.length);
        const retryCount = this.queue.filter(item => item && item.id && this.attemptedQuestions[item.id]).length;
        const donePct = (done / this.total) * 100;
        const retryPct = (retryCount / this.total) * 100;
        const theme = (typeof LevelManager !== 'undefined' && LevelManager.getTheme) ? LevelManager.getTheme() : null;

        const pBar = document.getElementById('session-progress-bar');
        if (pBar) {
            pBar.style.width = `${donePct}%`;
            if (theme) pBar.className = `${theme.progressBarClass} h-full transition-all duration-300 ease-out`;
        }
        const rBar = document.getElementById('session-progress-retry');
        if (rBar) {
            rBar.style.width = `${retryPct}%`;
        }

        const textEl = document.getElementById('session-progress-text');
        if (textEl) {
            if (retryCount > 0) {
                textEl.innerHTML = `<span class="text-emerald-600 dark:text-emerald-400 font-black">${done}</span>/${this.total} <span class="text-amber-500 font-bold" title="${retryCount} câu trong hàng chờ làm lại">(+${retryCount} ⏳)</span>`;
            } else {
                textEl.textContent = `${done}/${this.total}`;
            }
        }
    },

    render() {
        if (this.total === 0) return;
        this.updateProgressBar();
        const theme = (typeof LevelManager !== 'undefined' && LevelManager.getTheme) ? LevelManager.getTheme() : null;
        document.getElementById('victory-card').classList.add('hidden');
        document.getElementById('practice-card').classList.remove('hidden');
        document.getElementById('bottom-action-drawer')?.classList.remove('hidden');
        document.getElementById('evaluation-banner').classList.add('hidden');
        document.getElementById('standard-answer-box')?.classList.add('hidden');

        const btn = document.getElementById('btn-submit-action');
        btn.textContent = "KIỂM TRA DỊCH";
        btn.disabled = true;
        const submitColor = theme ? theme.cardActiveBtn : "bg-emerald-600 hover:bg-emerald-700 text-white";
        btn.className = `min-w-[180px] py-3.5 px-6 ${submitColor} font-black rounded-xl text-sm shadow-md btn-press tracking-wide disabled:opacity-40 disabled:cursor-not-allowed`;
        document.getElementById('btn-pass-action').classList.remove('hidden');

        const q = this.activeQ;
        this.updateModeUI();

        // Đóng mặc định khối gợi ý bóc tách để học sinh tự động não
        this.resetAnatomyCard();

        // Render trực tiếp và đồng bộ để loại bỏ hoàn toàn hiện tượng nhấp nháy/thu giãn layout
        const promptInstruction = document.getElementById('prompt-instruction');
        if (promptInstruction) promptInstruction.textContent = q.title || "Luyện dịch câu sau:";
        const sourceVi = document.getElementById('source-vi-text');
        if (sourceVi) sourceVi.textContent = q.vi || "";
        const sourcePinyin = document.getElementById('anatomy-pinyin') || document.getElementById('source-pinyin-display');
        if (sourcePinyin) sourcePinyin.textContent = q.pinyin ? `🗣️ ${q.pinyin}` : "";
        this.applyPinyinVisibility();
        const sourceGrammar = document.getElementById('anatomy-grammar') || document.getElementById('source-core-grammar');
        if (sourceGrammar) sourceGrammar.textContent = q.grammarPoint ? `Ngữ pháp: ${q.grammarPoint}` : "";

        // Reset trạng thái bẫy realtime và hiển thị nút mẹo nếu có
        document.getElementById('realtime-trap-alert')?.classList.add('hidden');
        this.renderQuickNotesButton();

        // Render chips từ vựng
        const chips = document.getElementById('anatomy-tokens-container') || document.getElementById('source-chips-container');
        if (chips) {
            chips.innerHTML = '';
            (q.tokens || []).forEach(t => {
                const b = document.createElement('button');
                b.className = "clickable-chip px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold transition active:scale-95 shadow-xs";
                b.innerHTML = `${t.text} <span class="text-xs text-emerald-500 font-bold">ℹ️</span>`;
                b.onclick = (e) => {
                    e.stopPropagation();
                    AudioSvc.speak(t.hz || t.text, 0.85);
                    this.showHint(t);
                };
                chips.appendChild(b);
            });
        }

        // Gắn sự kiện nút đóng/mở khối gợi ý bóc tách (hỗ trợ cả header accordion lẫn nút toggle con nếu có)
        const toggleAnatomyBtn = document.getElementById('anatomy-toggle-btn') || document.getElementById('btn-toggle-anatomy');
        if (toggleAnatomyBtn) {
            toggleAnatomyBtn.onclick = (e) => {
                // Tránh bắt sự kiện nếu người dùng bấm vào nút âm thanh 🔊/🐢 hoặc feedback
                if (e.target.closest('button')) return;
                this.toggleAnatomy();
            };
        }

        // Render workspace trực tiếp (Xếp từ hoặc Tự gõ)
        const ws = document.getElementById('interactive-workspace');
        if (ws) {
            ws.innerHTML = '';
            if (this.mode === 'parsing') {
                this.renderParse(ws, q);
            } else {
                this.renderTyping(ws, q);
            }
        }
    },

    renderParse(ws, q) {
        const slot = document.createElement('div');
        slot.id = 'p-slot';
        slot.className = "min-h-[76px] sm:min-h-[84px] p-2.5 sm:p-3 rounded-2xl border-2 border-dashed border-emerald-400/80 dark:border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-wrap items-center gap-2 sm:gap-2.5 mb-2.5 sm:mb-3";

        const tip = document.createElement('span');
        tip.id = 'p-tip';
        tip.className = "text-sm sm:text-base text-slate-400 dark:text-slate-500 italic font-medium select-none";
        tip.textContent = "Chạm các khối từ vựng bên dưới để ghép câu...";
        slot.appendChild(tip);

        const pool = document.createElement('div');
        pool.id = 'p-pool';
        pool.className = "flex flex-wrap gap-2 sm:gap-2.5 justify-center min-h-[60px]";

        const tilesToRender = q.displayTiles || (q.displayTiles = this.shuffleTiles(q.tiles || [], q.targetOrder || []));

        tilesToRender.forEach(t => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = "btn-press px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-base shadow-xs active:scale-95 transition-transform flex items-center justify-center cursor-pointer";
            b.innerHTML = `<span class="chinese-text text-lg sm:text-xl font-bold leading-tight select-none">${t.text}</span>`;
            b.dataset.id = t.id;
            b.onclick = () => {
                if (this.checked) return;
                AudioSvc.play('click');
                this.toggleSlot(t.id, q);
            };
            pool.appendChild(b);
        });

        ws.appendChild(slot);
        ws.appendChild(pool);
    },

    toggleSlot(id, q) {
        const isSel = this.slots.includes(id);
        if (isSel) {
            this.slots = this.slots.filter(x => x !== id);
            document.getElementById('p-slot').querySelector(`[data-pid="${id}"]`)?.remove();
            document.getElementById('p-pool').querySelector(`[data-id="${id}"]`)?.classList.remove('opacity-20', 'pointer-events-none');
        } else {
            this.slots.push(id);
            document.getElementById('p-pool').querySelector(`[data-id="${id}"]`)?.classList.add('opacity-20', 'pointer-events-none');
            const t = q.tiles.find(x => x.id === id);
            const b = document.createElement('button');
            b.type = 'button';
            b.className = "px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-500 dark:border-emerald-400 text-slate-800 dark:text-slate-100 text-base shadow-xs flex items-center justify-center active:scale-95 transition-transform cursor-pointer";
            b.innerHTML = `<span class="chinese-text text-lg sm:text-xl font-bold leading-tight select-none">${t.text}</span>`;
            b.dataset.pid = id;
            b.onclick = () => {
                if (!this.checked) {
                    AudioSvc.play('click');
                    this.toggleSlot(id, q);
                }
            };
            document.getElementById('p-slot').appendChild(b);
        }

        document.getElementById('p-tip').style.display = this.slots.length ? 'none' : 'inline-block';
        document.getElementById('btn-submit-action').disabled = this.slots.length === 0;
    },

    renderTyping(ws, q) {
        const container = document.createElement('div');
        container.className = "w-full flex flex-col space-y-2 mb-3";

        // Thanh công cụ trên ô gõ
        const toolbar = document.createElement('div');
        toolbar.className = "flex items-center justify-between text-xs text-slate-400 px-1";

        const label = document.createElement('span');
        label.className = "font-bold text-[11px] text-slate-500 dark:text-slate-400";
        label.textContent = "Nhập chữ Hán (bàn phím hoặc bấm từ gợi ý):";
        toolbar.appendChild(label);

        const actions = document.createElement('div');
        actions.className = "flex items-center gap-2";

        const btnBackspace = document.createElement('button');
        btnBackspace.className = "px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition text-xs";
        btnBackspace.textContent = "⌫ Xóa từ";
        btnBackspace.onclick = () => {
            const ta = document.getElementById('typing-input-area');
            if (ta && ta.value.length > 0) {
                ta.value = ta.value.slice(0, -1);
                this.userTxt = ta.value.trim();
                document.getElementById('btn-submit-action').disabled = !this.userTxt;
                ta.focus();
            }
        };

        const btnClear = document.createElement('button');
        btnClear.className = "px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-600 hover:text-rose-600 dark:text-slate-300 font-bold transition text-xs";
        btnClear.textContent = "🗑️ Xóa hết";
        btnClear.onclick = () => {
            const ta = document.getElementById('typing-input-area');
            if (ta) {
                ta.value = '';
                this.userTxt = '';
                document.getElementById('btn-submit-action').disabled = true;
                ta.focus();
            }
        };

        actions.appendChild(btnBackspace);
        actions.appendChild(btnClear);
        toolbar.appendChild(actions);
        container.appendChild(toolbar);

        // Ô textarea nhập liệu chính
        const ta = document.createElement('textarea');
        ta.id = 'typing-input-area';
        ta.rows = 2;
        ta.className = "w-full p-3.5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xl chinese-text resize-none focus:outline-none focus:border-emerald-500 shadow-xs";
        ta.placeholder = "Gõ phiên âm Pinyin hoặc chạm vào các từ bên dưới...";
        ta.value = this.userTxt;
        ta.spellcheck = false;

        const updateTyping = () => {
            this.userTxt = ta.value.trim();
            document.getElementById('btn-submit-action').disabled = !this.userTxt;
        };

        ta.oninput = updateTyping;
        ta.onchange = updateTyping;
        ta.addEventListener('compositionend', updateTyping);
        ta.addEventListener('keyup', updateTyping);
        ta.addEventListener('paste', () => setTimeout(updateTyping, 20));

        container.appendChild(ta);

        // Danh sách từ gợi ý nhanh
        const poolContainer = document.createElement('div');
        poolContainer.className = "space-y-1.5 pt-1";

        const poolLabel = document.createElement('span');
        poolLabel.className = "text-[11px] font-bold text-slate-400 block";
        poolLabel.textContent = "Chạm từ để chèn vào vị trí đang gõ:";
        poolContainer.appendChild(poolLabel);

        const pool = document.createElement('div');
        pool.className = "flex flex-wrap gap-2";

        const tilesToUse = q.displayTiles || (q.displayTiles = this.shuffleTiles(q.tiles || [], q.targetOrder || []));
        const words = tilesToUse.map(t => t.text).filter(Boolean);
        words.forEach(w => {
            const b = document.createElement('button');
            b.className = "btn-press px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 chinese-text text-base font-bold shadow-xs hover:border-emerald-400 active:scale-95";
            b.textContent = w;
            b.onclick = () => {
                if (this.checked) return;
                AudioSvc.speak(w, 0.98);

                // Chèn từ vào vị trí con trỏ hiện tại của textarea
                const startPos = ta.selectionStart || ta.value.length;
                const endPos = ta.selectionEnd || ta.value.length;
                ta.value = ta.value.substring(0, startPos) + w + ta.value.substring(endPos);
                ta.selectionStart = ta.selectionEnd = startPos + w.length;

                this.userTxt = ta.value.trim();
                document.getElementById('btn-submit-action').disabled = !this.userTxt;
                ta.focus();
            };
            pool.appendChild(b);
        });

        poolContainer.appendChild(pool);
        container.appendChild(poolContainer);
        ws.appendChild(container);
        setTimeout(() => ta.focus(), 60);
    },

    validate() {
        if (this.checked) return this.nextQ();
        if (this.isValidating) return;

        const q = this.activeQ;
        if (!q) return;

        let userString = '';
        if (this.mode === 'parsing') {
            userString = this.slots.map(id => {
                const t = (q.tiles || []).find(x => x.id === id);
                return t ? t.text : '';
            }).join('');
        } else {
            const ta = document.getElementById('typing-input-area');
            if (ta) this.userTxt = ta.value.trim();
            userString = this.userTxt;
        }

        if (!userString || !userString.trim()) return;

        // Micro-loading state (180ms) tạo cảm giác AI đang phân tích cú pháp chuyên nghiệp
        this.isValidating = true;
        const btnSubmit = document.getElementById('btn-submit-action');
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `
                <span class="inline-flex items-center justify-center gap-2">
                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>ĐANG CHẤM ĐIỂM...</span>
                </span>
            `;
        }

        setTimeout(() => {
            this.executeValidation(userString, q);
            this.isValidating = false;
        }, 180);
    },

    executeValidation(userString, q) {
        // Đánh giá đáp án bằng cơ chế Dynamic Contextual Trap Detection
        const evalResult = typeof evaluateAnswer === 'function'
            ? evaluateAnswer(userString, q)
            : EvalSys.evaluateAnswer(userString, q);

        const pass = evalResult.pass;
        let fb = evalResult.msg;
        const title = evalResult.title;

        // Ghi nhận lần đầu trả lời câu này để tính % độ chính xác (Accuracy & Stars)
        const qid = q.id || `q-${this.queue.length}`;
        const isFirstTry = !this.attemptedQuestions[qid];
        this.attemptedQuestions[qid] = true;

        // Luôn ẩn cảnh báo trap realtime ở trên để tránh lỗi hiển thị 2 lần giải thích
        document.getElementById('realtime-trap-alert')?.classList.add('hidden');
        const slot = document.getElementById('p-slot');
        if (slot) slot.classList.remove('border-amber-400', 'bg-amber-50/50');

        if (pass) {
            if (isFirstTry) {
                this.firstTryCorrect++;
            }
            AudioSvc.play('ding');
            if (this.settings.autoAudio) {
                setTimeout(() => {
                    if (typeof AudioManager !== 'undefined') {
                        AudioManager.playSentence(q, this.settings.voiceSpeed);
                    } else {
                        AudioSvc.speak(q.standardTrans || q.zh, this.settings.voiceSpeed);
                    }
                }, 300);
            }

            // Highlight tất cả các thẻ đã ghép thành công với viền xanh lá chuẩn xác
            if (this.mode === 'parsing') {
                const slotEl = document.getElementById('p-slot');
                if (slotEl) {
                    slotEl.querySelectorAll('button[data-pid]').forEach(btn => {
                        btn.className = "px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-200 text-base shadow-xs flex items-center justify-center";
                    });
                }
            }

            this.queue.shift();
            this.showBanner(true, title, fb);
        } else {
            AudioSvc.play('buzz');
            this.decreaseHeart(); // Trừ 1 tim khi trả lời sai
            this.queue.push(this.queue.shift());

            // DIFF HIGHLIGHT: So khớp vị trí từng thẻ ghép
            if (this.mode === 'parsing') {
                const targetOrder = q.targetOrder || [];
                const slotEl = document.getElementById('p-slot');
                if (slotEl) {
                    this.slots.forEach((slotId, idx) => {
                        const btn = slotEl.querySelector(`[data-pid="${slotId}"]`);
                        if (!btn) return;
                        const isCorrectPos = (slotId === targetOrder[idx]);
                        if (isCorrectPos) {
                            btn.className = "px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-400 text-emerald-800 dark:text-emerald-200 text-base shadow-2xs flex items-center justify-center";
                        } else {
                            btn.className = "px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-800 dark:text-rose-200 text-base shadow-xs flex items-center justify-center animate-pulse";
                        }
                    });
                }
            }

            // Nếu bắt trúng bẫy cú pháp, định dạng cụm bẫy gọn gàng vào duy nhất banner ở dưới
            if (evalResult.trapPattern) {
                fb = `<div class="font-bold text-rose-800 dark:text-rose-200 mb-1 flex items-center gap-1.5 flex-wrap"><span>Phát hiện bẫy:</span><span class="chinese-text font-black px-2 py-0.5 rounded bg-rose-200/90 text-rose-900 dark:bg-rose-900/80 dark:text-rose-200 border border-rose-300 dark:border-rose-700">${evalResult.trapPattern}</span></div><div>${fb}</div>`;
            }
            this.showBanner(false, title, fb);
        }

        // Cập nhật thanh tiến độ phân đoạn trực quan
        this.updateProgressBar();

        this.checked = true;

        // Ẩn nút Bỏ qua
        document.getElementById('btn-pass-action').classList.add('hidden');

        // Chuyển nút bấm chính sang trạng thái TIẾP TỤC
        const theme = (typeof LevelManager !== 'undefined' && LevelManager.getTheme) ? LevelManager.getTheme() : null;
        const btnSubmit = document.getElementById('btn-submit-action');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = "TIẾP TỤC (Enter)";
            const continueColor = pass 
                ? (theme ? theme.cardActiveBtn : "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950") 
                : "bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 text-white dark:text-slate-950";
            btnSubmit.className = `min-w-[180px] py-3.5 px-6 ${continueColor} font-black rounded-xl text-sm shadow-md btn-press tracking-wide`;
        }

        // Yêu cầu người dùng: loại bỏ đáp án chuẩn
        const stdBox = document.getElementById('standard-answer-box');
        if (stdBox) stdBox.classList.add('hidden');
    },

    showBanner(good, title, body) {
        const b = document.getElementById('evaluation-banner');
        b.classList.remove('hidden');

        // Phân biệt màu sắc Đúng (Xanh) - Sai (Đỏ) và tương phản cao trên Dark Mode
        b.className = "rounded-2xl p-4 border text-sm leading-relaxed " +
            (good
                ? "bg-emerald-100 border-emerald-300 text-emerald-950 dark:bg-emerald-950/80 dark:border-emerald-700 dark:text-emerald-100"
                : "bg-rose-100 border-rose-300 text-rose-950 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-100");

        const iconEl = document.getElementById('eval-icon');
        iconEl.textContent = good ? "🎉" : "⚠️";

        const titleEl = document.getElementById('eval-status-title');
        titleEl.textContent = title;
        titleEl.className = "font-black text-base sm:text-lg " +
            (good ? "text-emerald-900 dark:text-emerald-200" : "text-rose-900 dark:text-rose-200");

        const badgeEl = document.getElementById('eval-score-badge');
        badgeEl.textContent = good ? "ĐẠT YÊU CẦU" : "CHƯA ĐẠT";
        badgeEl.className = "text-xs sm:text-sm font-black px-3 py-0.5 rounded-full " +
            (good
                ? "bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                : "bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200");

        const bodyEl = document.getElementById('eval-message-body');
        bodyEl.innerHTML = body;
        bodyEl.className = "mt-2 text-sm sm:text-base font-medium space-y-1.5 text-slate-800 dark:text-slate-100";
    },

    showVictory() {
        document.getElementById('practice-card').classList.add('hidden');
        document.getElementById('bottom-action-drawer').classList.add('hidden');
        document.getElementById('victory-card').classList.remove('hidden');

        // Tính toán tỷ lệ chính xác và số sao thực tế (Star Rating: >=80% = 3 sao, >=50% = 2 sao, <50% = 1 sao)
        const totalQ = this.total || 1;
        const accuracy = Math.round((this.firstTryCorrect / totalQ) * 100);
        let stars = 1;
        if (accuracy >= 80) {
            stars = 3;
        } else if (accuracy >= 50) {
            stars = 2;
        }

        const victoryStarsEl = document.getElementById('victory-stars');
        if (victoryStarsEl) {
            const filledBig = `<svg class="w-8 h-8 sm:w-10 sm:h-10 fill-amber-400 text-amber-400 inline-block drop-shadow-md animate-bounce" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
            const emptyBig = `<svg class="w-8 h-8 sm:w-10 sm:h-10 fill-slate-300 dark:fill-slate-700 text-slate-300 dark:text-slate-700 inline-block opacity-35" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
            let vHtml = '<div class="inline-flex items-center gap-2">';
            for (let i = 0; i < 3; i++) {
                vHtml += (i < stars) ? filledBig : emptyBig;
            }
            vHtml += '</div>';
            victoryStarsEl.innerHTML = vHtml;
        }

        const badgeEl = document.getElementById('victory-accuracy-badge');
        if (badgeEl) {
            badgeEl.textContent = `Độ chính xác: ${accuracy}% (${stars} Sao)`;
        }

        // Ghi nhận hoàn thành và mở khóa bài tiếp theo qua NavigationHub
        if (typeof NavigationHub !== 'undefined') {
            NavigationHub.markCompleted(this.curLesson, totalQ, stars, accuracy);
        }

        // Ghi nhận chuỗi Streak chuẩn lịch Việt Nam
        this.recordLessonCompletionStreak();

        const theme = (typeof LevelManager !== 'undefined' && LevelManager.getTheme) ? LevelManager.getTheme() : null;
        const advBtn = document.getElementById('btn-advance-lesson');
        if (advBtn && theme) {
            advBtn.className = `px-6 py-3.5 ${theme.cardActiveBtn} font-black rounded-xl transition text-sm shadow-soft btn-press`;
        }
    },

    // ===== SCT2 VOCAB INSPECTOR (Flexbox Centered & Focus Mode) =====
    openVocabInspector(token) {
        ModalView.openVocabInspector(token, this.activeQ);
        this.activeInspectorWord = token ? (token.hz || token.text || '') : '';
    },

    closeVocabInspector() {
        ModalView.closeVocabInspector();
    },

    showHint(token) {
        this.openVocabInspector(token);
    },

    closeHint() {
        this.closeVocabInspector();
    },

    renderQuickNotesButton() {
        // Nút Mẹo câu (bên trong): luôn hiển thị khi đang làm câu hỏi
        const btnQHint = document.getElementById('btn-quick-notes');
        if (btnQHint) {
            btnQHint.classList.remove('hidden');
            btnQHint.style.display = 'inline-flex';
        }

        // Nút Tóm tắt bài (bên ngoài): hiển thị nếu bài học có quickNotes
        const btnLessonNotes = document.getElementById('btn-lesson-notes');
        if (btnLessonNotes) {
            const curLessonData = this.data[this.curLesson] || {};
            if (curLessonData.quickNotes) {
                btnLessonNotes.classList.remove('hidden');
                btnLessonNotes.style.display = 'inline-flex';
            } else {
                btnLessonNotes.classList.add('hidden');
                btnLessonNotes.style.display = 'none';
            }
        }
    },

    toggleQuickNotes(show) {
        const dialog = document.getElementById('quick-notes-dialog') || document.getElementById('quick-notes-modal');
        if (!dialog) return;
        if (show) {
            dialog.classList.remove('hidden');
            dialog.style.display = 'flex';
        } else {
            dialog.classList.add('hidden');
            dialog.style.display = 'none';
        }
    },

    // 1. Tóm tắt trọng tâm bài học (cái bên ngoài - Briefing bài học)
    openLessonBriefingModal(isPreLesson = false) {
        const curLessonData = this.data[this.curLesson] || {};
        const notes = curLessonData.quickNotes;
        if (!notes) return;

        this.renderQuickNotesUI(notes, curLessonData);
        ModalView.openLessonBriefing(curLessonData, isPreLesson);
    },

    closeLessonBriefingModal() {
        ModalView.closeLessonBriefing();
    },

    // 2. Mẹo & phân tích câu hỏi đang luyện (cái bên trong - Question Hint)
    openQuestionHintModal() {
        ModalView.openQuestionHint(this.activeQ);
    },

    closeQuestionHintModal() {
        ModalView.closeQuestionHint();
    },

    openQuickNotesModal() {
        // Alias tương thích ngược
        this.openQuestionHintModal();
    },

    closeQuickNotesModal() {
        this.closeQuestionHintModal();
    },

    renderQuickNotesUI(notes, curLessonData = null) {
        const body = document.getElementById('quick-notes-body') || document.getElementById('qn-content');
        if (!body) return;
        body.innerHTML = '';

        const lessonData = curLessonData || (this.data[this.curLesson] || {});
        const subtitle = document.getElementById('quick-notes-subtitle');
        if (subtitle) {
            subtitle.textContent = lessonData.title || `Bài học: ${this.curLesson}`;
        }

        // 1. Phân mục Từ vựng bổ sung (vocabTips) theo chuẩn Briefing
        if (notes && typeof notes === 'object' && Array.isArray(notes.vocabTips) && notes.vocabTips.length > 0) {
            const block = document.createElement('div');
            block.className = "p-4 sm:p-5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-2.5";
            const vocabHtml = notes.vocabTips.map(v => 
                `<li class="leading-relaxed py-1 text-sm sm:text-base border-b border-amber-100 dark:border-amber-900/40 last:border-0">
                    <b class="chinese-text text-base sm:text-lg font-bold text-slate-900 dark:text-white mr-1.5">${v.word}</b> 
                    <span class="text-emerald-600 dark:text-emerald-400 font-mono text-xs sm:text-sm font-bold">(${v.py})</span>: 
                    <span class="text-slate-800 dark:text-slate-200 font-medium">${v.note}</span>
                </li>`
            ).join('');
            block.innerHTML = `
                <div class="font-black text-amber-900 dark:text-amber-300 text-sm sm:text-base flex items-center gap-2">
                    <span>📚</span> Từ vựng bổ sung:
                </div>
                <ul class="space-y-1 text-slate-700 dark:text-slate-300">${vocabHtml}</ul>
            `;
            body.appendChild(block);
        }

        // 2. Phân mục Lưu ý ngữ pháp & bẫy cú pháp (grammarTips) theo chuẩn Briefing
        if (notes && typeof notes === 'object' && Array.isArray(notes.grammarTips) && notes.grammarTips.length > 0) {
            const block = document.createElement('div');
            block.className = "p-4 sm:p-5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2.5";
            const grammarHtml = notes.grammarTips.map(g => 
                `<li class="leading-relaxed py-1 text-sm sm:text-base text-slate-800 dark:text-slate-200 font-medium">${g}</li>`
            ).join('');
            block.innerHTML = `
                <div class="font-black text-emerald-900 dark:text-emerald-300 text-sm sm:text-base flex items-center gap-2">
                    <span>⚠️</span> Lưu ý ngữ pháp:
                </div>
                <ul class="list-disc list-inside space-y-1.5 text-slate-700 dark:text-slate-300 leading-relaxed">${grammarHtml}</ul>
            `;
            body.appendChild(block);
        }

        // 3. Fallback linh hoạt cho các bài dạng cũ (grammarPoint / explanation)
        if (!notes.vocabTips && !notes.grammarTips) {
            const q = this.activeQ;
            if (q && q.grammarPoint) {
                const block = document.createElement('div');
                block.className = "p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-1.5";
                block.innerHTML = `
                    <div class="font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-sm sm:text-base">
                        <span>📌</span> CẤU TRÚC NGỮ PHÁP
                    </div>
                    <div class="text-slate-800 dark:text-slate-200 font-semibold text-sm sm:text-base leading-relaxed">${q.grammarPoint}</div>
                `;
                body.appendChild(block);
            }
            if (typeof notes === 'string') {
                const block = document.createElement('div');
                block.className = "p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80";
                block.innerHTML = `<p class="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed font-medium">${notes}</p>`;
                body.appendChild(block);
            } else if (Array.isArray(notes)) {
                const block = document.createElement('div');
                block.className = "p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-2";
                const ul = document.createElement('ul');
                ul.className = "list-disc list-inside space-y-1.5 text-slate-800 dark:text-slate-200 text-sm sm:text-base font-medium";
                notes.forEach(item => {
                    const li = document.createElement('li');
                    li.className = "py-0.5 leading-relaxed";
                    li.textContent = typeof item === 'string' ? item : JSON.stringify(item);
                    ul.appendChild(li);
                });
                block.appendChild(ul);
                body.appendChild(block);
            }
        }
    },

    evaluateTraps(q, currentText) {
        const alertEl = document.getElementById('realtime-trap-alert');
        if (!alertEl || !q) return false;

        if (!currentText || !currentText.trim()) {
            alertEl.classList.add('hidden');
            const slot = document.getElementById('p-slot');
            if (slot) slot.classList.remove('border-amber-400', 'bg-amber-50/50');
            return false;
        }

        const cleanText = currentText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'，。？！、\s]/g, '');

        // 1. Bẫy cú pháp dạng hạt nhân mới: traps: [ { pattern, msg } ]
        if (q.traps && Array.isArray(q.traps)) {
            for (const trap of q.traps) {
                const cleanPattern = (trap.pattern || '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'，。？！、\s]/g, '');
                if (cleanPattern && cleanText.includes(cleanPattern)) {
                    this.showTrapAlert(trap.pattern, trap.msg);
                    return true;
                }
            }
        }

        // 2. Bẫy dịch thô dạng cũ
        if (q.trapDetect && Array.isArray(q.trapDetect)) {
            for (const pattern of q.trapDetect) {
                const cleanPattern = (pattern || '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'，。？！、\s]/g, '');
                if (cleanPattern && cleanText.includes(cleanPattern)) {
                    this.showTrapAlert(pattern, q.trapMsg || q.explanation || "Lỗi dịch thô ngữ tự!");
                    return true;
                }
            }
        }

        alertEl.classList.add('hidden');
        const slot = document.getElementById('p-slot');
        if (slot) slot.classList.remove('border-amber-400', 'bg-amber-50/50');
        return false;
    },

    showTrapAlert(pattern, msg) {
        const alertEl = document.getElementById('realtime-trap-alert');
        if (!alertEl) return;

        const badge = document.getElementById('trap-pattern-badge');
        if (badge) badge.textContent = pattern;

        const content = document.getElementById('trap-msg-content');
        if (content) content.textContent = msg;

        alertEl.classList.remove('hidden');

        const slot = document.getElementById('p-slot');
        if (slot) {
            slot.classList.add('border-amber-400', 'bg-amber-50/50');
        }
    },

    bindUI() {
        // Nút kiểm tra / tiếp tục
        document.getElementById('btn-submit-action').onclick = () => this.checked ? this.nextQ() : this.validate();

        // Nút bỏ qua
        document.getElementById('btn-pass-action').onclick = () => {
            if (this.activeQ) {
                const qid = this.activeQ.id || `q-${this.queue.length}`;
                this.attemptedQuestions[qid] = true;
            }
            AudioSvc.play('buzz');
            this.decreaseHeart(); // Trừ 1 tim khi bỏ qua
            this.queue.push(this.queue.shift());
            this.checked = true;

            // Ẩn nút Bỏ qua
            document.getElementById('btn-pass-action').classList.add('hidden');

            // Bật nút TIẾP TỤC và chuyển sang tone màu đỏ cảnh báo
            const btnSubmit = document.getElementById('btn-submit-action');
            btnSubmit.disabled = false;
            btnSubmit.textContent = "TIẾP TỤC (Enter)";
            btnSubmit.className = "min-w-[180px] py-3.5 px-6 bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 text-white dark:text-slate-950 font-black rounded-xl text-sm shadow-md btn-press tracking-wide cursor-pointer";

            // Hiển thị banner Chưa Đạt / Đã Bỏ Qua (không hiện đáp án chuẩn)
            this.showBanner(false, "Cần chú ý / Đã bỏ qua câu này", "Đã xếp câu này xuống cuối hàng chờ để bạn luyện tập lại sau.");

            // Cập nhật thanh tiến độ phân đoạn trực quan
            this.updateProgressBar();

            const stdBox = document.getElementById('standard-answer-box');
            if (stdBox) stdBox.classList.add('hidden');
        };

        // Nút chuyển đổi chế độ Tự gõ / Xếp từ
        const toggleModeBtn = document.getElementById('btn-toggle-mode');
        if (toggleModeBtn) {
            toggleModeBtn.onclick = () => this.toggleMode();
        }

        // Mở popup chọn bài học nhanh trên Header
        const openLessonModalBtn = document.getElementById('btn-open-lesson-modal');
        if (openLessonModalBtn) {
            openLessonModalBtn.onclick = () => {
                if (typeof NavigationHub !== 'undefined') {
                    NavigationHub.openModal();
                }
            };
        }

        // Nạp và hồi phục tim
        const refillBtn = document.getElementById('btn-refill-hearts');
        if (refillBtn) {
            refillBtn.onclick = () => this.refillHearts();
        }

        // Nút học tiếp ở chế độ Dev khi hết tim
        const practiceDevBtn = document.getElementById('btn-practice-dev-mode');
        if (practiceDevBtn) {
            practiceDevBtn.onclick = () => {
                if (typeof NavigationHub !== 'undefined') {
                    NavigationHub.testerMode = true;
                    try { localStorage.setItem('sct2_dev_mode', '1'); } catch (e) {}
                    NavigationHub.updateDevUI();
                    NavigationHub.renderDashboardCards();
                }
                document.getElementById('no-hearts-dialog')?.classList.add('hidden');
                this.stopHeartCountdownTimer();
                if (this.showToast) this.showToast('🛠️ Đã bật Chế độ Dev – Tiếp tục làm bài không trừ tim', 'success');
            };
        }

        const heartContainer = document.getElementById('heart-container');
        if (heartContainer) {
            heartContainer.onclick = () => {
                this.showHeartStatusModal();
            };
        }

        // Bấm vào Streak xem chi tiết
        const streakContainer = document.getElementById('stat-streak-container');
        if (streakContainer) {
            streakContainer.onclick = () => {
                const today = this.getLocalDateString();
                const learnedToday = this.lastCompletedDate === today;
                if (learnedToday) {
                    this.showToast({
                        title: `Chuỗi Streak: ${this.streak} ngày liên tiếp! 🔥`,
                        message: "Hôm nay bạn đã hoàn thành bài để giữ lửa thành công.",
                        icon: "🔥",
                        type: "streak",
                        duration: 3500
                    });
                } else {
                    this.showToast({
                        title: `Chuỗi Streak: ${this.streak} ngày liên tiếp! 🔥`,
                        message: "Hãy hoàn thành ít nhất 1 bài hôm nay để giữ lửa chuỗi ngày nhé!",
                        icon: "🔥",
                        type: "streak",
                        duration: 3500
                    });
                }
            };
        }

        // Nút phát âm câu chuẩn (Bản xứ 🗣️ với tốc độ cài đặt - Ưu tiên Audio Neural MP3)
        const speakBtn = document.getElementById('btn-audio-speak');
        if (speakBtn) {
            speakBtn.onclick = () => {
                if (this.activeQ) {
                    if (typeof AudioManager !== 'undefined') {
                        AudioManager.playSentence(this.activeQ, this.settings.voiceSpeed);
                    } else {
                        AudioSvc.speak(this.activeQ.standardTrans || this.activeQ.zh, this.settings.voiceSpeed);
                    }
                }
            };
        }

        // Nút phát âm chậm câu chuẩn (Con rùa 🐢 0.72x - Ưu tiên Audio Neural MP3)
        const slowBtn = document.getElementById('btn-audio-slow');
        if (slowBtn) {
            slowBtn.onclick = () => {
                if (this.activeQ) {
                    if (typeof AudioManager !== 'undefined') {
                        AudioManager.playSentence(this.activeQ, 0.72);
                    } else {
                        AudioSvc.speakSlow(this.activeQ.standardTrans || this.activeQ.zh);
                    }
                }
            };
        }

        // Góp ý & Báo lỗi câu hỏi
        const fbTrigger = document.getElementById('btn-feedback-trigger');
        if (fbTrigger) fbTrigger.onclick = () => this.openFeedback();

        const fbClose = document.getElementById('btn-close-feedback');
        if (fbClose) fbClose.onclick = () => this.closeFeedback();

        const fbSubmit = document.getElementById('btn-submit-feedback');
        if (fbSubmit) fbSubmit.onclick = () => this.submitFeedback();

        // Đóng Quick-Inspector khi nhấn nút X hoặc chạm ra ngoài vùng overlay
        const inspectorOverlay = document.getElementById('vocab-inspector-overlay');
        if (inspectorOverlay) {
            inspectorOverlay.onclick = (e) => {
                if (e.target === inspectorOverlay) {
                    this.closeVocabInspector();
                }
            };
        }
        const inspCloseBtn = document.getElementById('insp-close-btn');
        if (inspCloseBtn) inspCloseBtn.onclick = () => this.closeVocabInspector();

        const inspAudioBtn = document.getElementById('insp-audio-btn');
        if (inspAudioBtn) {
            inspAudioBtn.onclick = (e) => {
                e.stopPropagation();
                const word = this.activeInspectorWord || this.currentAudioText;
                if (typeof AudioSvc !== 'undefined' && word) {
                    AudioSvc.speak(word, 0.85);
                }
            };
        }

        // Phím tắt bàn phím thông minh (tối ưu hóa cho bộ gõ IME tiếng Trung Pinyin)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                // Đang trong quá trình gõ âm Pinyin IME (chưa ấn số/space chọn chữ)
                if (e.isComposing || e.keyCode === 229) return;

                // Nếu đang gõ trong textarea hoặc input
                if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) {
                    if (e.target.id === 'typing-input-area') {
                        if (e.shiftKey) return; // Shift+Enter cho phép xuống dòng
                        e.preventDefault();
                    } else {
                        // Modal góp ý hoặc Admin: Enter là xuống dòng bình thường
                        return;
                    }
                }

                const submitBtn = document.getElementById('btn-submit-action');
                if (submitBtn && !submitBtn.disabled) {
                    submitBtn.click();
                }
            } else if (e.key === 'Escape') {
                this.closeHint();
                this.closeFeedback();
                this.closeAppFeedback();
                this.closeQuestionHintModal();
                this.closeLessonBriefingModal();
                document.getElementById('admin-dialog')?.classList.add('hidden');
                document.getElementById('no-hearts-dialog')?.classList.add('hidden');
            }
        });

        // Điều khiển bài học
        const restartBtn = document.getElementById('btn-restart-lesson');
        if (restartBtn) restartBtn.onclick = () => this.start(this.curLesson);

        const advanceBtn = document.getElementById('btn-advance-lesson');
        if (advanceBtn) {
            advanceBtn.onclick = () => {
                const manifest = window.LESSON_MANIFEST || [];
                const keys = manifest.length > 0 ? manifest.map(m => m.id) : Object.keys(this.data);
                const curIdx = keys.indexOf(this.curLesson);
                if (curIdx >= 0 && curIdx < keys.length - 1) {
                    const next = keys[curIdx + 1];
                    if (typeof NavigationHub !== 'undefined') {
                        NavigationHub.showPractice(next);
                    } else {
                        this.start(next);
                    }
                } else {
                    if (typeof NavigationHub !== 'undefined') {
                        NavigationHub.showDashboard();
                    } else {
                        this.start(keys[0] || 'bai1');
                    }
                }
            };
        }

        // Chế độ Dark / Light
        document.getElementById('btn-theme-toggle').onclick = () => document.documentElement.classList.toggle('dark');

        // CÀI ĐẶT HỆ THỐNG
        document.getElementById('btn-admin').onclick = () => {
            this.syncSettingsUI();
            document.getElementById('admin-dialog').classList.remove('hidden');
        };
        document.getElementById('btn-close-admin').onclick = () => {
            document.getElementById('admin-dialog').classList.add('hidden');
        };

        // Bắt sự kiện thay đổi Cài Đặt
        const speedSelect = document.getElementById('setting-voice-speed');
        if (speedSelect) {
            speedSelect.onchange = (e) => {
                this.settings.voiceSpeed = parseFloat(e.target.value) || 0.98;
                this.saveSettings();
            };
        }

        const autoAudioCheckbox = document.getElementById('setting-auto-audio');
        if (autoAudioCheckbox) {
            autoAudioCheckbox.onchange = (e) => {
                this.settings.autoAudio = e.target.checked;
                this.saveSettings();
            };
        }

        const showPinyinCheckbox = document.getElementById('setting-show-pinyin');
        if (showPinyinCheckbox) {
            showPinyinCheckbox.onchange = (e) => {
                this.settings.showPinyin = e.target.checked;
                this.saveSettings();
                this.applyPinyinVisibility();
            };
        }

        const defaultModeSelect = document.getElementById('setting-default-mode');
        if (defaultModeSelect) {
            defaultModeSelect.onchange = (e) => {
                const targetMode = e.target.value;
                if (this.mode !== targetMode) {
                    this.toggleMode();
                }
            };
        }

        const testerModeCheckbox = document.getElementById('setting-tester-mode');
        if (testerModeCheckbox) {
            testerModeCheckbox.onchange = (e) => {
                if (typeof NavigationHub !== 'undefined') {
                    NavigationHub.testerMode = e.target.checked;
                    try { localStorage.setItem('sct2_dev_mode', NavigationHub.testerMode ? '1' : '0'); } catch (err) {}
                    NavigationHub.updateDevUI();
                    NavigationHub.renderDashboardCards();
                    const msg = NavigationHub.testerMode
                        ? '🛠️ Đã bật Chế độ Dev (Mở khóa toàn bộ bài)'
                        : '🔒 Đã tắt Chế độ Dev';
                    if (this.showToast) this.showToast(msg, NavigationHub.testerMode ? 'success' : 'info');
                }
            };
        }

        const settingRefillBtn = document.getElementById('btn-setting-refill-hearts');
        if (settingRefillBtn) {
            settingRefillBtn.onclick = () => {
                this.refillHearts();
                this.showToast({
                    title: "Hồi Phục Tim Thành Công ❤️",
                    message: "Đã nạp đầy 5 Tim! Bạn có thể tiếp tục học tập.",
                    icon: "❤️",
                    type: "success",
                    duration: 3000
                });
            };
        }

        // Reset lại tiến độ học tập (dành cho người học)
        const resetProgressBtn = document.getElementById('btn-reset-data');
        if (resetProgressBtn) {
            resetProgressBtn.onclick = () => {
                if (confirm("Bạn có chắc chắn muốn đặt lại toàn bộ tiến độ học tập? (Tất cả bài học sẽ trở về trạng thái ban đầu từ Bài 1)")) {
                    ['hsk1', 'hsk2', 'hsk3'].forEach(lvl => {
                        const unlockKey = lvl === 'hsk1' ? 'sct2_unlocked' : `sct2_unlocked_${lvl}`;
                        const doneKey = lvl === 'hsk1' ? 'sct2_completed' : `sct2_completed_${lvl}`;
                        localStorage.removeItem(unlockKey);
                        localStorage.removeItem(doneKey);
                    });
                    if (typeof NavigationHub !== 'undefined') {
                        NavigationHub.unlockedLessons = ['bai1'];
                        NavigationHub.completedLessons = {};
                        NavigationHub.saveProgress();
                        NavigationHub.renderDashboardCards();
                    }
                    this.refillHearts();
                    document.getElementById('admin-dialog')?.classList.add('hidden');
                    this.showToast({
                        title: "Đặt Lại Tiến Độ 🔄",
                        message: "Đã đặt lại toàn bộ tiến độ học tập về Bài 1!",
                        icon: "🔄",
                        type: "info",
                        duration: 3000
                    });
                }
            };
        }

        // Mở modal Góp Ý Phát Triển App
        const openAppFbBtn = document.getElementById('btn-open-app-feedback');
        if (openAppFbBtn) {
            openAppFbBtn.onclick = () => {
                document.getElementById('admin-dialog')?.classList.add('hidden');
                this.openAppFeedback();
            };
        }

        const closeAppFbBtn = document.getElementById('btn-close-app-feedback');
        if (closeAppFbBtn) {
            closeAppFbBtn.onclick = () => this.closeAppFeedback();
        }

        const submitAppFbBtn = document.getElementById('btn-submit-app-feedback');
        if (submitAppFbBtn) {
            submitAppFbBtn.onclick = () => this.submitAppFeedback();
        }

        // 1. Mẹo câu hỏi (bên trong): Question Hint
        const quickNotesBtn = document.getElementById('btn-quick-notes');
        if (quickNotesBtn) {
            quickNotesBtn.onclick = () => this.openQuestionHintModal();
        }
        const closeQuestionHintBtn = document.getElementById('btn-close-question-hint');
        if (closeQuestionHintBtn) {
            closeQuestionHintBtn.onclick = () => this.closeQuestionHintModal();
        }
        const ackQuestionHintBtn = document.getElementById('btn-ack-question-hint');
        if (ackQuestionHintBtn) {
            ackQuestionHintBtn.onclick = () => this.closeQuestionHintModal();
        }
        const qHintDialog = document.getElementById('question-hint-dialog');
        if (qHintDialog) {
            qHintDialog.onclick = (e) => {
                if (e.target === qHintDialog) this.closeQuestionHintModal();
            };
        }

        // 2. Tóm tắt trọng tâm toàn bài (bên ngoài): Lesson Briefing
        const lessonNotesBtn = document.getElementById('btn-lesson-notes');
        if (lessonNotesBtn) {
            lessonNotesBtn.onclick = () => this.openLessonBriefingModal(false);
        }
        const closeQuickNotesBtn = document.getElementById('btn-close-quick-notes');
        if (closeQuickNotesBtn) {
            closeQuickNotesBtn.onclick = () => this.closeLessonBriefingModal();
        }
        const ackQuickNotesBtn = document.getElementById('btn-ack-quick-notes');
        if (ackQuickNotesBtn) {
            ackQuickNotesBtn.onclick = () => this.closeLessonBriefingModal();
        }
        const qnDialog = document.getElementById('quick-notes-dialog');
        if (qnDialog) {
            qnDialog.onclick = (e) => {
                if (e.target === qnDialog) this.closeLessonBriefingModal();
            };
        }
    },

    openAppFeedback() {
        const dialog = document.getElementById('app-feedback-dialog');
        const content = document.getElementById('app-feedback-content');
        if (content) content.value = '';
        if (dialog) dialog.classList.remove('hidden');
        setTimeout(() => content?.focus(), 80);
    },

    closeAppFeedback() {
        document.getElementById('app-feedback-dialog')?.classList.add('hidden');
    },

    submitAppFeedback() {
        const contentEl = document.getElementById('app-feedback-content');
        const content = contentEl ? contentEl.value.trim() : '';
        if (!content) {
            this.showToast({
                title: 'Nội dung còn trống',
                message: 'Vui lòng nhập nội dung góp ý của bạn trước khi gửi.',
                icon: '⚠️',
                type: 'warning',
                duration: 3000
            });
            contentEl?.focus();
            return;
        }

        const topicEl = document.getElementById('app-feedback-topic');
        const topic = topicEl ? topicEl.value : 'other';

        const appFeedbackItem = {
            id: 'app_fb_' + Date.now(),
            topic: topic,
            content: content,
            level: (typeof LevelManager !== 'undefined') ? LevelManager.currentLevel : 'hsk1',
            timestamp: new Date().toISOString()
        };

        try {
            const list = JSON.parse(localStorage.getItem('sct2_app_feedbacks') || '[]');
            list.push(appFeedbackItem);
            localStorage.setItem('sct2_app_feedbacks', JSON.stringify(list));
        } catch (e) {
            console.warn('Lỗi lưu app feedback:', e);
        }

        this.closeAppFeedback();
        this.showToast({
            title: 'Gửi Góp Ý Thành Công',
            message: 'Cảm ơn bạn! Ý kiến góp ý đã được ghi nhận và gửi đến ban phát triển ứng dụng.',
            icon: '✅',
            type: 'success',
            duration: 3500
        });
    },

    openFeedback() {
        if (!this.activeQ) return;
        const targetVi = document.getElementById('feedback-vi-target');
        const targetZh = document.getElementById('feedback-zh-target');
        const content = document.getElementById('feedback-content');
        if (targetVi) targetVi.textContent = this.activeQ.vi || '';
        if (targetZh) targetZh.textContent = this.activeQ.standardTrans || this.activeQ.zh || '';
        if (content) content.value = '';

        const defaultRadio = document.querySelector('input[name="feedback-type"][value="ans_missing"]');
        if (defaultRadio) defaultRadio.checked = true;

        document.getElementById('feedback-dialog')?.classList.remove('hidden');
        setTimeout(() => content?.focus(), 80);
    },

    closeFeedback() {
        document.getElementById('feedback-dialog')?.classList.add('hidden');
    },

    submitFeedback() {
        const contentEl = document.getElementById('feedback-content');
        const content = contentEl ? contentEl.value.trim() : '';
        if (!content) {
            this.showToast({
                title: 'Nội dung còn trống',
                message: 'Vui lòng nhập nội dung góp ý của bạn trước khi gửi.',
                icon: '⚠️',
                type: 'warning',
                duration: 3000
            });
            contentEl?.focus();
            return;
        }

        const typeEl = document.querySelector('input[name="feedback-type"]:checked');
        const feedbackType = typeEl ? typeEl.value : 'other';

        const feedbackItem = {
            id: 'fb_' + Date.now(),
            lessonId: this.curLesson,
            vi: this.activeQ?.vi || '',
            zh: this.activeQ?.standardTrans || this.activeQ?.zh || '',
            type: feedbackType,
            content: content,
            timestamp: new Date().toISOString()
        };

        try {
            const list = JSON.parse(localStorage.getItem('sct2_user_feedbacks') || '[]');
            list.push(feedbackItem);
            localStorage.setItem('sct2_user_feedbacks', JSON.stringify(list));
        } catch (e) {
            console.warn('Lỗi lưu feedback vào localStorage:', e);
        }

        this.closeFeedback();
        this.showToast({
            title: 'Góp ý thành công ❤️',
            message: 'Ý kiến đóng góp của bạn đã được ghi nhận để hoàn thiện bài học.',
            icon: '❤️',
            type: 'success',
            duration: 3000
        });
    }
};

window.App = App;
window.openVocabInspector = (token) => App.openVocabInspector(token);
window.closeVocabInspector = () => App.closeVocabInspector();
window.showHint = (token) => App.showHint(token);
window.closeHint = () => App.closeHint();
window.ensureToastContainer = () => App.ensureToastContainer();
window.showToast = (opts, ...args) => App.showToast(opts, ...args);
window.toggleQuickNotes = (show) => App.toggleQuickNotes(show);
window.openQuestionHintModal = () => App.openQuestionHintModal();
window.closeQuestionHintModal = () => App.closeQuestionHintModal();
window.openLessonBriefingModal = (isPreLesson = false) => App.openLessonBriefingModal(isPreLesson);
window.closeLessonBriefingModal = () => App.closeLessonBriefingModal();
document.addEventListener('DOMContentLoaded', () => App.init());

