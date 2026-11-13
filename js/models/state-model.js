/**
 * STATE MODEL (Tầng Models)
 * Quản lý toàn bộ State của ứng dụng và giao tiếp tập trung với localStorage.
 * CẤM thao tác DOM trong file này.
 */

const STORAGE_KEYS = {
    DB_VERSION: 'sct2_db_version',
    DB_DATA_PREFIX: 'sct2_db_v3_data_',
    GAMIFICATION: 'sct2_gamification_state',
    USER_HEARTS_LEGACY: 'sct2_user_hearts',
    PREFERRED_MODE: 'sct2_preferred_mode',
    VOICE_SPEED: 'sct2_setting_voice_speed',
    AUTO_AUDIO: 'sct2_setting_auto_audio',
    SHOW_PINYIN: 'sct2_setting_show_pinyin',
    DEV_MODE: 'sct2_dev_mode',
    APP_FEEDBACKS: 'sct2_app_feedbacks',
    USER_FEEDBACKS: 'sct2_user_feedbacks',
    PROGRESS_PREFIX: 'sct2_progress_'
};

export const StateModel = {
    DB_VERSION: 'sct2_db_v3_modular',

    // App state
    curLesson: 'bai1',
    data: {},
    queue: [],
    total: 0,
    activeQ: null,
    slots: [],
    userTxt: '',
    checked: false,
    mode: 'parsing', // 'parsing' | 'typing'

    firstTryCorrect: 0,
    attemptedQuestions: {},

    settings: {
        voiceSpeed: 0.98,
        autoAudio: true,
        showPinyin: true,
    },

    // Mode
    getPreferredMode() {
        try {
            return localStorage.getItem(STORAGE_KEYS.PREFERRED_MODE) || 'parsing';
        } catch (e) {
            return 'parsing';
        }
    },

    setPreferredMode(mode) {
        this.mode = mode;
        try {
            localStorage.setItem(STORAGE_KEYS.PREFERRED_MODE, mode);
        } catch (e) {}
    },

    // Settings
    loadSettings() {
        try {
            const speed = localStorage.getItem(STORAGE_KEYS.VOICE_SPEED);
            const autoAudio = localStorage.getItem(STORAGE_KEYS.AUTO_AUDIO);
            const showPinyin = localStorage.getItem(STORAGE_KEYS.SHOW_PINYIN);

            this.settings.voiceSpeed = speed ? parseFloat(speed) : 0.98;
            this.settings.autoAudio = autoAudio !== null ? autoAudio === 'true' : true;
            this.settings.showPinyin = showPinyin !== null ? showPinyin === 'true' : true;
        } catch (e) {}
        return this.settings;
    },

    saveSettings(settings) {
        if (settings) {
            this.settings = { ...this.settings, ...settings };
        }
        try {
            localStorage.setItem(STORAGE_KEYS.VOICE_SPEED, this.settings.voiceSpeed);
            localStorage.setItem(STORAGE_KEYS.AUTO_AUDIO, this.settings.autoAudio);
            localStorage.setItem(STORAGE_KEYS.SHOW_PINYIN, this.settings.showPinyin);
        } catch (e) {}
    },

    // Cache dữ liệu bài học theo cấp độ
    loadCachedLessons(level = 'hsk1') {
        try {
            const savedVer = localStorage.getItem(STORAGE_KEYS.DB_VERSION);
            const dbKey = `${STORAGE_KEYS.DB_DATA_PREFIX}${level}`;
            const saved = localStorage.getItem(dbKey);
            if (saved && savedVer === this.DB_VERSION) {
                return JSON.parse(saved);
            }
        } catch (e) {}
        return null;
    },

    saveCachedLessons(level = 'hsk1', data = {}) {
        try {
            const dbKey = `${STORAGE_KEYS.DB_DATA_PREFIX}${level}`;
            localStorage.setItem(STORAGE_KEYS.DB_VERSION, this.DB_VERSION);
            localStorage.setItem(dbKey, JSON.stringify(data));
        } catch (e) {}
    },

    // Quản lý Feedbacks
    saveUserFeedback(feedback) {
        try {
            const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_FEEDBACKS) || '[]');
            list.unshift(feedback);
            localStorage.setItem(STORAGE_KEYS.USER_FEEDBACKS, JSON.stringify(list));
            return true;
        } catch (e) {
            console.warn('Lỗi lưu feedback vào localStorage:', e);
            return false;
        }
    },

    saveAppFeedback(feedback) {
        try {
            const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.APP_FEEDBACKS) || '[]');
            list.unshift(feedback);
            localStorage.setItem(STORAGE_KEYS.APP_FEEDBACKS, JSON.stringify(list));
            return true;
        } catch (e) {
            console.warn('Lỗi lưu app feedback:', e);
            return false;
        }
    },

    // Dev Mode
    getDevMode() {
        try {
            return localStorage.getItem(STORAGE_KEYS.DEV_MODE) === '1';
        } catch (e) {
            return false;
        }
    },

    setDevMode(enabled) {
        try {
            localStorage.setItem(STORAGE_KEYS.DEV_MODE, enabled ? '1' : '0');
        } catch (e) {}
    }
};

if (typeof window !== 'undefined') {
    window.StateModel = StateModel;
}

