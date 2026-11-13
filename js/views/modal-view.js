/**
 * MODAL VIEW (Tầng Views)
 * Chuyên trách hiển thị các Modal & Accordion: Vocab Inspector, Question Hint, Lesson Briefing, Anatomy
 */

import { AudioService } from '../services/audio-service.js';

export class ModalView {
    // 1. VOCAB INSPECTOR (Tra chiết tự từ vựng & âm vị học)
    static openVocabInspector(token, activeQ = null) {
        if (!token) return;

        const hanzi = token.hz || token.text || '';
        const pinyin = token.py || '';
        const hanViet = (token.hv && token.hv !== '---') ? `HV: ${token.hv.trim()}` : '';
        const role = token.grammarRole || token.role || token.pos || 'Từ vựng';
        const meaning = token.vi || token.vn || token.meaning || token.mean || hanzi;

        const hanziEl = document.getElementById('insp-hanzi');
        const pinyinEl = document.getElementById('insp-pinyin');
        const hvEl = document.getElementById('insp-hv-clean');
        const dotSep = document.getElementById('insp-dot-sep');
        const roleEl = document.getElementById('insp-role');
        const meaningEl = document.getElementById('insp-meaning');
        const radBox = document.getElementById('insp-radicals');
        const trapBox = document.getElementById('insp-trap-box');
        const trapText = document.getElementById('insp-trap-text');
        const overlay = document.getElementById('vocab-inspector-overlay');

        if (hanziEl) hanziEl.textContent = hanzi;
        if (pinyinEl) pinyinEl.textContent = pinyin;
        if (hvEl) {
            if (hanViet) {
                hvEl.textContent = hanViet;
                hvEl.classList.remove('hidden');
                if (dotSep) dotSep.classList.remove('hidden');
            } else {
                hvEl.classList.add('hidden');
                if (dotSep) dotSep.classList.add('hidden');
            }
        }
        if (roleEl) {
            const cleanRole = (role && role.length > 25) ? role.split('+')[0].trim() : (role || 'Từ vựng');
            roleEl.textContent = cleanRole;
        }
        if (meaningEl) meaningEl.textContent = meaning;

        if (radBox) {
            radBox.innerHTML = '';
            let radicalsText = token.radicals || "";
            if (!radicalsText && activeQ && Array.isArray(activeQ.radicals)) {
                const matched = activeQ.radicals.filter(r => hanzi.includes(r.char));
                if (matched.length > 0) {
                    radicalsText = matched.map(m => `${m.char} = ${m.radical}${m.explain ? ' (' + m.explain + ')' : ''}`).join('; ');
                }
            }

            if (radicalsText) {
                if (typeof radicalsText === 'string') {
                    const items = radicalsText.split(/[;\n]/).map(r => r.trim()).filter(Boolean);
                    items.forEach((item) => {
                        const div = document.createElement('div');
                        div.className = 'flex items-center gap-2';
                        div.innerHTML = `<span class="text-emerald-600 dark:text-emerald-400 font-bold">•</span> <span class="font-medium text-slate-800 dark:text-slate-200">${item}</span>`;
                        radBox.appendChild(div);
                    });
                } else {
                    radBox.textContent = JSON.stringify(radicalsText);
                }
            } else {
                radBox.innerHTML = '<span class="text-slate-400 dark:text-slate-500 italic">Chưa có phân tích bộ thủ cho cụm này.</span>';
            }
        }

        if (token.trap) {
            if (trapBox) trapBox.classList.remove('hidden');
            if (trapText) trapText.textContent = token.trap;
        } else {
            if (trapBox) trapBox.classList.add('hidden');
        }

        if (overlay) {
            overlay.classList.add('active');
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    static closeVocabInspector() {
        const overlay = document.getElementById('vocab-inspector-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    // 2. ACCORDION ANATOMY (Khối gợi ý giải phẫu cú pháp & từ vựng)
    static toggleAnatomy(forceOpen = null) {
        const toggleBtn = document.getElementById('anatomy-toggle-btn') || document.getElementById('btn-toggle-anatomy');
        const contentBox = document.getElementById('anatomy-content') || document.getElementById('anatomy-content-drawer');
        const arrowIcon = document.getElementById('anatomy-arrow') || document.getElementById('anatomy-toggle-arrow');
        if (!contentBox) return;

        const isCurrentlyHidden = contentBox.classList.contains('hidden');
        const shouldOpen = (forceOpen !== null) ? !!forceOpen : isCurrentlyHidden;

        const badge = toggleBtn ? (toggleBtn.querySelector('.bg-amber-200, #anatomy-badge, .anatomy-badge') || toggleBtn.querySelector('.anatomy-badge')) : null;

        if (shouldOpen) {
            contentBox.classList.remove('hidden');
            if (arrowIcon) {
                arrowIcon.style.transform = 'rotate(180deg)';
            }
            if (badge) badge.textContent = 'Thu gọn';
        } else {
            contentBox.classList.add('hidden');
            if (arrowIcon) {
                arrowIcon.style.transform = 'rotate(0deg)';
            }
            if (badge) badge.textContent = 'Bấm để mở';
        }
    }

    static resetAnatomyCard() {
        this.toggleAnatomy(false);
    }

    // 3. QUESTION HINT MODAL (Mẹo & Phân tích ngữ pháp câu hỏi)
    static openQuestionHint(activeQ) {
        if (!activeQ) return;
        const body = document.getElementById('question-hint-body');
        if (!body) return;
        body.innerHTML = '';

        const subtitle = document.getElementById('question-hint-subtitle');
        if (subtitle) {
            subtitle.textContent = activeQ.vi ? `Đề bài: "${activeQ.vi}"` : (activeQ.title || "Gợi ý câu hỏi");
        }

        if (activeQ.grammarPoint) {
            const block = document.createElement('div');
            block.className = "p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-1.5";
            block.innerHTML = `
                <div class="font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-sm sm:text-base">
                    <span>📌</span> CẤU TRÚC NGỮ PHÁP CÂU NÀY
                </div>
                <div class="text-slate-800 dark:text-slate-200 font-semibold text-sm sm:text-base leading-relaxed">${activeQ.grammarPoint}</div>
            `;
            body.appendChild(block);
        }

        if (activeQ.explanation || activeQ.notes) {
            const block = document.createElement('div');
            block.className = "p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-1.5";
            block.innerHTML = `
                <div class="font-black text-amber-800 dark:text-amber-300 flex items-center gap-2 text-sm sm:text-base">
                    <span>💡</span> HƯỚNG DẪN DỊCH & LƯU Ý
                </div>
                <div class="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed font-medium">${activeQ.explanation || activeQ.notes}</div>
            `;
            body.appendChild(block);
        }

        if (Array.isArray(activeQ.tokens) && activeQ.tokens.length > 0) {
            const block = document.createElement('div');
            block.className = "p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2";
            const tokenList = activeQ.tokens.map(t => {
                const viMeaning = t.vi || t.vn || t.meaning || t.mean || '';
                return `
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <b class="text-emerald-700 dark:text-emerald-400 chinese-text text-base sm:text-lg font-bold">${t.hz || t.text}</b>
                    ${t.py ? `<span class="text-slate-500 dark:text-slate-400 font-mono text-xs sm:text-sm font-semibold">(${t.py})</span>` : ''}
                    ${viMeaning ? `: <span class="text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium">${viMeaning}</span>` : ''}
                </span>
            `;
            }).join('');
            block.innerHTML = `
                <div class="font-black text-slate-700 dark:text-slate-300 flex items-center gap-2 text-sm sm:text-base">
                    <span>📖</span> TỪ VỰNG THEN CHỐT TRONG CÂU
                </div>
                <div class="flex flex-wrap gap-2">${tokenList}</div>
            `;
            body.appendChild(block);
        }

        const dialog = document.getElementById('question-hint-dialog');
        if (dialog) {
            dialog.classList.remove('hidden');
            dialog.style.display = 'flex';
        }
    }

    static closeQuestionHint() {
        const dialog = document.getElementById('question-hint-dialog');
        if (dialog) {
            dialog.classList.add('hidden');
            dialog.style.display = 'none';
        }
    }

    // 4. LESSON BRIEFING MODAL (Tóm tắt trọng tâm bài học)
    static openLessonBriefing(lessonData, isPreLesson = false) {
        if (!lessonData || !lessonData.quickNotes) return;
        const dialog = document.getElementById('quick-notes-dialog');
        const ackBtn = document.getElementById('btn-ack-quick-notes');
        const badgeEl = document.getElementById('qn-pre-badge');

        if (dialog) {
            dialog.className = "fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4";
        }

        if (isPreLesson) {
            if (badgeEl) {
                badgeEl.textContent = "🎯 TRỌNG TÂM BÀI HỌC • NẮM VỮNG TRƯỚC KHI BẮT ĐẦU";
                badgeEl.classList.remove('hidden');
            }
            if (ackBtn) ackBtn.textContent = "BẮT ĐẦU LUYỆN DỊCH ➔";
        } else {
            if (badgeEl) badgeEl.classList.add('hidden');
            if (ackBtn) ackBtn.textContent = "QUAY LẠI LÀM BÀI ➔";
        }

        if (dialog) {
            dialog.classList.remove('hidden');
            dialog.style.display = 'flex';
        }
    }

    static closeLessonBriefing() {
        const dialog = document.getElementById('quick-notes-dialog');
        if (dialog) {
            dialog.classList.add('hidden');
            dialog.style.display = 'none';
        }
    }
}

// Cầu nối window tạm thời
if (typeof window !== 'undefined') {
    window.ModalView = ModalView;
}

