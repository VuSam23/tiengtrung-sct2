/**
 * QUIZ CONTROLLER
 * Điều phối luồng làm bài: xáo trộn thẻ, chọn thẻ/gõ phím, nộp bài, chấm điểm & diff highlight
 */

import { AudioService } from '../services/audio-service.js';
import { EvaluatorService } from '../services/evaluator-service.js';
import { QuizView } from '../views/quiz-view.js';
import { ModalView } from '../views/modal-view.js';

export const QuizController = {
    app: null,
    isValidating: false,

    init(appInstance) {
        this.app = appInstance;
    },

    shuffleTiles(tiles, targetOrder = []) {
        if (!Array.isArray(tiles) || tiles.length <= 1) return tiles ? [...tiles] : [];
        const arr = [...tiles];

        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }

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

    nextQuestion() {
        const app = this.app;
        if (!app) return;

        app.refreshHearts();
        const isTester = (typeof NavigationHub !== 'undefined') && NavigationHub.testerMode;
        if (app.hearts <= 0 && !isTester) {
            app.showNoHeartsModal();
            return;
        }

        if (app.queue.length === 0) {
            return app.navController ? app.navController.showVictory() : app.showVictory();
        }

        app.activeQ = app.queue[0];
        app.slots = [];
        app.userTxt = '';
        app.checked = false;

        app.activeQ.displayTiles = this.shuffleTiles(app.activeQ.tiles || [], app.activeQ.targetOrder || []);

        this.renderQuestion();
    },

    renderQuestion() {
        const app = this.app;
        if (!app || app.total === 0) return;

        app.navController?.updateProgressBar();

        const theme = (typeof LevelManager !== 'undefined' && LevelManager.getTheme) ? LevelManager.getTheme() : null;
        document.getElementById('victory-card')?.classList.add('hidden');
        document.getElementById('practice-card')?.classList.remove('hidden');
        document.getElementById('bottom-action-drawer')?.classList.remove('hidden');
        QuizView.hideBanner();
        document.getElementById('standard-answer-box')?.classList.add('hidden');

        const btn = document.getElementById('btn-submit-action');
        if (btn) {
            btn.textContent = "KIỂM TRA DỊCH";
            btn.disabled = true;
            const submitColor = theme ? theme.cardActiveBtn : "bg-emerald-600 hover:bg-emerald-700 text-white";
            btn.className = `min-w-[180px] py-3.5 px-6 ${submitColor} font-black rounded-xl text-sm shadow-md btn-press tracking-wide disabled:opacity-40 disabled:cursor-not-allowed`;
        }
        document.getElementById('btn-pass-action')?.classList.remove('hidden');

        const q = app.activeQ;
        app.updateModeUI();
        ModalView.resetAnatomyCard();

        const promptInstruction = document.getElementById('prompt-instruction');
        if (promptInstruction) promptInstruction.textContent = q.title || "Luyện dịch câu sau:";
        const sourceVi = document.getElementById('source-vi-text');
        if (sourceVi) sourceVi.textContent = q.vi || "";
        const sourcePinyin = document.getElementById('anatomy-pinyin') || document.getElementById('source-pinyin-display');
        if (sourcePinyin) sourcePinyin.textContent = q.pinyin ? `🗣️ ${q.pinyin}` : "";
        app.applyPinyinVisibility();
        const sourceGrammar = document.getElementById('anatomy-grammar') || document.getElementById('source-core-grammar');
        if (sourceGrammar) sourceGrammar.textContent = q.grammarPoint ? `Ngữ pháp: ${q.grammarPoint}` : "";

        document.getElementById('realtime-trap-alert')?.classList.add('hidden');
        app.renderQuickNotesButton();

        const chips = document.getElementById('anatomy-tokens-container') || document.getElementById('source-chips-container');
        if (chips) {
            chips.innerHTML = '';
            (q.tokens || []).forEach(t => {
                const b = document.createElement('button');
                b.className = "clickable-chip px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold transition active:scale-95 shadow-xs";
                b.innerHTML = `${t.text} <span class="text-xs text-emerald-500 font-bold">ℹ️</span>`;
                b.onclick = (e) => {
                    e.stopPropagation();
                    AudioService.speak(t.hz || t.text, 0.85);
                    app.showHint(t);
                };
                chips.appendChild(b);
            });
        }

        const toggleAnatomyBtn = document.getElementById('anatomy-toggle-btn') || document.getElementById('btn-toggle-anatomy');
        if (toggleAnatomyBtn) {
            toggleAnatomyBtn.onclick = (e) => {
                if (e.target.closest('button')) return;
                ModalView.toggleAnatomy();
            };
        }

        QuizView.renderWorkspace(app.mode, q, app.slots, app.userTxt, {
            onTileClick: (id) => this.handleTileClick(id),
            onSlotClick: (id) => this.handleSlotClick(id),
            onInputChange: (val) => this.handleInputChange(val)
        });
    },

    handleTileClick(id) {
        const app = this.app;
        if (app.checked) return;
        AudioService.play('click');
        if (!app.slots.includes(id)) {
            app.slots.push(id);
            QuizView.updateSlotUI(app.slots, app.activeQ, {
                onSlotClick: (slotId) => this.handleSlotClick(slotId)
            });
            const btn = document.getElementById('btn-submit-action');
            if (btn) btn.disabled = app.slots.length === 0;
        }
    },

    handleSlotClick(id) {
        const app = this.app;
        if (app.checked) return;
        AudioService.play('click');
        app.slots = app.slots.filter(x => x !== id);
        QuizView.updateSlotUI(app.slots, app.activeQ, {
            onSlotClick: (slotId) => this.handleSlotClick(slotId)
        });
        const btn = document.getElementById('btn-submit-action');
        if (btn) btn.disabled = app.slots.length === 0;
    },

    handleInputChange(val) {
        const app = this.app;
        app.userTxt = (val || '').trim();
        const btn = document.getElementById('btn-submit-action');
        if (btn && !app.checked) {
            btn.disabled = !app.userTxt;
        }
    },

    validate() {
        const app = this.app;
        if (app.checked) return this.nextQuestion();
        if (this.isValidating) return;

        const q = app.activeQ;
        if (!q) return;

        let userString = '';
        if (app.mode === 'parsing') {
            userString = app.slots.map(id => {
                const t = (q.tiles || []).find(x => x.id === id);
                return t ? t.text : '';
            }).join('');
        } else {
            const ta = document.getElementById('typing-input-area');
            if (ta) app.userTxt = ta.value.trim();
            userString = app.userTxt;
        }

        if (!userString || !userString.trim()) return;

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
        const app = this.app;
        const evalResult = EvaluatorService.evaluateAnswer(userString, q);
        const pass = evalResult.pass;
        let fb = evalResult.msg;
        const title = evalResult.title;

        const qid = q.id || `q-${app.queue.length}`;
        const isFirstTry = !app.attemptedQuestions[qid];
        app.attemptedQuestions[qid] = true;

        document.getElementById('realtime-trap-alert')?.classList.add('hidden');
        const slot = document.getElementById('p-slot');
        if (slot) slot.classList.remove('border-amber-400', 'bg-amber-50/50');

        if (pass) {
            if (isFirstTry) {
                app.firstTryCorrect++;
            }
            AudioService.play('ding');
            if (app.settings.autoAudio) {
                setTimeout(() => {
                    if (typeof AudioManager !== 'undefined') {
                        AudioManager.playSentence(q, app.settings.voiceSpeed);
                    } else {
                        AudioService.speak(q.standardTrans || q.zh, app.settings.voiceSpeed);
                    }
                }, 300);
            }

            if (app.mode === 'parsing') {
                QuizView.highlightSuccess();
            }

            app.queue.shift();
            QuizView.showBanner(true, title, fb);
        } else {
            AudioService.play('buzz');
            app.decreaseHeart();
            app.queue.push(app.queue.shift());

            if (app.mode === 'parsing') {
                QuizView.highlightDiff(app.slots, q.targetOrder || []);
            }

            if (evalResult.trapPattern) {
                fb = `<div class="font-bold text-rose-800 dark:text-rose-200 mb-1 flex items-center gap-1.5 flex-wrap"><span>Phát hiện bẫy:</span><span class="chinese-text font-black px-2 py-0.5 rounded bg-rose-200/90 text-rose-900 dark:bg-rose-900/80 dark:text-rose-200 border border-rose-300 dark:border-rose-700">${evalResult.trapPattern}</span></div><div>${fb}</div>`;
            }
            QuizView.showBanner(false, title, fb);
        }

        app.navController?.updateProgressBar();
        app.checked = true;

        document.getElementById('btn-pass-action')?.classList.add('hidden');

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

        const stdBox = document.getElementById('standard-answer-box');
        if (stdBox) stdBox.classList.add('hidden');
    },

    passQuestion() {
        const app = this.app;
        if (!app || !app.activeQ) return;

        const qid = app.activeQ.id || `q-${app.queue.length}`;
        app.attemptedQuestions[qid] = true;

        AudioService.play('buzz');
        app.decreaseHeart();
        app.queue.push(app.queue.shift());
        app.checked = true;

        document.getElementById('btn-pass-action')?.classList.add('hidden');

        const btnSubmit = document.getElementById('btn-submit-action');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = "TIẾP TỤC (Enter)";
            btnSubmit.className = "min-w-[180px] py-3.5 px-6 bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 text-white dark:text-slate-950 font-black rounded-xl text-sm shadow-md btn-press tracking-wide cursor-pointer";
        }

        QuizView.showBanner(false, "Cần chú ý / Đã bỏ qua câu này", "Đã xếp câu này xuống cuối hàng chờ để bạn luyện tập lại sau.");
        app.navController?.updateProgressBar();

        const stdBox = document.getElementById('standard-answer-box');
        if (stdBox) stdBox.classList.add('hidden');
    }
};

if (typeof window !== 'undefined') {
    window.QuizController = QuizController;
}
