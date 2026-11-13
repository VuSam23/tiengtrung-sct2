/**
 * APPLICATION ENTRY POINT
 * Khởi tạo ứng dụng, điều phối MVC, gom bắt sự kiện tập trung
 */

import { AudioService } from './services/audio-service.js';
import { ToastView } from './views/toast-view.js';
import { ModalView } from './views/modal-view.js';
import { StateModel } from './models/state-model.js';
import { LessonModel } from './models/lesson-model.js';
import { GamificationService } from './services/gamification-service.js';
import { QuizController } from './controllers/quiz-controller.js';
import { NavController } from './controllers/nav-controller.js';

const App = {
    curLesson: "bai1",
    data: {},
    queue: [],
    total: 0,
    activeQ: null,
    slots: [],
    userTxt: '',
    checked: false,
    mode: 'parsing',
    hearts: 5,
    maxHearts: 5,
    lastHeartLostTime: null,
    heartTimerInterval: null,
    streak: 0,
    lastCompletedDate: null,
    firstTryCorrect: 0,
    attemptedQuestions: {},
    settings: { voiceSpeed: 0.98, autoAudio: true, showPinyin: true },
    quizController: QuizController,
    navController: NavController,

    async init() {
        this.quizController.init(this);
        this.navController.init(this);
        this.loadGamificationState();
        this.loadMode();
        this.loadSettings();

        if (typeof LevelManager !== 'undefined') LevelManager.init();

        this.loadData();
        this.navController.buildPicker();
        this.bindEvents();

        const currentLevel = (typeof LevelManager !== 'undefined') ? LevelManager.currentLevel : 'hsk1';
        await this.loadLevelData(currentLevel);

        if (typeof NavigationHub !== 'undefined') {
            NavigationHub.init();
            NavigationHub.showDashboard();
        } else {
            const keys = Object.keys(this.data);
            this.start(keys.includes(this.curLesson) ? this.curLesson : (keys[0] || 'bai1'));
        }
    },

    loadGamificationState() {
        const g = GamificationService.loadState();
        Object.assign(this, { hearts: g.hearts, maxHearts: g.maxHearts, lastHeartLostTime: g.lastHeartLostTime, streak: g.streak, lastCompletedDate: g.lastCompletedDate });
        this.updateHeartsUI();
        this.updateStreakUI();

        window.addEventListener('storage', (e) => {
            if (e.key === 'sct2_gamification_state' && e.newValue) {
                try {
                    const d = JSON.parse(e.newValue);
                    if (typeof d.hearts === 'number') this.hearts = d.hearts;
                    this.updateHeartsUI();
                    this.updateStreakUI();
                } catch (err) {}
            }
        });
    },

    refreshHearts() {
        GamificationService.calcPassiveRegen();
        this.hearts = GamificationService.hearts;
        this.lastHeartLostTime = GamificationService.lastHeartLostTime;
        this.updateHeartsUI(true);
    },

    updateHeartsUI(animate = false) {
        const el = document.getElementById('stat-hearts');
        if (el) el.textContent = this.hearts;
        const container = document.getElementById('heart-container');
        if (container) {
            container.title = this.hearts >= this.maxHearts 
                ? `Số tim: ${this.hearts}/${this.maxHearts} (Đã đầy)`
                : `Số tim: ${this.hearts}/${this.maxHearts} (Hồi 1 tim sau: ${GamificationService.getCountdown() || 'Đầy'})`;
        }
        const icon = document.getElementById('heart-icon');
        if (icon && animate) {
            icon.classList.remove('heart-beat');
            void icon.offsetWidth;
            icon.classList.add('heart-beat');
        }
    },

    decreaseHeart() {
        if (typeof NavigationHub !== 'undefined' && NavigationHub.testerMode) return;
        this.hearts = GamificationService.consumeHeart();
        this.lastHeartLostTime = GamificationService.lastHeartLostTime;
        this.updateHeartsUI(true);
        if (this.hearts === 0) setTimeout(() => this.showHeartStatusModal(), 400);
    },

    refillHearts() {
        this.hearts = GamificationService.refillHearts();
        this.updateHeartsUI(true);
        document.getElementById('no-hearts-dialog')?.classList.add('hidden');
        ToastView.show({ title: 'Nạp Tim Thành Công', message: 'Đã hồi phục đầy 5 Tim!', icon: '❤️', type: 'success', duration: 2500 });
    },

    showHeartStatusModal() {
        this.refreshHearts();
        const modal = document.getElementById('no-hearts-dialog');
        if (!modal) return;
        if (this.hearts >= this.maxHearts) {
            ToastView.show({ title: 'Tim Đầy Đủ', message: 'Bạn đang có đủ 5/5 Tim!', icon: '❤️', type: 'success', duration: 2500 });
            return;
        }
        modal.classList.remove('hidden');
    },

    updateStreakUI(animate = false) {
        const el = document.getElementById('stat-streak');
        if (el) el.textContent = this.streak;
        const container = document.getElementById('stat-streak-container');
        if (animate && container) {
            container.classList.add('scale-110');
            setTimeout(() => container.classList.remove('scale-110'), 300);
        }
    },

    loadMode() { this.mode = StateModel.getPreferredMode(); this.updateModeUI(); },
    toggleMode() {
        this.mode = this.mode === 'parsing' ? 'typing' : 'parsing';
        StateModel.setPreferredMode(this.mode);
        this.updateModeUI();
        if (this.activeQ) this.quizController.renderQuestion();
    },

    updateModeUI() {
        const isParse = this.mode === 'parsing';
        const icon = document.getElementById('mode-icon'), label = document.getElementById('mode-label'), badge = document.getElementById('exercise-type-badge');
        if (icon) icon.textContent = isParse ? '⌨️' : '🧩';
        if (label) label.textContent = isParse ? 'Tự gõ' : 'Xếp từ';
        if (badge) badge.textContent = isParse ? 'Kéo thả xếp câu' : 'Tự gõ bản dịch';
    },

    loadSettings() { this.settings = StateModel.loadSettings(); this.syncSettingsUI(); this.applyPinyinVisibility(); },
    saveSettings() { StateModel.saveSettings(this.settings); },

    syncSettingsUI() {
        const speedEl = document.getElementById('setting-voice-speed');
        if (speedEl) speedEl.value = String(this.settings.voiceSpeed);
        const autoAudioEl = document.getElementById('setting-auto-audio');
        if (autoAudioEl) autoAudioEl.checked = this.settings.autoAudio;
        const showPinyinEl = document.getElementById('setting-show-pinyin');
        if (showPinyinEl) showPinyinEl.checked = this.settings.showPinyin;
    },

    applyPinyinVisibility() {
        const pyEl = document.getElementById('anatomy-pinyin') || document.getElementById('source-pinyin-display');
        if (pyEl) pyEl.style.display = this.settings.showPinyin ? '' : 'none';
    },

    async loadLevelData(level = 'hsk1') {
        const discovered = await LessonModel.fetchLevelLessons(level);
        this.data = (discovered && Object.keys(discovered).length > 0) ? discovered : {};
        if (discovered) this.saveData();
        this.navController.buildPicker();
        return discovered;
    },

    loadData() {
        const level = (typeof LevelManager !== 'undefined' && LevelManager.currentLevel) ? LevelManager.currentLevel : 'hsk1';
        const cached = StateModel.loadCachedLessons(level);
        this.data = cached || JSON.parse(JSON.stringify(window.SCT2_DATABASE || {}));
        if (!cached) this.saveData();
    },

    saveData() {
        const level = (typeof LevelManager !== 'undefined' && LevelManager.currentLevel) ? LevelManager.currentLevel : 'hsk1';
        StateModel.saveCachedLessons(level, this.data);
    },

    start(k) { return this.navController.start(k); },
    nextQ() { return this.quizController.nextQuestion(); },
    validate() { return this.quizController.validate(); },
    showVictory() { return this.navController.showVictory(); },
    showHint(token) { ModalView.openVocabInspector(token, this.activeQ); },
    closeHint() { ModalView.closeVocabInspector(); },
    openVocabInspector(t) { ModalView.openVocabInspector(t, this.activeQ); },
    closeVocabInspector() { ModalView.closeVocabInspector(); },
    openLessonBriefingModal(isPre = false) { ModalView.openLessonBriefing(this.data[this.curLesson] || {}, isPre); },
    closeLessonBriefingModal() { ModalView.closeLessonBriefing(); },
    openQuestionHintModal() { ModalView.openQuestionHint(this.activeQ); },
    closeQuestionHintModal() { ModalView.closeQuestionHint(); },
    showToast(opts, ...args) { ToastView.show(opts, ...args); },

    renderQuickNotesButton() {
        const btnQHint = document.getElementById('btn-quick-notes');
        if (btnQHint) { btnQHint.classList.remove('hidden'); btnQHint.style.display = 'inline-flex'; }
        const btnLessonNotes = document.getElementById('btn-lesson-notes');
        if (btnLessonNotes) {
            const hasNotes = !!(this.data[this.curLesson] || {}).quickNotes;
            btnLessonNotes.classList.toggle('hidden', !hasNotes);
            btnLessonNotes.style.display = hasNotes ? 'inline-flex' : 'none';
        }
    },

    bindEvents() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.dataset.action;
            if (this.actions[action]) {
                e.preventDefault();
                this.actions[action](this, target);
            }
        });

        document.getElementById('btn-submit-action')?.addEventListener('click', () => this.checked ? this.nextQ() : this.validate());
        document.getElementById('btn-pass-action')?.addEventListener('click', () => this.quizController.passQuestion());
        document.getElementById('btn-toggle-mode')?.addEventListener('click', () => this.toggleMode());
        document.getElementById('btn-refill-hearts')?.addEventListener('click', () => this.refillHearts());
        document.getElementById('heart-container')?.addEventListener('click', () => this.showHeartStatusModal());
        document.getElementById('stat-streak-container')?.addEventListener('click', () => {
            const learned = this.lastCompletedDate === GamificationService.getLocalDateString();
            ToastView.show({
                title: `Chuỗi Streak: ${this.streak} ngày liên tiếp! 🔥`,
                message: learned ? "Hôm nay bạn đã hoàn thành bài để giữ lửa thành công." : "Hãy hoàn thành ít nhất 1 bài hôm nay để giữ lửa chuỗi ngày nhé!",
                icon: "🔥", type: "streak", duration: 3500
            });
        });

        document.getElementById('btn-audio-speak')?.addEventListener('click', () => {
            if (this.activeQ) AudioService.speak(this.activeQ.standardTrans || this.activeQ.zh, this.settings.voiceSpeed);
        });
        document.getElementById('btn-audio-slow')?.addEventListener('click', () => {
            if (this.activeQ) AudioService.speakSlow(this.activeQ.standardTrans || this.activeQ.zh);
        });

        document.getElementById('btn-restart-lesson')?.addEventListener('click', () => this.start(this.curLesson));
        document.getElementById('btn-advance-lesson')?.addEventListener('click', () => this.navController.advanceLesson());
        document.getElementById('btn-theme-toggle')?.addEventListener('click', () => document.documentElement.classList.toggle('dark'));
        document.getElementById('btn-admin')?.addEventListener('click', () => {
            this.syncSettingsUI();
            document.getElementById('admin-dialog')?.classList.remove('hidden');
        });
        document.getElementById('btn-close-admin')?.addEventListener('click', () => {
            document.getElementById('admin-dialog')?.classList.add('hidden');
        });

        document.getElementById('setting-voice-speed')?.addEventListener('change', (e) => {
            this.settings.voiceSpeed = parseFloat(e.target.value) || 0.98;
            this.saveSettings();
        });
        document.getElementById('setting-auto-audio')?.addEventListener('change', (e) => {
            this.settings.autoAudio = e.target.checked;
            this.saveSettings();
        });
        document.getElementById('setting-show-pinyin')?.addEventListener('change', (e) => {
            this.settings.showPinyin = e.target.checked;
            this.saveSettings();
            this.applyPinyinVisibility();
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.isComposing || e.keyCode === 229) return;
                if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) {
                    if (e.target.id === 'typing-input-area' && !e.shiftKey) e.preventDefault();
                    else return;
                }
                document.getElementById('btn-submit-action')?.click();
            } else if (e.key === 'Escape') {
                this.closeHint();
                this.closeQuestionHintModal();
                this.closeLessonBriefingModal();
                document.getElementById('admin-dialog')?.classList.add('hidden');
                document.getElementById('no-hearts-dialog')?.classList.add('hidden');
            }
        });
    },

    actions: {
        'open-lesson-modal': () => (typeof NavigationHub !== 'undefined') && NavigationHub.openModal(),
        'open-question-hint': (app) => app.openQuestionHintModal(),
        'close-question-hint': (app) => app.closeQuestionHintModal(),
        'open-lesson-briefing': (app) => app.openLessonBriefingModal(false),
        'close-lesson-briefing': (app) => app.closeLessonBriefingModal(),
        'refill-hearts': (app) => app.refillHearts(),
    }
};

window.App = App;
window.openVocabInspector = (token) => App.openVocabInspector(token);
window.closeVocabInspector = () => App.closeVocabInspector();
window.showHint = (token) => App.showHint(token);
window.closeHint = () => App.closeHint();
window.ensureToastContainer = () => ToastView.ensureContainer();
window.showToast = (opts, ...args) => ToastView.show(opts, ...args);
window.openQuestionHintModal = () => App.openQuestionHintModal();
window.closeQuestionHintModal = () => App.closeQuestionHintModal();
window.openLessonBriefingModal = (isPre = false) => App.openLessonBriefingModal(isPre);
window.closeLessonBriefingModal = () => App.closeLessonBriefingModal();
document.addEventListener('DOMContentLoaded', () => App.init());
