/**
 * GAMIFICATION SERVICE (Tầng Services)
 * Quản lý logic tính toán tim tự hồi 20 phút và chuỗi ngày Streak theo múi giờ Việt Nam (UTC+7).
 * CẤM import từ Views hay Controllers.
 */

const STORAGE_KEY = 'sct2_gamification_state';
const LEGACY_HEARTS_KEY = 'sct2_user_hearts';
const REFILL_INTERVAL_MS = 20 * 60 * 1000; // 20 phút / 1 tim

export const GamificationService = {
    hearts: 5,
    maxHearts: 5,
    lastHeartLostTime: null,
    streak: 0,
    lastCompletedDate: null,
    REFILL_INTERVAL_MS,

    loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const state = JSON.parse(raw);
                this.hearts = typeof state.hearts === 'number' ? Math.max(0, Math.min(this.maxHearts, state.hearts)) : 5;
                this.lastHeartLostTime = state.lastHeartLostTime || null;
                this.streak = typeof state.streak === 'number' ? Math.max(0, state.streak) : 0;
                this.lastCompletedDate = state.lastCompletedDate || null;
                this.checkStreakExpiration();
                this.calcPassiveRegen();
                return this.getState();
            }
        } catch (e) {}

        // Fallback từ phiên bản cũ
        let oldHearts = 5;
        try {
            const h = localStorage.getItem(LEGACY_HEARTS_KEY);
            if (h !== null) oldHearts = Math.max(0, Math.min(this.maxHearts, parseInt(h, 10)));
        } catch (e) {}

        this.hearts = oldHearts;
        this.lastHeartLostTime = this.hearts < this.maxHearts ? Date.now() : null;
        this.streak = 1;
        this.lastCompletedDate = this.getTodayDateString();
        this.saveState();
        return this.getState();
    },

    saveState() {
        const data = {
            hearts: this.hearts,
            lastHeartLostTime: this.lastHeartLostTime,
            streak: this.streak,
            lastCompletedDate: this.lastCompletedDate,
            updatedAt: Date.now()
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
    },

    getState() {
        return {
            hearts: this.hearts,
            maxHearts: this.maxHearts,
            lastHeartLostTime: this.lastHeartLostTime,
            streak: this.streak,
            lastCompletedDate: this.lastCompletedDate
        };
    },

    calcPassiveRegen() {
        if (this.hearts >= this.maxHearts) {
            this.lastHeartLostTime = null;
            return;
        }
        if (!this.lastHeartLostTime) {
            this.lastHeartLostTime = Date.now();
            this.saveState();
            return;
        }

        const elapsed = Date.now() - this.lastHeartLostTime;
        if (elapsed >= this.REFILL_INTERVAL_MS) {
            const recovered = Math.floor(elapsed / this.REFILL_INTERVAL_MS);
            const remainder = elapsed % this.REFILL_INTERVAL_MS;
            this.hearts = Math.min(this.maxHearts, this.hearts + recovered);
            if (this.hearts >= this.maxHearts) {
                this.lastHeartLostTime = null;
            } else {
                this.lastHeartLostTime = Date.now() - remainder;
            }
            this.saveState();
        }
    },

    getCountdown() {
        if (this.hearts >= this.maxHearts || !this.lastHeartLostTime) {
            return null;
        }
        const elapsed = Date.now() - this.lastHeartLostTime;
        const remaining = Math.max(0, this.REFILL_INTERVAL_MS - (elapsed % this.REFILL_INTERVAL_MS));
        const totalSec = Math.floor(remaining / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    },

    consumeHeart() {
        if (this.hearts > 0) {
            this.hearts -= 1;
            if (!this.lastHeartLostTime) {
                this.lastHeartLostTime = Date.now();
            }
            this.saveState();
        }
        return this.hearts;
    },

    refillHearts() {
        this.hearts = this.maxHearts;
        this.lastHeartLostTime = null;
        this.saveState();
        return this.hearts;
    },

    getTodayDateString() {
        const now = new Date();
        const vnTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60 * 1000);
        const y = vnTime.getFullYear();
        const m = String(vnTime.getMonth() + 1).padStart(2, '0');
        const d = String(vnTime.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    getDaysDifference(dateStr1, dateStr2) {
        if (!dateStr1 || !dateStr2) return 999;
        const d1 = new Date(dateStr1);
        const d2 = new Date(dateStr2);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    },

    checkStreakExpiration() {
        if (!this.lastCompletedDate) return;
        const today = this.getTodayDateString();
        const diff = this.getDaysDifference(this.lastCompletedDate, today);
        if (diff > 1) {
            this.streak = 0;
            this.saveState();
        }
    },

    recordLessonCompletionStreak() {
        const today = this.getTodayDateString();
        let streakResult = {
            streak: this.streak,
            action: 'unchanged' // 'first_today' | 'increment' | 'maintained' | 'reset'
        };

        if (!this.lastCompletedDate) {
            this.streak = 1;
            this.lastCompletedDate = today;
            streakResult = { streak: this.streak, action: 'first_today' };
        } else {
            const diff = this.getDaysDifference(this.lastCompletedDate, today);
            if (diff === 0) {
                streakResult = { streak: this.streak, action: 'maintained' };
            } else if (diff === 1) {
                this.streak += 1;
                this.lastCompletedDate = today;
                streakResult = { streak: this.streak, action: 'increment' };
            } else {
                this.streak = 1;
                this.lastCompletedDate = today;
                streakResult = { streak: this.streak, action: 'reset' };
            }
        }

        this.saveState();
        return streakResult;
    }
};

if (typeof window !== 'undefined') {
    window.GamificationService = GamificationService;
}

