/**
 * QUIZ VIEW
 * Chịu trách nhiệm render không gian làm bài: #p-slot, khay thẻ từ, chế độ gõ phím, diff highlight
 */

import { AudioService } from '../services/audio-service.js';

export const QuizView = {
    renderWorkspace(mode, q, slots, userTxt, callbacks) {
        const ws = document.getElementById('interactive-workspace');
        if (!ws) return;
        ws.innerHTML = '';
        if (mode === 'parsing') {
            this.renderParse(ws, q, slots, callbacks);
        } else {
            this.renderTyping(ws, q, userTxt, callbacks);
        }
    },

    renderParse(ws, q, slots, callbacks) {
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

        const tilesToRender = q.displayTiles || q.tiles || [];

        tilesToRender.forEach(t => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = "btn-press px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-base shadow-xs active:scale-95 transition-transform flex items-center justify-center cursor-pointer";
            b.innerHTML = `<span class="chinese-text text-lg sm:text-xl font-bold leading-tight select-none">${t.text}</span>`;
            b.dataset.id = t.id;
            b.onclick = () => {
                callbacks.onTileClick(t.id);
            };
            pool.appendChild(b);
        });

        ws.appendChild(slot);
        ws.appendChild(pool);

        // Khôi phục các slot đã chọn trước đó (nếu có)
        if (slots && slots.length > 0) {
            slots.forEach(id => {
                const t = (q.tiles || []).find(x => x.id === id);
                if (!t) return;
                pool.querySelector(`[data-id="${id}"]`)?.classList.add('opacity-20', 'pointer-events-none');
                const b = document.createElement('button');
                b.type = 'button';
                b.className = "px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-500 dark:border-emerald-400 text-slate-800 dark:text-slate-100 text-base shadow-xs flex items-center justify-center active:scale-95 transition-transform cursor-pointer";
                b.innerHTML = `<span class="chinese-text text-lg sm:text-xl font-bold leading-tight select-none">${t.text}</span>`;
                b.dataset.pid = id;
                b.onclick = () => callbacks.onSlotClick(id);
                slot.appendChild(b);
            });
            tip.style.display = 'none';
        }
    },

    updateSlotUI(slots, q, callbacks) {
        const slotEl = document.getElementById('p-slot');
        const poolEl = document.getElementById('p-pool');
        if (!slotEl || !poolEl) return;

        // Xóa các nút slot cũ
        slotEl.querySelectorAll('button[data-pid]').forEach(btn => btn.remove());
        // Reset trạng thái mờ của pool
        poolEl.querySelectorAll('button[data-id]').forEach(btn => {
            btn.classList.remove('opacity-20', 'pointer-events-none');
        });

        slots.forEach(id => {
            poolEl.querySelector(`[data-id="${id}"]`)?.classList.add('opacity-20', 'pointer-events-none');
            const t = (q.tiles || []).find(x => x.id === id);
            if (!t) return;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = "px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-500 dark:border-emerald-400 text-slate-800 dark:text-slate-100 text-base shadow-xs flex items-center justify-center active:scale-95 transition-transform cursor-pointer";
            b.innerHTML = `<span class="chinese-text text-lg sm:text-xl font-bold leading-tight select-none">${t.text}</span>`;
            b.dataset.pid = id;
            b.onclick = () => callbacks.onSlotClick(id);
            slotEl.appendChild(b);
        });

        const tip = document.getElementById('p-tip');
        if (tip) tip.style.display = slots.length ? 'none' : 'inline-block';
    },

    renderTyping(ws, q, userTxt, callbacks) {
        const container = document.createElement('div');
        container.className = "w-full flex flex-col space-y-2 mb-3";

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
                callbacks.onInputChange(ta.value);
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
                callbacks.onInputChange('');
                ta.focus();
            }
        };

        actions.appendChild(btnBackspace);
        actions.appendChild(btnClear);
        toolbar.appendChild(actions);
        container.appendChild(toolbar);

        const ta = document.createElement('textarea');
        ta.id = 'typing-input-area';
        ta.rows = 2;
        ta.className = "w-full p-3.5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xl chinese-text resize-none focus:outline-none focus:border-emerald-500 shadow-xs";
        ta.placeholder = "Gõ phiên âm Pinyin hoặc chạm vào các từ bên dưới...";
        ta.value = userTxt || '';
        ta.spellcheck = false;

        const updateTyping = () => {
            callbacks.onInputChange(ta.value);
        };

        ta.oninput = updateTyping;
        ta.onchange = updateTyping;
        ta.addEventListener('compositionend', updateTyping);
        ta.addEventListener('keyup', updateTyping);
        ta.addEventListener('paste', () => setTimeout(updateTyping, 20));

        container.appendChild(ta);

        const poolContainer = document.createElement('div');
        poolContainer.className = "space-y-1.5 pt-1";

        const poolLabel = document.createElement('span');
        poolLabel.className = "text-[11px] font-bold text-slate-400 block";
        poolLabel.textContent = "Chạm từ để chèn vào vị trí đang gõ:";
        poolContainer.appendChild(poolLabel);

        const pool = document.createElement('div');
        pool.className = "flex flex-wrap gap-2";

        const tilesToUse = q.displayTiles || q.tiles || [];
        const words = tilesToUse.map(t => t.text).filter(Boolean);
        words.forEach(w => {
            const b = document.createElement('button');
            b.className = "btn-press px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 chinese-text text-base font-bold shadow-xs hover:border-emerald-400 active:scale-95";
            b.textContent = w;
            b.onclick = () => {
                AudioService.speak(w, 0.98);
                const startPos = ta.selectionStart || ta.value.length;
                const endPos = ta.selectionEnd || ta.value.length;
                ta.value = ta.value.substring(0, startPos) + w + ta.value.substring(endPos);
                ta.selectionStart = ta.selectionEnd = startPos + w.length;
                callbacks.onInputChange(ta.value);
                ta.focus();
            };
            pool.appendChild(b);
        });

        poolContainer.appendChild(pool);
        container.appendChild(poolContainer);
        ws.appendChild(container);
        setTimeout(() => ta.focus(), 60);
    },

    highlightSuccess() {
        const slotEl = document.getElementById('p-slot');
        if (!slotEl) return;
        slotEl.querySelectorAll('button[data-pid]').forEach(btn => {
            btn.className = "px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-200 text-base shadow-xs flex items-center justify-center";
        });
    },

    highlightDiff(slots, targetOrder = []) {
        const slotEl = document.getElementById('p-slot');
        if (!slotEl) return;
        slots.forEach((slotId, idx) => {
            const btn = slotEl.querySelector(`[data-pid="${slotId}"]`);
            if (!btn) return;
            const isCorrectPos = (slotId === targetOrder[idx]);
            if (isCorrectPos) {
                btn.className = "px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-400 text-emerald-800 dark:text-emerald-200 text-base shadow-2xs flex items-center justify-center";
            } else {
                btn.className = "px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-800 dark:text-rose-200 text-base shadow-xs flex items-center justify-center animate-pulse";
            }
        });
    },

    showBanner(good, title, body) {
        const b = document.getElementById('evaluation-banner');
        if (!b) return;
        b.classList.remove('hidden');

        b.className = "rounded-2xl p-4 border text-sm leading-relaxed " +
            (good
                ? "bg-emerald-100 border-emerald-300 text-emerald-950 dark:bg-emerald-950/80 dark:border-emerald-700 dark:text-emerald-100"
                : "bg-rose-100 border-rose-300 text-rose-950 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-100");

        const iconEl = document.getElementById('eval-icon');
        if (iconEl) iconEl.textContent = good ? "🎉" : "⚠️";

        const titleEl = document.getElementById('eval-status-title');
        if (titleEl) {
            titleEl.textContent = title;
            titleEl.className = "font-black text-base sm:text-lg " +
                (good ? "text-emerald-900 dark:text-emerald-200" : "text-rose-900 dark:text-rose-200");
        }

        const badgeEl = document.getElementById('eval-score-badge');
        if (badgeEl) {
            badgeEl.textContent = good ? "ĐẠT YÊU CẦU" : "CHƯA ĐẠT";
            badgeEl.className = "text-xs sm:text-sm font-black px-3 py-0.5 rounded-full " +
                (good
                    ? "bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                    : "bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200");
        }

        const bodyEl = document.getElementById('eval-message-body');
        if (bodyEl) {
            bodyEl.innerHTML = body;
            bodyEl.className = "mt-2 text-sm sm:text-base font-medium space-y-1.5 text-slate-800 dark:text-slate-100";
        }
    },

    hideBanner() {
        document.getElementById('evaluation-banner')?.classList.add('hidden');
    }
};

if (typeof window !== 'undefined') {
    window.QuizView = QuizView;
}
