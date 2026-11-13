/**
 * SCT2 TOAST VIEW (Tầng Views)
 * Hiển thị các thông báo Toast nổi không chặn luồng giao diện người dùng
 */

export class ToastView {
    static ensureContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    static show(options = {}) {
        let title = 'Thông báo';
        let message = '';
        let icon = '🔔';
        let type = 'success';
        let duration = 3000;

        if (typeof options === 'string') {
            message = options;
            type = arguments[1] || 'success';
            duration = arguments[2] || 3000;
            if (type === 'streak' || message.includes('🔥')) {
                title = 'Chuỗi Streak';
                icon = '🔥';
                type = 'streak';
            } else if (type === 'success' || message.includes('❤️') || message.includes('✅')) {
                title = 'Thành công';
                icon = message.includes('❤️') ? '❤️' : '✅';
            } else if (type === 'warning' || message.includes('⚠️') || message.includes('🔒')) {
                title = 'Chú ý';
                icon = message.includes('🔒') ? '🔒' : '⚠️';
            } else if (type === 'error' || message.includes('❌')) {
                title = 'Lỗi';
                icon = '❌';
            } else {
                title = 'Thông báo';
                icon = 'ℹ️';
            }
        } else {
            title = options.title || 'Thông báo';
            message = options.message || '';
            icon = options.icon || (options.type === 'streak' ? '🔥' : '🔔');
            type = options.type || 'success';
            duration = options.duration || 3000;
        }

        if (typeof message === 'string') {
            message = message.replace(/^[\p{Emoji}\p{Extended_Pictographic}\uFE0F\u200D\s!]+/u, '').trim();
        }
        if (typeof title === 'string') {
            title = title.replace(/[\s!]*[\p{Emoji}\p{Extended_Pictographic}\uFE0F\u200D]+[\s!]*$/u, '').trim();
        }

        const container = this.ensureContainer();
        const toast = document.createElement('div');
        toast.className = `sct2-toast toast-${type}`;

        toast.innerHTML = `
            <div class="sct2-toast-icon">${icon}</div>
            <div class="sct2-toast-body">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;

        toast.onclick = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        };

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.remove('show');
                toast.addEventListener('transitionend', () => toast.remove(), { once: true });
                setTimeout(() => toast.remove(), 400);
            }
        }, duration);
    }
}

// Cầu nối window tạm thời cho HTML & các module khác ở Nhịp 1
if (typeof window !== 'undefined') {
    window.ToastView = ToastView;
    window.showToast = (opts, ...args) => ToastView.show(opts, ...args);
}

