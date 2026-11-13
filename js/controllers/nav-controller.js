/**
 * NAV CONTROLLER
 * Điều phối tiến độ, thanh progress, chuyển bài/chuyển câu, tính sao và màn hình kết thúc
 */

import { LessonModel } from '../models/lesson-model.js';
import { StateModel } from '../models/state-model.js';
import { GamificationService } from '../services/gamification-service.js';
import { ModalView } from '../views/modal-view.js';
import { ToastView } from '../views/toast-view.js';

export const NavController = {
    app: null,

    init(appInstance) {
        this.app = appInstance;
    },

    updateProgressBar() {
        const app = this.app;
        if (!app || app.total === 0) return;
        const done = Math.max(0, app.total - app.queue.length);
        const retryCount = app.queue.filter(item => item && item.id && app.attemptedQuestions[item.id]).length;
        const donePct = (done / app.total) * 100;
        const retryPct = (retryCount / app.total) * 100;
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
                textEl.innerHTML = `<span class="text-emerald-600 dark:text-emerald-400 font-black">${done}</span>/${app.total} <span class="text-amber-500 font-bold" title="${retryCount} câu trong hàng chờ làm lại">(+${retryCount} ⏳)</span>`;
            } else {
                textEl.textContent = `${done}/${app.total}`;
            }
        }
    },

    buildPicker() {
        const app = this.app;
        const sel = document.getElementById('lesson-picker');
        if (!sel || !app) return;
        sel.innerHTML = '';

        const manifest = window.LESSON_MANIFEST || [];
        const manifestKeys = new Set(manifest.map(m => m.id));

        manifest.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.title;
            if (m.id === app.curLesson) opt.selected = true;
            sel.appendChild(opt);
        });

        Object.keys(app.data || {}).forEach(k => {
            if (!manifestKeys.has(k)) {
                const opt = document.createElement('option');
                opt.value = k;
                opt.textContent = app.data[k].title || k;
                if (k === app.curLesson) opt.selected = true;
                sel.appendChild(opt);
            }
        });

        sel.onchange = (e) => this.start(e.target.value);
    },

    async start(lessonKey) {
        const app = this.app;
        if (!app) return;

        const loader = document.getElementById('lesson-loading-overlay');
        if (loader) loader.classList.remove('hidden');

        try {
            app.curLesson = lessonKey;

            const manifest = window.LESSON_MANIFEST || [];
            const item = manifest.find(m => m.id === lessonKey);
            const curTitle = app.data[lessonKey]?.title || (item ? item.title : lessonKey);
            const titleEl = document.getElementById('header-lesson-title');
            if (titleEl) titleEl.textContent = curTitle;
            const picker = document.getElementById('lesson-picker');
            if (picker) picker.value = lessonKey;

            if (item && item.file) {
                const fetched = await LessonModel.fetchLesson(item);
                if (fetched && fetched.lessons && fetched.lessons.length > 0) {
                    app.data[lessonKey] = fetched;
                    app.saveData();
                    if (titleEl && fetched.title) titleEl.textContent = fetched.title;
                }
            }

            app.queue = app.data[lessonKey]?.lessons ? [...app.data[lessonKey].lessons] : [];
            app.total = app.queue.length;
            app.firstTryCorrect = 0;
            app.attemptedQuestions = {};

            app.quizController?.nextQuestion();

            const currentQuickNotes = app.data[lessonKey]?.quickNotes || null;
            if (currentQuickNotes) {
                ModalView.openLessonBriefing(app.data[lessonKey], true);
            }
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    },

    advanceLesson() {
        const app = this.app;
        if (!app) return;
        const manifest = window.LESSON_MANIFEST || [];
        const keys = manifest.length > 0 ? manifest.map(m => m.id) : Object.keys(app.data);
        const curIdx = keys.indexOf(app.curLesson);
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
    },

    showVictory() {
        const app = this.app;
        if (!app) return;

        document.getElementById('practice-card')?.classList.add('hidden');
        document.getElementById('bottom-action-drawer')?.classList.add('hidden');
        document.getElementById('victory-card')?.classList.remove('hidden');

        const totalQ = app.total || 1;
        const accuracy = Math.round((app.firstTryCorrect / totalQ) * 100);
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

        if (typeof NavigationHub !== 'undefined') {
            NavigationHub.markCompleted(app.curLesson, totalQ, stars, accuracy);
        }

        const res = GamificationService.recordLessonCompletionStreak();
        app.streak = res.streak;
        app.lastCompletedDate = GamificationService.lastCompletedDate;
        app.updateStreakUI(true);

        const toastMsg = (res.action === 'first_today' || res.action === 'increment')
            ? `Chuỗi Streak: ${app.streak} ngày liên tiếp! 🔥`
            : `Bắt đầu chuỗi Streak mới: 1 ngày! 🔥`;
        ToastView.show({
            title: toastMsg,
            message: "Hôm nay bạn đã hoàn thành bài để giữ lửa thành công.",
            icon: "🔥",
            type: "streak",
            duration: 3500
        });

        const theme = (typeof LevelManager !== 'undefined' && LevelManager.getTheme) ? LevelManager.getTheme() : null;
        const advBtn = document.getElementById('btn-advance-lesson');
        if (advBtn && theme) {
            advBtn.className = `px-6 py-3.5 ${theme.cardActiveBtn} font-black rounded-xl transition text-sm shadow-soft btn-press`;
        }
    }
};

if (typeof window !== 'undefined') {
    window.NavController = NavController;
}
