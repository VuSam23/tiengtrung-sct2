/**
 * NAVIGATION & DASHBOARD HUB
 * Quản lý Dashboard lộ trình 2 tầng và điều hướng bài học HSK
 */

// Chế độ Debug: chỉ bật khi URL có ?debug=1 (ẩn với người dùng thường)
const _isDebugMode = new URLSearchParams(location.search).has('debug');

const NavigationHub = {
    unlockedLessons: ['bai1'], // Mặc định mở bài 1
    completedLessons: {},      // Lưu kết quả: { 'bai1': { stars: 3, done: 8, total: 8 } }
    testerMode: _isDebugMode,  // Mặc định OFF; bật bằng ?debug=1 hoặc 7-tap logo

    isLessonUnlocked(key) {
        return this.testerMode || this.unlockedLessons.includes(key);
    },

    init() {
        this.loadProgress();
        this.bindEvents();
        this._bindDebugTap(); // 7-tap logo để bật debug
    },

    // 7-tap vào logo để bật testerMode (easter egg cho admin)
    _bindDebugTap() {
        const badge = document.getElementById('brand-badge');
        if (!badge) return;
        let tapCount = 0, tapTimer;
        badge.addEventListener('click', () => {
            tapCount++;
            clearTimeout(tapTimer);
            tapTimer = setTimeout(() => { tapCount = 0; }, 1500);
            if (tapCount >= 7) {
                tapCount = 0;
                this.testerMode = !this.testerMode;
                const msg = this.testerMode
                    ? '🔓 Debug mode ON – Đã mở khóa toàn bộ bài'
                    : '🔒 Debug mode OFF – Chế độ bình thường';
                // Cập nhật UI nếu nút tester đang hiển thị
                const label = document.getElementById('tester-unlock-label');
                if (label) label.textContent = this.testerMode ? 'Tester: Đã Mở Khóa Tất Cả' : 'Tester: Chế Độ Thường';
                const settingTester = document.getElementById('setting-tester-mode');
                if (settingTester) settingTester.checked = this.testerMode;
                this.renderDashboardCards();
                if (window.App && App.showToast) App.showToast(msg, this.testerMode ? 'success' : 'info');
                else alert(msg);
            }
        });
    },

    getLevelKey(prefix) {
        const lvl = (typeof LevelManager !== 'undefined' && LevelManager.currentLevel) ? LevelManager.currentLevel : 'hsk1';
        return lvl === 'hsk1' ? prefix : `${prefix}_${lvl}`;
    },

    loadProgress() {
        const unlockKey = this.getLevelKey('sct2_unlocked');
        const doneKey = this.getLevelKey('sct2_completed');

        const savedUnlock = localStorage.getItem(unlockKey);
        if (savedUnlock) {
            try { this.unlockedLessons = JSON.parse(savedUnlock); } catch (e) {}
        } else {
            this.unlockedLessons = ['bai1'];
        }
        if (!Array.isArray(this.unlockedLessons) || this.unlockedLessons.length === 0) {
            this.unlockedLessons = ['bai1'];
        }

        const savedDone = localStorage.getItem(doneKey);
        if (savedDone) {
            try { this.completedLessons = JSON.parse(savedDone); } catch (e) {}
        } else {
            this.completedLessons = {};
        }
        if (!this.completedLessons || typeof this.completedLessons !== 'object') {
            this.completedLessons = {};
        }
    },

    saveProgress() {
        const unlockKey = this.getLevelKey('sct2_unlocked');
        const doneKey = this.getLevelKey('sct2_completed');
        try {
            localStorage.setItem(unlockKey, JSON.stringify(this.unlockedLessons));
            localStorage.setItem(doneKey, JSON.stringify(this.completedLessons));
        } catch (e) {}
    },

    bindEvents() {
        // Hiện UI debug nếu đang ở debug mode
        if (this.testerMode) {
            document.getElementById('btn-toggle-tester-unlock')?.classList.remove('hidden');
            document.getElementById('tester-mode-row')?.classList.remove('hidden');
        }

        // Nút quay về Dashboard từ phòng tập
        const backBtn = document.getElementById('btn-back-dashboard');
        if (backBtn) {
            backBtn.onclick = () => this.showDashboard();
        }

        // Logo click về Dashboard
        const brandBadge = document.getElementById('brand-badge');
        if (brandBadge) {
            brandBadge.onclick = () => this.showDashboard();
        }

        // Nút mở Modal chọn bài nhanh trên header
        const openModalBtn = document.getElementById('btn-open-lesson-modal');
        if (openModalBtn) {
            openModalBtn.onclick = () => this.openModal();
        }

        const closeModalBtn = document.getElementById('btn-close-modal');
        if (closeModalBtn) {
            closeModalBtn.onclick = () => this.closeModal();
        }

        // Đóng modal khi bấm ra ngoài nền mờ
        const modalEl = document.getElementById('lesson-modal');
        if (modalEl) {
            modalEl.onclick = (e) => {
                if (e.target === modalEl) this.closeModal();
            };
        }

        // Ô tìm kiếm bài học trong Modal
        const searchInput = document.getElementById('modal-search-input');
        if (searchInput) {
            searchInput.oninput = (e) => {
                this.renderModalGrid(e.target.value.toLowerCase().trim());
            };
        }

        // Nút ở màn hình chúc mừng
        const vDashBtn = document.getElementById('btn-victory-dashboard');
        if (vDashBtn) {
            vDashBtn.onclick = () => this.showDashboard();
        }

        // Nút bật/tắt chế độ tester mở khóa toàn bộ bài
        const testerBtn = document.getElementById('btn-toggle-tester-unlock');
        if (testerBtn) {
            testerBtn.onclick = () => {
                this.testerMode = !this.testerMode;
                const label = document.getElementById('tester-unlock-label');
                if (label) {
                    label.textContent = this.testerMode ? "Tester: Đã Mở Khóa Tất Cả" : "Tester: Chế Độ Thường";
                }
                const settingTester = document.getElementById('setting-tester-mode');
                if (settingTester) settingTester.checked = this.testerMode;
                testerBtn.className = "text-[11px] font-black px-2.5 py-1.5 rounded-xl transition active:scale-95 flex items-center gap-1.5 border cursor-pointer backdrop-blur-xs " +
                    (this.testerMode ? "bg-white/25 hover:bg-white/35 text-white border-white/30" : "bg-black/30 hover:bg-black/40 text-slate-300 border-white/10");
                this.renderDashboardCards();
            };
        }
    },

    // Hiển thị Dashboard Lộ Trình (Tầng 1)
    showDashboard() {
        document.getElementById('dashboard-view')?.classList.remove('hidden');
        document.getElementById('practice-view')?.classList.add('hidden');
        document.getElementById('bottom-action-drawer')?.classList.add('hidden');
        document.getElementById('session-progress-header')?.classList.add('hidden');
        document.getElementById('btn-back-dashboard')?.classList.add('hidden');

        this.renderDashboardCards();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // Chuyển sang Phòng Luyện Tập (Tầng 2)
    showPractice(lessonKey) {
        if (!this.isLessonUnlocked(lessonKey)) {
            alert('Bài học này đang bị khóa. Hãy hoàn thành các bài học trước để mở khóa nhé!');
            return;
        }

        document.getElementById('dashboard-view')?.classList.add('hidden');
        document.getElementById('practice-view')?.classList.remove('hidden');
        document.getElementById('bottom-action-drawer')?.classList.remove('hidden');
        document.getElementById('session-progress-header')?.classList.remove('hidden');
        document.getElementById('btn-back-dashboard')?.classList.remove('hidden');

        // Cập nhật tên bài trên Header
        const manifest = window.LESSON_MANIFEST || [];
        const item = manifest.find(m => m.id === lessonKey) || (App.data ? App.data[lessonKey] : null);
        const title = item ? (item.title || lessonKey) : lessonKey;
        const titleEl = document.getElementById('header-lesson-title');
        if (titleEl) titleEl.textContent = title;

        App.start(lessonKey);
    },

    getLessonKeys() {
        const manifest = window.LESSON_MANIFEST || [];
        const manifestKeys = manifest.map(m => m.id);
        const dataKeys = Object.keys(App.data || {});
        return Array.from(new Set([...manifestKeys, ...dataKeys]));
    },

    getStarString(stars) {
        const s = parseInt(stars, 10) || 1;
        if (s >= 3) return '⭐⭐⭐';
        if (s === 2) return '⭐⭐';
        if (s === 1) return '⭐';
        return '';
    },

    // Render danh sách thẻ trên Dashboard
    renderDashboardCards() {
        const container = document.getElementById('dashboard-lesson-list');
        if (!container) return;

        // Xóa skeleton placeholder (nếu có) và nội dung cũ
        const skeletonEl = document.getElementById('skeleton-cards');
        if (skeletonEl) skeletonEl.remove();
        container.innerHTML = '';

        const currentLvl = (typeof LevelManager !== 'undefined' && LevelManager.currentLevel) ? LevelManager.currentLevel : 'hsk1';
        const listTitleEl = document.getElementById('lesson-list-level-title');
        if (listTitleEl) {
            listTitleEl.textContent = `Danh Sách Bài Học ${currentLvl.toUpperCase()}`;
        }

        const manifest = window.LESSON_MANIFEST || [];
        const keys = this.getLessonKeys();

        if (keys.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <span class="text-3xl block mb-2">📚</span>
                    <h4 class="font-black text-slate-800 dark:text-slate-200">Bài học cấp độ ${currentLvl.toUpperCase()} đang được cập nhật</h4>
                    <p class="text-xs text-slate-400 mt-1">Vui lòng quay lại sau hoặc chọn cấp độ khác để tiếp tục học.</p>
                </div>
            `;
            const summaryEl = document.getElementById('dash-progress-summary');
            if (summaryEl) summaryEl.textContent = `0/0 bài hoàn thành`;
            return;
        }

        let totalStars = 0;
        let completedCount = 0;

        keys.forEach((key, idx) => {
            const mItem = manifest.find(m => m.id === key);
            const appItem = App.data ? App.data[key] : null;
            const title = (mItem && mItem.title) || (appItem && appItem.title) || `Bài ${idx + 1}`;
            const questions = (appItem && appItem.lessons) ? appItem.lessons : [];
            const qCount = questions.length || 10;

            const isUnlocked = this.isLessonUnlocked(key);
            const record = this.completedLessons[key];
            const isCompleted = !!record;

            if (isCompleted) {
                totalStars += (record.stars || 1);
                completedCount++;
            }

            // Trích xuất ngữ pháp tóm tắt
            let grammarSummary = "Luyện phản xạ bóc tách Hán ngữ & sửa bẫy dịch thô.";
            if (questions.length > 0 && questions[0].grammarPoint) {
                grammarSummary = questions[0].grammarPoint.split(/[.;]/)[0];
            } else if (title.includes('-')) {
                grammarSummary = "Chủ điểm: " + title.split('-')[1].trim();
            }

            const theme = (typeof LevelManager !== 'undefined' && LevelManager.getTheme) ? LevelManager.getTheme() : null;
            const card = document.createElement('div');
            card.className = `card-reveal p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isCompleted 
                    ? 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700/80 shadow-xs' 
                    : isUnlocked 
                        ? (theme ? theme.cardActiveBg : 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500 shadow-sm ring-2 ring-emerald-400/20')
                        : 'bg-slate-100/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`;
            // Stagger animation delay theo thứ tự card (tối đa 400ms)
            card.style.animationDelay = `${Math.min(idx * 40, 400)}ms`;

            // Nội dung bài học (Mobile-first min-w-0 chống tràn hàng)
            const infoDiv = document.createElement('div');
            infoDiv.className = "flex-grow min-w-0";
            infoDiv.innerHTML = `
                <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span class="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        isCompleted ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700' :
                        isUnlocked ? (theme ? theme.softBadge : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30') : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }">BÀI ${idx + 1}</span>
                    <span class="text-xs font-bold text-slate-400">${qCount} câu luyện tập</span>
                    ${isCompleted ? `<span class="text-xs tracking-tight">${this.getStarString(record.stars)}</span>` : ''}
                </div>
                <h4 class="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-snug flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full shrink-0 ${theme ? theme.dotClass : 'bg-emerald-500'}" title="${theme ? theme.name : 'HSK'}"></span>
                    <span class="break-words">${title}</span>
                </h4>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 font-medium pl-4">
                    ${grammarSummary}
                </p>
            `;

            // Nút bấm hành động (Touch target >= 44px)
            const actionDiv = document.createElement('div');
            actionDiv.className = "shrink-0 flex items-center justify-end w-full sm:w-auto";

            if (isUnlocked) {
                const btn = document.createElement('button');
                btn.className = `w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-black shadow-xs transition active:scale-95 btn-press flex items-center justify-center ${
                    isCompleted 
                        ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200' 
                        : (theme ? theme.cardActiveBtn : 'bg-emerald-600 hover:bg-emerald-700 text-white')
                }`;
                btn.textContent = isCompleted ? "Luyện lại ↺" : "Học ngay ➔";
                btn.onclick = () => this.showPractice(key);
                actionDiv.appendChild(btn);
            } else {
                actionDiv.innerHTML = `
                    <span class="w-full sm:w-auto min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed">
                        <span>🔒</span> Đang khóa
                    </span>
                `;
            }

            card.appendChild(infoDiv);
            card.appendChild(actionDiv);
            container.appendChild(card);
        });

        // Cập nhật thống kê đầu trang
        const totalStarsEl = document.getElementById('dash-total-stars');
        if (totalStarsEl) totalStarsEl.textContent = `⭐ ${totalStars}`;

        const summaryEl = document.getElementById('dash-progress-summary');
        if (summaryEl) summaryEl.textContent = `${completedCount}/${keys.length} bài hoàn thành`;
    },

    // Mở Modal chọn bài nhanh
    openModal() {
        const searchInput = document.getElementById('modal-search-input');
        if (searchInput) searchInput.value = '';
        this.renderModalGrid('');
        const modal = document.getElementById('lesson-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('modal-active'), 10);
    },

    closeModal() {
        const modal = document.getElementById('lesson-modal');
        if (!modal) return;
        modal.classList.remove('modal-active');
        setTimeout(() => modal.classList.add('hidden'), 200);
    },

    renderModalGrid(filter = '') {
        const grid = document.getElementById('modal-lesson-grid');
        if (!grid) return;
        // Xóa skeleton placeholders và nội dung cũ
        grid.querySelectorAll('.modal-skeleton').forEach(el => el.remove());
        grid.innerHTML = '';

        const manifest = window.LESSON_MANIFEST || [];
        const keys = this.getLessonKeys();
        let visibleIdx = 0;

        keys.forEach((key, idx) => {
            const mItem = manifest.find(m => m.id === key);
            const appItem = App.data ? App.data[key] : null;
            const title = (mItem && mItem.title) || (appItem && appItem.title) || `Bài ${idx + 1}`;
            const questions = (appItem && appItem.lessons) ? appItem.lessons : [];
            const qCount = questions.length || 10;
            const isUnlocked = this.isLessonUnlocked(key);
            const record = this.completedLessons[key];
            const isCompleted = !!record;
            const isCurrent = (App.curLesson === key && !document.getElementById('practice-view')?.classList.contains('hidden'));

            if (filter && !title.toLowerCase().includes(filter)) return;

            const theme = (typeof LevelManager !== 'undefined' && LevelManager.getTheme) ? LevelManager.getTheme() : null;
            const card = document.createElement('div');
            card.className = `card-reveal p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                isUnlocked ? 'cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-xs active:scale-95' : 'opacity-50 cursor-not-allowed'
            } ${
                isCurrent 
                    ? (theme ? theme.modalActiveBorder : 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-400/30')
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
            }`;
            card.style.animationDelay = `${Math.min(visibleIdx * 30, 300)}ms`;
            visibleIdx++;

            card.innerHTML = `
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isCurrent 
                                ? (theme ? theme.softBadge : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30') 
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }">BÀI ${idx + 1}</span>
                        <span class="text-[11px] text-slate-400 font-bold">${qCount} câu</span>
                    </div>
                    <h5 class="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1 flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full shrink-0 ${theme ? theme.dotClass : 'bg-emerald-500'}"></span>
                        <span class="truncate">${title}</span>
                    </h5>
                </div>
                <div class="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-bold">
                    <span class="${isCurrent ? (theme ? theme.modalActiveText : 'text-emerald-600 dark:text-emerald-400') : isUnlocked ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}">
                        ${isCurrent ? '● Đang luyện' : isUnlocked ? 'Chọn bài ➔' : '🔒 Khóa'}
                    </span>
                    <span>${isCompleted ? this.getStarString(record.stars) : ''}</span>
                </div>
            `;

            if (isUnlocked) {
                card.onclick = () => {
                    this.closeModal();
                    this.showPractice(key);
                };
            }

            grid.appendChild(card);
        });
    },

    // Đánh dấu hoàn thành bài và mở khóa bài tiếp theo với số sao và độ chính xác thực tế
    markCompleted(lessonKey, totalQuestions, stars = 3, accuracy = 100) {
        const prev = this.completedLessons[lessonKey];
        const finalStars = prev ? Math.max(prev.stars || 1, stars) : stars;
        const finalAccuracy = prev ? Math.max(prev.accuracy || 0, accuracy) : accuracy;

        this.completedLessons[lessonKey] = {
            stars: finalStars,
            accuracy: finalAccuracy,
            done: totalQuestions,
            total: totalQuestions,
            completedAt: new Date().toISOString()
        };

        const manifest = window.LESSON_MANIFEST || [];
        const keys = this.getLessonKeys();
        const curIdx = keys.indexOf(lessonKey);
        if (curIdx >= 0 && curIdx < keys.length - 1) {
            const nextKey = keys[curIdx + 1];
            if (!this.unlockedLessons.includes(nextKey)) {
                this.unlockedLessons.push(nextKey);
            }
        }

        this.saveProgress();
    }
};

/**
 * HỆ THỐNG MÀU SẮC ĐẶC TRƯNG THEO TỪNG CẤP ĐỘ HSK (LEVEL THEME SYSTEM)
 * Tuân theo dải quang phổ tăng dần (Heatmap / Spectrum) chuẩn UI hiện đại:
 * - HSK 1: Xanh ngọc (Mint / Emerald)   #10B981 -> Khởi đầu, tươi mới, nhẹ nhàng
 * - HSK 2: Xanh lam (Sky Blue / Cyan)    #0EA5E9 -> Rộng mở, hình thành phản xạ căn bản
 * - HSK 3: Xanh dương đậm (Royal Blue)   #3B82F6 -> Hoàn thành sơ cấp, vững chãi ngữ pháp
 * - HSK 4: Vàng cam (Amber / Orange)     #F59E0B -> Bước ngoặt trung cấp, năng lượng cao
 * - HSK 5: Đỏ san hô (Coral Red)         #EF4444 -> Cận cao cấp, thử thách chuyên sâu
 * - HSK 6: Tím thẫm (Royal Purple)       #8B5CF6 -> Đỉnh cao thành thạo (Mastery)
 */
const LEVEL_THEMES = {
    hsk1: {
        id: 'hsk1',
        title: 'HSK 1',
        name: 'Sơ cấp 1 · Nền tảng căn bản',
        levelPill: 'HSK 1 · NỀN TẢNG',
        hex: '#10B981',
        dotClass: 'bg-[#10B981]',
        softBadge: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
        activeTab: 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm font-black',
        inactiveTab: 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold',
        brandIcon: 'bg-[#10B981]',
        brandSubtitle: 'text-emerald-600 dark:text-emerald-400 font-bold block',
        bannerGradient: 'bg-gradient-to-r from-emerald-600 to-teal-700',
        bannerTitle: 'Chinh Phục Dịch Chuẩn HSK 1',
        bannerDesc: 'Bóc tách cú pháp, tiêu diệt bẫy dịch thô và hình thành phản xạ dịch tự nhiên.',
        cardActiveBg: 'bg-white dark:bg-slate-900 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/20',
        cardActiveBtn: 'bg-[#10B981] hover:bg-emerald-600 text-white',
        modalActiveBorder: 'border-emerald-500 ring-2 ring-emerald-400/30',
        modalActiveText: 'text-emerald-600 dark:text-emerald-400',
        progressBarClass: 'bg-[#10B981]'
    },
    hsk2: {
        id: 'hsk2',
        title: 'HSK 2',
        name: 'Sơ cấp 2 · Mở rộng & Tự tin',
        levelPill: 'HSK 2 · MỞ RỘNG',
        hex: '#0EA5E9',
        dotClass: 'bg-[#0EA5E9]',
        softBadge: 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border border-sky-500/30',
        activeTab: 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-sm font-black',
        inactiveTab: 'text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 font-bold',
        brandIcon: 'bg-[#0EA5E9]',
        brandSubtitle: 'text-sky-600 dark:text-sky-400 font-bold block',
        bannerGradient: 'bg-gradient-to-r from-sky-500 to-cyan-600',
        bannerTitle: 'Chinh Phục Dịch Chuẩn HSK 2',
        bannerDesc: 'Mở rộng vốn từ ghép, liên từ lựa chọn (还是/或者), phó từ tần suất và câu so sánh.',
        cardActiveBg: 'bg-white dark:bg-slate-900 border-sky-500/50 shadow-xs ring-1 ring-sky-500/20',
        cardActiveBtn: 'bg-[#0EA5E9] hover:bg-sky-600 text-white',
        modalActiveBorder: 'border-sky-500 ring-2 ring-sky-400/30',
        modalActiveText: 'text-sky-600 dark:text-sky-400',
        progressBarClass: 'bg-[#0EA5E9]'
    },
    hsk3: {
        id: 'hsk3',
        title: 'HSK 3',
        name: 'Trung cấp 1 · Bứt phá độc lập',
        levelPill: 'HSK 3 · BỨT PHÁ',
        hex: '#3B82F6',
        dotClass: 'bg-[#3B82F6]',
        softBadge: 'bg-blue-500/12 text-blue-700 dark:text-blue-300 border border-blue-500/30',
        activeTab: 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-sm font-black',
        inactiveTab: 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold',
        brandIcon: 'bg-[#3B82F6]',
        brandSubtitle: 'text-blue-600 dark:text-blue-400 font-bold block',
        bannerGradient: 'bg-gradient-to-r from-blue-600 to-indigo-700',
        bannerTitle: 'Chinh Phục Dịch Chuẩn HSK 3',
        bannerDesc: 'Chinh phục câu chữ 把, câu chữ 被, bổ ngữ kết quả, bổ ngữ xu hướng và ngữ pháp phức hợp.',
        cardActiveBg: 'bg-white dark:bg-slate-900 border-blue-500/50 shadow-xs ring-1 ring-blue-500/20',
        cardActiveBtn: 'bg-[#3B82F6] hover:bg-blue-600 text-white',
        modalActiveBorder: 'border-blue-500 ring-2 ring-blue-400/30',
        modalActiveText: 'text-blue-600 dark:text-blue-400',
        progressBarClass: 'bg-[#3B82F6]'
    },
    hsk4: {
        id: 'hsk4',
        title: 'HSK 4',
        name: 'Trung cấp 2 · Thành thạo chuyên sâu',
        levelPill: 'HSK 4 · THÀNH THẠO',
        hex: '#F59E0B',
        dotClass: 'bg-[#F59E0B]',
        softBadge: 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/30',
        activeTab: 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm font-black',
        inactiveTab: 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 font-bold',
        brandIcon: 'bg-[#F59E0B]',
        brandSubtitle: 'text-amber-600 dark:text-amber-400 font-bold block',
        bannerGradient: 'bg-gradient-to-r from-amber-500 to-orange-600',
        bannerTitle: 'Chinh Phục Dịch Chuẩn HSK 4',
        bannerDesc: 'Đàm thoại nghị luận, phân tích thành ngữ và phản xạ đọc dịch tốc độ cao.',
        cardActiveBg: 'bg-white dark:bg-slate-900 border-amber-500/50 shadow-xs ring-1 ring-amber-500/20',
        cardActiveBtn: 'bg-[#F59E0B] hover:bg-amber-600 text-white',
        modalActiveBorder: 'border-amber-500 ring-2 ring-amber-400/30',
        modalActiveText: 'text-amber-600 dark:text-amber-400',
        progressBarClass: 'bg-[#F59E0B]'
    },
    hsk5: {
        id: 'hsk5',
        title: 'HSK 5',
        name: 'Cao cấp 1 · Chuyên nghiệp & Thử thách',
        levelPill: 'HSK 5 · CHUYÊN SÂU',
        hex: '#EF4444',
        dotClass: 'bg-[#EF4444]',
        softBadge: 'bg-red-500/12 text-red-700 dark:text-red-300 border border-red-500/30',
        activeTab: 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 border border-red-500/30 shadow-sm font-black',
        inactiveTab: 'text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-bold',
        brandIcon: 'bg-[#EF4444]',
        brandSubtitle: 'text-red-600 dark:text-red-400 font-bold block',
        bannerGradient: 'bg-gradient-to-r from-red-500 to-rose-700',
        bannerTitle: 'Chinh Phục Dịch Chuẩn HSK 5',
        bannerDesc: 'Cận cao cấp, mang tính thử thách, đòi hỏi vốn từ và tốc độ dịch thuật dày dặn.',
        cardActiveBg: 'bg-white dark:bg-slate-900 border-red-500/50 shadow-xs ring-1 ring-red-500/20',
        cardActiveBtn: 'bg-[#EF4444] hover:bg-red-600 text-white',
        modalActiveBorder: 'border-red-500 ring-2 ring-red-400/30',
        modalActiveText: 'text-red-600 dark:text-red-400',
        progressBarClass: 'bg-[#EF4444]'
    },
    hsk6: {
        id: 'hsk6',
        title: 'HSK 6',
        name: 'Cao cấp 2 · Đỉnh cao ngôn ngữ (Mastery)',
        levelPill: 'HSK 6 · ĐỈNH CAO',
        hex: '#8B5CF6',
        dotClass: 'bg-[#8B5CF6]',
        softBadge: 'bg-purple-500/12 text-purple-700 dark:text-purple-300 border border-purple-500/30',
        activeTab: 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 border border-purple-500/30 shadow-sm font-black',
        inactiveTab: 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 font-bold',
        brandIcon: 'bg-[#8B5CF6]',
        brandSubtitle: 'text-purple-600 dark:text-purple-400 font-bold block',
        bannerGradient: 'bg-gradient-to-r from-purple-600 to-violet-800',
        bannerTitle: 'Chinh Phục Dịch Chuẩn HSK 6',
        bannerDesc: 'Cấp độ thành thạo (Mastery), tạo cảm giác uy tín, chuyên sâu và đỉnh cao bản xứ.',
        cardActiveBg: 'bg-white dark:bg-slate-900 border-purple-500/50 shadow-xs ring-1 ring-purple-500/20',
        cardActiveBtn: 'bg-[#8B5CF6] hover:bg-purple-600 text-white',
        modalActiveBorder: 'border-purple-500 ring-2 ring-purple-400/30',
        modalActiveText: 'text-purple-600 dark:text-purple-400',
        progressBarClass: 'bg-[#8B5CF6]'
    }
};

/**
 * LEVEL MANAGER
 * Quản lý Trình độ HSK (HSK Level Selector) & Giao diện màu sắc theo cấp độ
 */
const LevelManager = {
    currentLevel: 'hsk1',

    getTheme(lvl) {
        const level = lvl || this.currentLevel || 'hsk1';
        return LEVEL_THEMES[level] || LEVEL_THEMES.hsk1;
    },

    init() {
        const saved = localStorage.getItem('sct2_selected_level');
        if (saved && ['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6'].includes(saved)) {
            this.currentLevel = saved;
        }

        if (window.HSK_MANIFESTS && window.HSK_MANIFESTS[this.currentLevel]) {
            window.LESSON_MANIFEST = window.HSK_MANIFESTS[this.currentLevel];
        }

        this.applyTheme();
        this.bindEvents();
    },

    bindEvents() {
        const buttons = document.querySelectorAll('.level-tab-btn');
        buttons.forEach(btn => {
            btn.onclick = async () => {
                const level = btn.dataset.level;
                if (level === 'hsk4' || level === 'hsk5' || level === 'hsk6') {
                    alert(`Cấp độ ${level.toUpperCase()} đang được biên soạn nội dung, vui lòng chọn HSK 1, 2 hoặc 3!`);
                    return;
                }
                if (this.currentLevel === level) return;

                this.currentLevel = level;
                localStorage.setItem('sct2_selected_level', level);

                // Cập nhật manifest tương ứng cấp độ
                if (window.HSK_MANIFESTS && window.HSK_MANIFESTS[level]) {
                    window.LESSON_MANIFEST = window.HSK_MANIFESTS[level];
                }

                this.applyTheme();

                // Tự động quét và nạp dữ liệu của cấp độ mới
                if (typeof App !== 'undefined' && typeof App.loadLevelData === 'function') {
                    await App.loadLevelData(this.currentLevel);
                    App.curLesson = (window.LESSON_MANIFEST && window.LESSON_MANIFEST[0]) ? window.LESSON_MANIFEST[0].id : 'bai1';
                }

                // Tải lại tiến trình bài và render lại thẻ
                if (typeof NavigationHub !== 'undefined') {
                    NavigationHub.loadProgress();
                    NavigationHub.renderDashboardCards();
                }
            };
        });
    },

    applyTheme() {
        const theme = this.getTheme();

        // 1. Cập nhật Icon thương hiệu & Subtitle trên Header
        const brandIcon = document.getElementById('brand-badge-icon');
        if (brandIcon) {
            brandIcon.className = `w-9 h-9 rounded-xl ${theme.brandIcon} text-white font-black flex items-center justify-center text-lg shadow-sm transition-colors duration-300`;
        }

        const brandSubtitle = document.getElementById('brand-subtitle');
        if (brandSubtitle) {
            brandSubtitle.className = `text-[10px] ${theme.brandSubtitle} transition-colors duration-300`;
        }

        const brandTitle = document.getElementById('brand-header-title');
        if (brandTitle) {
            brandTitle.textContent = `Luyện Dịch ${theme.title} · SCT2`;
        }

        // Cập nhật chấm chỉ báo trên nút chọn bài header
        const headerDot = document.getElementById('header-lesson-dot');
        if (headerDot) {
            headerDot.className = `w-2 h-2 rounded-full shrink-0 ${theme.dotClass} transition-colors duration-300`;
        }

        // 2. Cập nhật Banner Dashboard
        const bannerCard = document.getElementById('dash-banner-card');
        if (bannerCard) {
            bannerCard.className = `${theme.bannerGradient} text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden transition-all duration-300`;
        }

        const bannerTitle = document.getElementById('dash-banner-title');
        if (bannerTitle) bannerTitle.textContent = theme.bannerTitle;

        const bannerDesc = document.getElementById('dash-banner-desc');
        if (bannerDesc) bannerDesc.textContent = theme.bannerDesc;

        const levelPill = document.getElementById('dash-level-pill');
        if (levelPill) levelPill.textContent = theme.levelPill;

        const badge = document.getElementById('current-level-badge');
        if (badge) badge.textContent = `Đang học ${theme.title}`;

        const listTitle = document.getElementById('lesson-list-level-title');
        if (listTitle) listTitle.textContent = `Danh Sách Bài Học ${theme.title}`;

        // 3. Highlight tabs
        document.querySelectorAll('.level-tab-btn').forEach(b => {
            const btnLevel = b.dataset.level;
            const btnTheme = this.getTheme(btnLevel);
            const isTarget = btnLevel === this.currentLevel;

            if (isTarget) {
                b.className = `level-tab-btn active px-3 py-1.5 rounded-xl text-xs transition-all ${btnTheme.activeTab} cursor-pointer flex items-center gap-1.5`;
            } else if (btnLevel !== 'hsk4' && btnLevel !== 'hsk5' && btnLevel !== 'hsk6') {
                b.className = `level-tab-btn px-3 py-1.5 rounded-xl text-xs transition-all ${btnTheme.inactiveTab} cursor-pointer flex items-center gap-1.5`;
            }
        });

        // 4. Cập nhật thanh tiến trình theo quy tắc Heatmap
        const pBar = document.getElementById('session-progress-bar');
        if (pBar) {
            pBar.className = `${theme.progressBarClass} h-full rounded-full transition-all duration-300 ease-out`;
        }
    },

    highlightActiveTab() {
        this.applyTheme();
    },

    updateBannerInfo() {
        this.applyTheme();
    }
};

window.NavigationHub = NavigationHub;
window.LevelManager = LevelManager;

