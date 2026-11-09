/**
 * APPLICATION CONTROLLER
 * Điều khiển giao diện người dùng, vòng lặp bài tập, tương tác và quản lý dữ liệu
 */

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
    hearts: 5,
    maxHearts: 5,
    firstTryCorrect: 0,
    attemptedQuestions: {},
    settings: {
        voiceSpeed: 0.98,
        autoAudio: true,
        showPinyin: true,
    },

    async init() {
        this.loadHearts();
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

    loadHearts() {
        try {
            const savedHearts = localStorage.getItem('sct2_user_hearts');
            this.hearts = savedHearts !== null ? Math.max(0, parseInt(savedHearts, 10)) : 5;
        } catch (e) {
            this.hearts = 5; // fallback khi localStorage bị chặn
        }
        this.updateHeartsUI();
    },

    saveHearts() {
        try { localStorage.setItem('sct2_user_hearts', this.hearts); } catch (e) {}
        this.updateHeartsUI();
    },

    updateHeartsUI(animate = false) {
        const el = document.getElementById('stat-hearts');
        if (el) el.textContent = this.hearts;
        const icon = document.getElementById('heart-icon');
        if (icon && animate) {
            icon.classList.remove('heart-beat');
            void icon.offsetWidth;
            icon.classList.add('heart-beat');
        }
    },

    decreaseHeart() {
        this.hearts = Math.max(0, this.hearts - 1);
        this.saveHearts();
        this.updateHeartsUI(true);
        if (this.hearts === 0) {
            setTimeout(() => this.showNoHeartsModal(), 500);
        }
    },

    refillHearts() {
        this.hearts = this.maxHearts;
        this.saveHearts();
        this.updateHeartsUI(true);
        document.getElementById('no-hearts-dialog')?.classList.add('hidden');
    },

    showNoHeartsModal() {
        document.getElementById('no-hearts-dialog')?.classList.remove('hidden');
    },

    loadMode() {
        try {
            const savedMode = localStorage.getItem('sct2_preferred_mode');
            this.mode = savedMode || 'parsing';
        } catch (e) {
            this.mode = 'parsing';
        }
        this.updateModeUI();
    },

    toggleMode() {
        this.mode = this.mode === 'parsing' ? 'typing' : 'parsing';
        localStorage.setItem('sct2_preferred_mode', this.mode);
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
        try {
            const speed = localStorage.getItem('sct2_setting_voice_speed');
            if (speed) this.settings.voiceSpeed = parseFloat(speed) || 0.98;

            const autoAudio = localStorage.getItem('sct2_setting_auto_audio');
            this.settings.autoAudio = autoAudio !== null ? autoAudio === 'true' : true;

            const showPinyin = localStorage.getItem('sct2_setting_show_pinyin');
            this.settings.showPinyin = showPinyin !== null ? showPinyin === 'true' : true;
        } catch (e) {
            // localStorage bị chặn → dùng giá trị mặc định
        }
        this.syncSettingsUI();
        this.applyPinyinVisibility();
    },

    saveSettings() {
        try {
            localStorage.setItem('sct2_setting_voice_speed', this.settings.voiceSpeed);
            localStorage.setItem('sct2_setting_auto_audio', this.settings.autoAudio);
            localStorage.setItem('sct2_setting_show_pinyin', this.settings.showPinyin);
        } catch (e) {}
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
        const pyEl = document.getElementById('source-pinyin-display');
        if (pyEl) {
            pyEl.style.display = this.settings.showPinyin ? '' : 'none';
        }
    },

    getLevelDbKey() {
        const level = (typeof LevelManager !== 'undefined' && LevelManager.currentLevel) ? LevelManager.currentLevel : 'hsk1';
        return level === 'hsk1' ? 'sct2_db_v2' : `sct2_db_v2_${level}`;
    },

    async loadLevelData(level = 'hsk1') {
        let index = 1;
        const discovered = {};
        console.log(`🔍 Đang tự động quét bài học cấp độ ${level}...`);

        const manifest = (window.HSK_MANIFESTS && window.HSK_MANIFESTS[level])
            || (level === 'hsk1' ? window.LESSON_MANIFEST : [])
            || [];

        // 1. Quét theo danh mục manifest chính thức
        for (const item of manifest) {
            let path = item.file;
            try {
                let res = await fetch(path);
                if (!res.ok && level === 'hsk1') {
                    res = await fetch(`data/${item.id}.json`);
                }
                if (res && res.ok) {
                    const rawData = await res.json();
                    const rawLessons = Array.isArray(rawData) ? rawData : (rawData.sentences || rawData.lessons || []);
                    const lessons = (typeof LessonDataParser !== 'undefined')
                        ? LessonDataParser.normalizeList(rawLessons, item.id)
                        : rawLessons;
                    discovered[item.id] = {
                        title: item.title || rawData.lessonTitle || rawData.title || item.id,
                        quickNotes: rawData.quickNotes || null,
                        lessons: lessons
                    };
                }
            } catch (e) {
                // Tiếp tục
            }
        }

        // 2. Quét tuần tự thêm data/<level>/baiX.json
        while (index <= 50) {
            const key = `bai${index}`;
            if (discovered[key]) {
                index++;
                continue;
            }

            let path = `data/${level}/${key}.json`;
            try {
                let res = await fetch(path);
                if (!res.ok && level === 'hsk1') {
                    res = await fetch(`data/${key}.json`);
                }
                if (!res || !res.ok) break;

                const rawData = await res.json();
                const manifestItem = manifest.find(m => m.id === key);
                const title = rawData.lessonTitle || rawData.title || (manifestItem ? manifestItem.title : `Bài ${index}: Luyện Dịch ${level.toUpperCase()}`);
                const rawLessons = Array.isArray(rawData) ? rawData : (rawData.sentences || rawData.lessons || []);
                const lessons = (typeof LessonDataParser !== 'undefined')
                    ? LessonDataParser.normalizeList(rawLessons, key)
                    : rawLessons;

                discovered[key] = {
                    title: title,
                    quickNotes: rawData.quickNotes || null,
                    lessons: lessons
                };
                index++;
            } catch (e) {
                break;
            }
        }

        if (Object.keys(discovered).length > 0) {
            this.data = discovered;
            this.saveData();
        } else {
            this.data = {};
            // Hiện thông báo lỗi nếu không nạp được bài nào
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
        const savedVer = localStorage.getItem('sct2_db_version');
        const dbKey = this.getLevelDbKey();
        const saved = localStorage.getItem(dbKey);

        if (saved && savedVer === DB_VERSION) {
            try {
                this.data = JSON.parse(saved);
            } catch (e) {
                this.data = JSON.parse(JSON.stringify(window.SCT2_DATABASE || {}));
            }
        } else {
            this.data = JSON.parse(JSON.stringify(window.SCT2_DATABASE || {}));
            this.saveData();
        }
    },

    saveData() {
        localStorage.setItem('sct2_db_version', DB_VERSION);
        const dbKey = this.getLevelDbKey();
        localStorage.setItem(dbKey, JSON.stringify(this.data));
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
        if (!item || !item.file) return null;
        try {
            let res = await fetch(item.file);
            if (!res.ok && item.file.startsWith('data/hsk1/')) {
                res = await fetch(item.file.replace('data/hsk1/', 'data/'));
            }
            if (!res || !res.ok) throw new Error("Fetch failed");
            const rawData = await res.json();
            if (Array.isArray(rawData)) {
                return {
                    id: item.id,
                    title: item.title,
                    lessons: LessonDataParser.normalizeList(rawData, item.id)
                };
            } else if (rawData.sentences || rawData.lessons) {
                return {
                    id: rawData.lessonId || rawData.id || item.id,
                    title: rawData.lessonTitle || rawData.title || item.title,
                    quickNotes: rawData.quickNotes || null,
                    lessons: LessonDataParser.normalizeList(rawData.sentences || rawData.lessons, item.id)
                };
            }
            return rawData;
        } catch (e) {
            // Khi mở qua file:// hoặc fetch lỗi, fallback dùng data đã nạp sẵn
            return null;
        }
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
        if (this.queue.length === 0) return this.showVictory();
        this.activeQ = this.queue[0];
        this.slots = [];
        this.userTxt = '';
        this.checked = false;

        // Xáo trộn ngẫu nhiên các khối từ hiển thị (đảm bảo không bao giờ trùng thứ tự đáp án chuẩn)
        this.activeQ.displayTiles = this.shuffleTiles(this.activeQ.tiles || [], this.activeQ.targetOrder || []);

        this.render();
    },

    render() {
        if (this.total === 0) return;
        const done = this.total - this.queue.length;
        const pct = (done / this.total) * 100;
        const theme = (typeof LevelManager !== 'undefined' && LevelManager.getTheme) ? LevelManager.getTheme() : null;

        const pBar = document.getElementById('session-progress-bar');
        if (pBar) {
            pBar.style.width = `${pct}%`;
            if (theme) pBar.className = `${theme.progressBarClass} h-full rounded-full transition-all duration-300 ease-out`;
        }
        document.getElementById('session-progress-text').textContent = `${done}/${this.total}`;
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
        document.getElementById('prompt-instruction').textContent = q.title || "Luyện dịch câu sau:";
        document.getElementById('source-vi-text').textContent = q.vi || "";
        document.getElementById('source-pinyin-display').textContent = q.pinyin ? `🗣️ ${q.pinyin}` : "";
        this.applyPinyinVisibility();
        document.getElementById('source-core-grammar').textContent = q.grammarPoint ? `Ngữ pháp: ${q.grammarPoint}` : "";

        // Reset trạng thái bẫy realtime và hiển thị nút mẹo nếu có
        document.getElementById('realtime-trap-alert')?.classList.add('hidden');
        this.renderQuickNotesButton();

        // Render chips từ vựng
        const chips = document.getElementById('source-chips-container');
        chips.innerHTML = '';
        (q.tokens || []).forEach(t => {
            const b = document.createElement('button');
            b.className = "clickable-chip px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold transition active:scale-95";
            b.innerHTML = `${t.text} <span class="text-[10px] text-emerald-500">ℹ️</span>`;
            b.onclick = (e) => {
                e.stopPropagation();
                // Phát âm chữ Hán chuẩn xác ngay khi bấm vào chip
                AudioSvc.speak(t.hz || t.text, 0.85);
                this.showHint(t);
            };
            chips.appendChild(b);
        });

        // Render workspace tương tác theo chế độ người dùng lựa chọn (Xếp từ hoặc Tự gõ)
        const ws = document.getElementById('interactive-workspace');
        ws.innerHTML = '';
        if (this.mode === 'parsing') {
            this.renderParse(ws, q);
        } else {
            this.renderTyping(ws, q);
        }
    },

    renderParse(ws, q) {
        const slot = document.createElement('div');
        slot.id = 'p-slot';
        slot.className = "min-h-[72px] p-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 flex flex-wrap gap-2 mb-4";

        const tip = document.createElement('span');
        tip.id = 'p-tip';
        tip.className = "text-xs text-slate-400 italic";
        tip.textContent = "Chạm các khối từ vựng bên dưới để ghép câu...";
        slot.appendChild(tip);

        const pool = document.createElement('div');
        pool.id = 'p-pool';
        pool.className = "flex flex-wrap gap-2.5 justify-center";

        const tilesToRender = q.displayTiles || (q.displayTiles = this.shuffleTiles(q.tiles || [], q.targetOrder || []));

        tilesToRender.forEach(t => {
            const b = document.createElement('button');
            b.className = "btn-press px-4 py-2.5 rounded-xl border border-slate-300 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm shadow-sm";
            b.innerHTML = `<span class="chinese-text text-lg">${t.text}</span> <span class="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 rounded px-1">${t.tag}</span>`;
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
            b.className = "px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-emerald-400 text-sm shadow-sm flex items-center gap-1.5";
            b.innerHTML = `<span class="chinese-text text-lg">${t.text}</span> <span class="text-rose-500 text-xs">✕</span>`;
            b.dataset.pid = id;
            b.onclick = () => {
                if (!this.checked) {
                    AudioSvc.play('click');
                    this.toggleSlot(id, q);
                }
            };
            document.getElementById('p-slot').appendChild(b);
        }

        document.getElementById('p-tip').style.display = this.slots.length ? 'none' : 'inline';
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
            this.queue.shift();
            this.showBanner(true, title, fb);
        } else {
            AudioSvc.play('buzz');
            this.decreaseHeart(); // Trừ 1 tim khi trả lời sai
            this.queue.push(this.queue.shift());

            // Nếu bắt trúng bẫy cú pháp, định dạng cụm bẫy gọn gàng vào duy nhất banner ở dưới
            if (evalResult.trapPattern) {
                fb = `<div class="font-bold text-rose-800 dark:text-rose-200 mb-1 flex items-center gap-1.5 flex-wrap"><span>Phát hiện bẫy:</span><span class="chinese-text font-black px-2 py-0.5 rounded bg-rose-200/90 text-rose-900 dark:bg-rose-900/80 dark:text-rose-200 border border-rose-300 dark:border-rose-700">${evalResult.trapPattern}</span></div><div>${fb}</div>`;
            }
            this.showBanner(false, title, fb);
        }

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
                ? (theme ? theme.cardActiveBtn : "bg-emerald-600 hover:bg-emerald-700 text-white") 
                : "bg-rose-600 hover:bg-rose-700 text-white";
            btnSubmit.className = `min-w-[180px] py-3.5 px-6 ${continueColor} font-black rounded-xl text-sm shadow-md btn-press tracking-wide`;
        }

        // Hiển thị đáp án chuẩn (chỉ hiện khi chưa đúng)
        const stdBox = document.getElementById('standard-answer-box');
        if (stdBox) {
            if (!pass) {
                stdBox.classList.remove('hidden');
                document.getElementById('tier-standard').textContent = q.standardTrans || q.zh;
            } else {
                stdBox.classList.add('hidden');
            }
        }
    },

    showBanner(good, title, body) {
        const b = document.getElementById('evaluation-banner');
        b.classList.remove('hidden');

        // Phân biệt màu sắc Đúng (Xanh) - Sai (Đỏ) và tương phản cao trên Dark Mode
        b.className = "rounded-2xl p-4 border transition-all text-sm leading-relaxed animate-pop " +
            (good
                ? "bg-emerald-100 border-emerald-300 text-emerald-950 dark:bg-emerald-950/80 dark:border-emerald-700 dark:text-emerald-100"
                : "bg-rose-100 border-rose-300 text-rose-950 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-100");

        const iconEl = document.getElementById('eval-icon');
        iconEl.textContent = good ? "🎉" : "⚠️";

        const titleEl = document.getElementById('eval-status-title');
        titleEl.textContent = title;
        titleEl.className = "font-black text-base " +
            (good ? "text-emerald-900 dark:text-emerald-200" : "text-rose-900 dark:text-rose-200");

        const badgeEl = document.getElementById('eval-score-badge');
        badgeEl.textContent = good ? "ĐẠT YÊU CẦU" : "CHƯA ĐẠT";
        badgeEl.className = "text-xs font-black px-2.5 py-0.5 rounded-full " +
            (good
                ? "bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                : "bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200");

        const bodyEl = document.getElementById('eval-message-body');
        bodyEl.innerHTML = body;
        bodyEl.className = "mt-1.5 text-xs sm:text-sm font-medium space-y-1.5 text-slate-800 dark:text-slate-100";
    },

    showVictory() {
        document.getElementById('practice-card').classList.add('hidden');
        document.getElementById('bottom-action-drawer').classList.add('hidden');
        document.getElementById('victory-card').classList.remove('hidden');

        // Tính toán tỷ lệ chính xác và số sao thực tế (Star Rating: >=80% = 3 sao, >=50% = 2 sao, <50% = 1 sao)
        const totalQ = this.total || 1;
        const accuracy = Math.round((this.firstTryCorrect / totalQ) * 100);
        let stars = 1;
        let starStr = '⭐';
        if (accuracy >= 80) {
            stars = 3;
            starStr = '⭐⭐⭐';
        } else if (accuracy >= 50) {
            stars = 2;
            starStr = '⭐⭐';
        }

        const victoryStarsEl = document.getElementById('victory-stars');
        if (victoryStarsEl) victoryStarsEl.textContent = starStr;

        const badgeEl = document.getElementById('victory-accuracy-badge');
        if (badgeEl) {
            badgeEl.textContent = `Độ chính xác: ${accuracy}% (${stars} Sao)`;
        }

        // Ghi nhận hoàn thành và mở khóa bài tiếp theo qua NavigationHub
        if (typeof NavigationHub !== 'undefined') {
            NavigationHub.markCompleted(this.curLesson, totalQ, stars, accuracy);
        }

        const theme = (typeof LevelManager !== 'undefined' && LevelManager.getTheme) ? LevelManager.getTheme() : null;
        const advBtn = document.getElementById('btn-advance-lesson');
        if (advBtn && theme) {
            advBtn.className = `px-6 py-3.5 ${theme.cardActiveBtn} font-black rounded-xl transition text-sm shadow-soft btn-press`;
        }
    },

    showHint(t) {
        document.getElementById('hint-gram-role').textContent = t.role || "Thành phần";
        document.getElementById('hint-hz').textContent = t.hz || t.text;
        document.getElementById('hint-py').textContent = t.py || "";
        document.getElementById('hint-hv').textContent = t.hv || "---";
        document.getElementById('hint-vn').textContent = t.vn || "";
        document.getElementById('hint-radicals').textContent = t.radicals || 'Xem chiết tự';

        const audioBtn = document.getElementById('btn-hint-audio');
        if (audioBtn) {
            audioBtn.onclick = (e) => {
                e.stopPropagation();
                AudioSvc.speak(t.hz || t.text);
            };
        }

        const tb = document.getElementById('hint-trans-trap');
        if (t.trap) {
            tb.classList.remove('hidden');
            document.getElementById('hint-trap-text').textContent = t.trap;
        } else {
            tb.classList.add('hidden');
        }

        document.getElementById('hint-dialog').classList.remove('hidden');
        setTimeout(() => {
            document.getElementById('hint-dialog').classList.add('modal-active');
            document.getElementById('hint-dialog-card').classList.add('modal-card-active');
        }, 10);
    },

    closeHint() {
        document.getElementById('hint-dialog').classList.remove('modal-active');
        document.getElementById('hint-dialog-card').classList.remove('modal-card-active');
        setTimeout(() => document.getElementById('hint-dialog').classList.add('hidden'), 200);
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

        const dialog = document.getElementById('quick-notes-dialog');
        const ackBtn = document.getElementById('btn-ack-quick-notes');
        const badgeEl = document.getElementById('qn-pre-badge');

        if (dialog) {
            // Giữ nền app như trước kia nhưng làm mờ nền phía sau (backdrop-blur-md) giúp người đọc tập trung tuyệt đối
            dialog.className = "fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4";
        }

        if (isPreLesson) {
            if (badgeEl) {
                badgeEl.textContent = "🎯 TRỌNG TÂM BÀI HỌC • NẮM VỮNG TRƯỚC KHI BẮT ĐẦU";
                badgeEl.classList.remove('hidden');
            }
            if (ackBtn) {
                ackBtn.textContent = "BẮT ĐẦU LUYỆN DỊCH ➔";
            }
        } else {
            if (badgeEl) {
                badgeEl.classList.add('hidden');
            }
            if (ackBtn) {
                ackBtn.textContent = "QUAY LẠI LÀM BÀI ➔";
            }
        }

        this.toggleQuickNotes(true);
    },

    closeLessonBriefingModal() {
        this.toggleQuickNotes(false);
    },

    // 2. Mẹo & phân tích câu hỏi đang luyện (cái bên trong - Question Hint)
    openQuestionHintModal() {
        const q = this.activeQ;
        if (!q) return;

        const body = document.getElementById('question-hint-body');
        if (!body) return;
        body.innerHTML = '';

        const subtitle = document.getElementById('question-hint-subtitle');
        if (subtitle) {
            subtitle.textContent = q.vi ? `Đề bài: "${q.vi}"` : (q.title || "Gợi ý câu hỏi");
        }

        // 1. Cấu trúc ngữ pháp trọng tâm của câu
        if (q.grammarPoint) {
            const block = document.createElement('div');
            block.className = "p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80";
            block.innerHTML = `
                <div class="font-black text-emerald-800 dark:text-emerald-300 mb-1.5 flex items-center gap-1.5 text-xs">
                    <span>📌</span> CẤU TRÚC NGỮ PHÁP CÂU NÀY
                </div>
                <div class="text-slate-800 dark:text-slate-200 font-semibold text-xs leading-relaxed">${q.grammarPoint}</div>
            `;
            body.appendChild(block);
        }

        // 2. Hướng dẫn dịch & phân tích
        if (q.explanation || q.notes) {
            const block = document.createElement('div');
            block.className = "p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80";
            block.innerHTML = `
                <div class="font-black text-amber-800 dark:text-amber-300 mb-1.5 flex items-center gap-1.5 text-xs">
                    <span>💡</span> HƯỚNG DẪN DỊCH & LƯU Ý
                </div>
                <div class="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">${q.explanation || q.notes}</div>
            `;
            body.appendChild(block);
        }

        // 3. Từ vựng & cụm từ then chốt của câu (tokens)
        if (Array.isArray(q.tokens) && q.tokens.length > 0) {
            const block = document.createElement('div');
            block.className = "p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5";
            const tokenList = q.tokens.map(t => `
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs shadow-xs">
                    <b class="text-emerald-700 dark:text-emerald-400 chinese-text font-bold">${t.hz || t.text}</b>
                    <span class="text-slate-500 font-mono text-[11px]">(${t.py || ''})</span>:
                    <span class="text-slate-700 dark:text-slate-300">${t.vn || t.text}</span>
                </span>
            `).join('');
            block.innerHTML = `
                <div class="font-black text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5 text-xs">
                    <span>📖</span> TỪ VỰNG THEN CHỐT TRONG CÂU
                </div>
                <div class="flex flex-wrap gap-1.5">${tokenList}</div>
            `;
            body.appendChild(block);
        }

        // Fallback nếu câu không có trường gợi ý nào
        if (body.children.length === 0) {
            const block = document.createElement('div');
            block.className = "p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-center text-slate-600 dark:text-slate-300 text-xs space-y-1";
            block.innerHTML = `
                <div class="text-2xl">💡</div>
                <p class="font-bold">Gợi ý luyện dịch câu này:</p>
                <p>Hãy chú ý trật tự ngữ pháp tự nhiên trong tiếng Trung: Trạng ngữ thời gian và nơi chốn đặt trước động từ.</p>
            `;
            body.appendChild(block);
        }

        const dialog = document.getElementById('question-hint-dialog');
        if (dialog) {
            dialog.classList.remove('hidden');
            dialog.style.display = 'flex';
        }
    },

    closeQuestionHintModal() {
        const dialog = document.getElementById('question-hint-dialog');
        if (dialog) {
            dialog.classList.add('hidden');
            dialog.style.display = 'none';
        }
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
            block.className = "p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-2";
            const vocabHtml = notes.vocabTips.map(v => 
                `<li class="leading-relaxed"><b>${v.word}</b> <i class="text-emerald-600 dark:text-emerald-400 font-mono">(${v.py})</i>: ${v.note}</li>`
            ).join('');
            block.innerHTML = `
                <div class="font-black text-amber-900 dark:text-amber-300 text-xs flex items-center gap-1.5">
                    <span>📚</span> Từ vựng bổ sung:
                </div>
                <ul class="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">${vocabHtml}</ul>
            `;
            body.appendChild(block);
        }

        // 2. Phân mục Lưu ý ngữ pháp & bẫy cú pháp (grammarTips) theo chuẩn Briefing
        if (notes && typeof notes === 'object' && Array.isArray(notes.grammarTips) && notes.grammarTips.length > 0) {
            const block = document.createElement('div');
            block.className = "p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2";
            const grammarHtml = notes.grammarTips.map(g => 
                `<li class="leading-relaxed">${g}</li>`
            ).join('');
            block.innerHTML = `
                <div class="font-black text-emerald-900 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                    <span>⚠️</span> Lưu ý ngữ pháp:
                </div>
                <ul class="list-disc list-inside space-y-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">${grammarHtml}</ul>
            `;
            body.appendChild(block);
        }

        // 3. Fallback linh hoạt cho các bài dạng cũ (grammarPoint / explanation)
        if (!notes.vocabTips && !notes.grammarTips) {
            const q = this.activeQ;
            if (q && q.grammarPoint) {
                const block = document.createElement('div');
                block.className = "p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80";
                block.innerHTML = `
                    <div class="font-black text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1.5 text-xs">
                        <span>📌</span> CẤU TRÚC NGỮ PHÁP
                    </div>
                    <div class="text-slate-800 dark:text-slate-200 font-semibold text-xs leading-relaxed">${q.grammarPoint}</div>
                `;
                body.appendChild(block);
            }
            if (typeof notes === 'string') {
                const block = document.createElement('div');
                block.className = "p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80";
                block.innerHTML = `<p class="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">${notes}</p>`;
                body.appendChild(block);
            } else if (Array.isArray(notes)) {
                const block = document.createElement('div');
                block.className = "p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80";
                const ul = document.createElement('ul');
                ul.className = "list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 text-xs";
                notes.forEach(item => {
                    const li = document.createElement('li');
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
            btnSubmit.className = "min-w-[180px] py-3.5 px-6 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-sm shadow-md btn-press tracking-wide";

            // Hiển thị banner Chưa Đạt / Đã Bỏ Qua kèm đáp án chuẩn
            this.showBanner(false, "Cần chú ý / Đã bỏ qua câu này", "Đã xếp câu này xuống cuối hàng chờ để bạn luyện tập lại sau.");

            const stdBox = document.getElementById('standard-answer-box');
            if (stdBox) {
                stdBox.classList.remove('hidden');
                document.getElementById('tier-standard').textContent = this.activeQ.standardTrans || this.activeQ.zh;
            }
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

        const heartContainer = document.getElementById('heart-container');
        if (heartContainer) {
            heartContainer.onclick = () => {
                if (this.hearts < this.maxHearts) {
                    if (confirm(`Bạn đang còn ${this.hearts}/${this.maxHearts} ❤️. Bạn có muốn nạp đầy 5 tim ngay bây giờ không?`)) {
                        this.refillHearts();
                    }
                } else {
                    this.updateHeartsUI(true);
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

        // Đóng hint tra cứu từ khi nhấn bất kỳ vùng nào (trừ nút phát âm 🔊)
        const hintDialog = document.getElementById('hint-dialog');
        if (hintDialog) {
            hintDialog.onclick = (e) => {
                if (e.target.closest('#btn-hint-audio')) return;
                this.closeHint();
            };
        }
        const btnCloseHint = document.getElementById('btn-close-hint');
        if (btnCloseHint) btnCloseHint.onclick = () => this.closeHint();

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
                    const label = document.getElementById('tester-unlock-label');
                    if (label) {
                        label.textContent = NavigationHub.testerMode ? "Tester: Đã Mở Khóa Tất Cả" : "Tester: Chế Độ Thường";
                    }
                    const testerBtn = document.getElementById('btn-toggle-tester-unlock');
                    if (testerBtn) {
                        testerBtn.className = "text-[11px] font-black px-2.5 py-1.5 rounded-xl transition active:scale-95 flex items-center gap-1.5 border cursor-pointer backdrop-blur-xs " +
                            (NavigationHub.testerMode ? "bg-white/25 hover:bg-white/35 text-white border-white/30" : "bg-black/30 hover:bg-black/40 text-slate-300 border-white/10");
                    }
                    NavigationHub.renderDashboardCards();
                }
            };
        }

        const settingRefillBtn = document.getElementById('btn-setting-refill-hearts');
        if (settingRefillBtn) {
            settingRefillBtn.onclick = () => {
                this.refillHearts();
                alert("❤️ Đã hồi phục đầy 5 Tim!");
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
                    alert("Đã đặt lại toàn bộ tiến độ học tập về Bài 1!");
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
            alert('Vui lòng nhập nội dung góp ý của bạn trước khi gửi.');
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
        alert('Cảm ơn bạn! Ý kiến góp ý đã được ghi nhận và gửi đến ban phát triển ứng dụng.');
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
            alert('Vui lòng nhập nội dung góp ý của bạn trước khi gửi.');
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
        alert('❤️ Cảm ơn bạn! Ý kiến đóng góp của bạn đã được ghi nhận để hoàn thiện bài học.');
    }
};

window.App = App;
window.toggleQuickNotes = (show) => App.toggleQuickNotes(show);
window.openQuestionHintModal = () => App.openQuestionHintModal();
window.closeQuestionHintModal = () => App.closeQuestionHintModal();
window.openLessonBriefingModal = (isPreLesson = false) => App.openLessonBriefingModal(isPreLesson);
window.closeLessonBriefingModal = () => App.closeLessonBriefingModal();
document.addEventListener('DOMContentLoaded', () => App.init());

