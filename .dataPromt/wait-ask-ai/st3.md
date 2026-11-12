# TÀI LIỆU GIẢI PHÁP KỸ THUẬT CHI TIẾT TỪNG CHỨC NĂNG CẦN CẢI TIẾN

*Dự án: Web App Luyện Dịch HSK Cấp Tốc - Phương Pháp SCT2*  
*Đối chiếu trực tiếp từ video trải nghiệm thực tế (00:00 - 00:56)*

---

## MỤC LỤC CÁC CHỨC NĂNG CẢI TIẾN
1. **Chức năng 1:** Thay thế triệt để hộp thoại `alert()` bằng Toast thông báo không chặn UI
2. **Chức năng 2:** Cơ chế Accordion ẩn/thu gọn khối Giải phẫu Pinyin (Chống lộ đáp án)
3. **Chức năng 3:** Chuyển đổi Modal chi tiết từ vựng thành Popover / Floating Tooltip
4. **Chức năng 4:** Bộ so khớp vị trí sai (Diff Highlighter) & Bắt bẫy ngữ cảnh
5. **Chức năng 5:** Rút gọn bảng "Trọng tâm bài học" thành Flashcard 3 điểm chạm
6. **Chức năng 6:** Trực quan hóa thanh tiến độ phân đoạn & hàng chờ câu bỏ qua

---

## CHỨC NĂNG 1: THAY THẾ `alert()` BẰNG TOAST THÔNG BÁO KHÔNG CHẶN UI

### 1. Phân tích hiện trạng
* **Hiện tượng trong video (giây 00:41 - 00:44):** Sau khi hoàn thành bài số 3, hệ thống gọi hàm `alert("Chuỗi Streak: 1 ngày liên tiếp!...")`. Hộp thoại này khóa cứng luồng xử lý của trình duyệt, phá vỡ giao diện web và yêu cầu học viên phải đưa chuột lên bấm `OK`.
* **Mục tiêu:** Tạo thông báo trôi (Toast Notification) tự động biến mất sau 3 giây, hoặc Modal chúc mừng Gamification có hiệu ứng sinh động mà không làm đơ trang.

### 2. Phương án giải quyết & Mã nguồn

#### A. Thêm CSS cho Toast Container (Thêm vào file `css/style.css` hoặc thẻ `<style>`):
```css
/* Container chứa các Toast thông báo */
#toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.sct2-toast {
  pointer-events: auto;
  min-width: 280px;
  max-width: 360px;
  background: #ffffff;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border-left: 5px solid #10b981; /* Mặc định xanh lá */
  display: flex;
  align-items: center;
  gap: 12px;
  transform: translateX(120%);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
  opacity: 0;
}

.sct2-toast.show {
  transform: translateX(0);
  opacity: 1;
}

.sct2-toast.toast-streak {
  border-left-color: #f97316;
  background: #fff7ed;
}

.sct2-toast-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.sct2-toast-body h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.sct2-toast-body p {
  margin: 2px 0 0 0;
  font-size: 13px;
  color: #4b5563;
}
```

#### B. Hàm Javascript dùng chung (Thêm vào `js/app.js`):
```javascript
// Tạo container nếu chưa có
function ensureToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function showToast({ title, message, icon = '🔔', type = 'success', duration = 3000 }) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `sct2-toast toast-${type}`;
  
  toast.innerHTML = `
    <div class="sct2-toast-icon">${icon}</div>
    <div class="sct2-toast-body">
      <h4>${title}</h4>
      <p>${message}</p>
    </div>
  `;
  
  container.appendChild(toast);
  
  // Kích hoạt animation xuất hiện
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Tự động hủy sau thời gian duration
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, duration);
}

// THAY THẾ TOÀN BỘ CÁC LỆNH alert() CŨ BẰNG:
// showToast({
//   title: "Chuỗi Streak: 1 ngày liên tiếp! 🔥",
//   message: "Hôm nay bạn đã hoàn thành bài để giữ lửa thành công.",
//   icon: "🔥",
//   type: "streak",
//   duration: 3500
// });
```

---

## CHỨC NĂNG 2: ACCORDION ẨN/THU GỌN KHỐI GIẢI PHẪU (CHỐNG LỘ ĐÁP ÁN)

### 1. Phân tích hiện trạng
* **Hiện tượng trong video (giây 00:15 - 00:26):** Khối "GIẢI PHẪU THÀNH PHẦN & TỪ VỰNG" mở bung sẵn. Dòng các thẻ chữ Hán bên trên được xếp gần như trùng khít với trật tự đáp án đúng, bên dưới lại có luôn Pinyin và công thức ngữ pháp. Người học không cần suy nghĩ dịch mà chỉ cần nhìn thứ tự ở trên rồi nhặt các thẻ ở khay dưới.
* **Mục tiêu:** Mặc định đóng khối này lại. Chỉ hiện một thanh mỏng: `"💡 Gợi ý cú pháp & Từ vựng (Bấm để xem)"`. Chỉ khi học viên thực sự bế tắc mới bấm mở.

### 2. Phương án giải quyết & Mã nguồn

#### A. Cấu trúc HTML mới cho Khối Giải phẫu:
```html
<div class="anatomy-collapsible-card border rounded-xl overflow-hidden my-3 bg-white">
  <!-- Header luôn hiển thị, có nút bấm toggle -->
  <div id="anatomy-toggle-btn" class="flex items-center justify-between p-3 bg-amber-50 cursor-pointer select-none">
    <div class="flex items-center gap-2">
      <span class="text-amber-600 font-bold text-sm">💡 Gợi ý cú pháp & Từ vựng</span>
      <span class="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">Bấm để mở</span>
    </div>
    <div class="flex items-center gap-2">
      <button type="button" class="audio-slow-btn text-base p-1 hover:bg-amber-100 rounded" title="Đọc chậm">🐢</button>
      <button type="button" class="audio-normal-btn text-base p-1 hover:bg-amber-100 rounded" title="Đọc thường">🔊</button>
      <span id="anatomy-arrow" class="text-gray-400 text-xs transition-transform duration-200">▼</span>
    </div>
  </div>

  <!-- Nội dung chi tiết: Mặc định ẩn (hidden) -->
  <div id="anatomy-content" class="hidden p-4 border-t border-amber-100 bg-white">
    <!-- Danh sách từ vựng chi tiết sẽ được render tại đây -->
    <div id="anatomy-tokens-container" class="flex flex-wrap gap-2 mb-3"></div>
    <div id="anatomy-pinyin" class="text-sm text-emerald-700 font-mono mb-2"></div>
    <div id="anatomy-grammar" class="text-xs text-gray-600"></div>
  </div>
</div>
```

#### B. JavaScript xử lý Đóng/Mở:
```javascript
const toggleBtn = document.getElementById('anatomy-toggle-btn');
const contentBox = document.getElementById('anatomy-content');
const arrowIcon = document.getElementById('anatomy-arrow');

toggleBtn.addEventListener('click', (e) => {
  // Tránh bắt sự kiện nếu người dùng bấm vào nút âm thanh 🔊/🐢
  if (e.target.closest('button')) return;

  const isHidden = contentBox.classList.contains('hidden');
  if (isHidden) {
    contentBox.classList.remove('hidden');
    arrowIcon.style.transform = 'rotate(180deg)';
    toggleBtn.querySelector('.bg-amber-200').textContent = 'Thu gọn';
  } else {
    contentBox.classList.add('hidden');
    arrowIcon.style.transform = 'rotate(0deg)';
    toggleBtn.querySelector('.bg-amber-200').textContent = 'Bấm để mở';
  }
});

// Khi chuyển sang câu hỏi mới: Luôn tự động đóng lại
function resetAnatomyCard() {
  contentBox.classList.add('hidden');
  arrowIcon.style.transform = 'rotate(0deg)';
  toggleBtn.querySelector('.bg-amber-200').textContent = 'Bấm để mở';
}
```

---

## CHỨC NĂNG 3: POPOVER TRÔI NHẸ (FLOATING POPOVER) THAY THẾ MODAL LỚN

### 1. Phân tích hiện trạng
* **Hiện tượng trong video (giây 00:52):** Khi bấm vào thẻ từ `红的`, modal trung tâm to đùng nhảy ra choán hết màn hình, che mất toàn bộ đề bài và khay ghép thẻ. Học viên muốn xem tiếp phải với tay ấn nút `✕`.
* **Mục tiêu:** Hiển thị một Popover nhỏ gọn ngay phía trên hoặc phía dưới thẻ từ được nhấn. Tự biến mất khi nhấn ra ngoài hoặc khi nhấc tay khỏi thẻ.

### 2. Phương án giải quyết & Mã nguồn

#### A. CSS Popover định vị động:
```css
.word-popover {
  position: absolute;
  z-index: 1000;
  width: 260px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  display: none;
  font-family: inherit;
}

.word-popover::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px 6px 0;
  border-style: solid;
  border-color: #ffffff transparent;
  display: block;
  width: 0;
}
```

#### B. JavaScript gắn sự kiện vào từng thẻ từ:
```javascript
// Tạo một popover dùng chung duy nhất trên toàn trang
const globalPopover = document.createElement('div');
globalPopover.className = 'word-popover';
document.body.appendChild(globalPopover);

function showWordPopover(element, tokenData) {
  const rect = element.getBoundingClientRect();
  
  globalPopover.innerHTML = `
    <div class="flex items-center justify-between pb-1 border-b border-gray-100">
      <span class="text-lg font-bold text-gray-800">${tokenData.hz || tokenData.text}</span>
      <span class="text-xs text-emerald-600 font-mono font-semibold">${tokenData.py || ''}</span>
    </div>
    <div class="pt-2 text-xs text-gray-600 space-y-1">
      <div><b class="text-gray-700">Hán Việt:</b> ${tokenData.hv || '---'}</div>
      <div><b class="text-gray-700">Nghĩa:</b> ${tokenData.vi || tokenData.vn || ''}</div>
      ${tokenData.radicals ? `<div class="text-amber-700 bg-amber-50 p-1 rounded mt-1"><b>Bộ thủ:</b> ${tokenData.radicals}</div>` : ''}
    </div>
  `;

  globalPopover.style.display = 'block';
  
  // Tính toán tọa độ hiển thị phía trên thẻ từ
  const popoverWidth = 260;
  const left = rect.left + (rect.width / 2) - (popoverWidth / 2) + window.scrollX;
  const top = rect.top - globalPopover.offsetHeight - 8 + window.scrollY;

  globalPopover.style.left = `${Math.max(10, left)}px`;
  globalPopover.style.top = `${top}px`;
}

// Ẩn popover khi chạm bất kỳ đâu bên ngoài
document.addEventListener('click', (e) => {
  if (!e.target.closest('.word-popover') && !e.target.closest('.interactive-token-btn')) {
    globalPopover.style.display = 'none';
  }
});
```

---

## CHỨC NĂNG 4: BỘ SO KHỚP VỊ TRÍ SAI (DIFF HIGHLIGHTER) & BẮT BẪY

### 1. Phân tích hiện trạng
* **Hiện tượng trong video (giây 00:18, 00:25):** Khi nộp bài sai, hệ thống chỉ báo `CẦN HOÀN THIỆN` kèm nguyên văn `Đáp án chuẩn`. Học viên hoàn toàn không biết mình xếp sai ở đâu, vì sao sai và làm thế nào để tránh.
* **Mục tiêu:**
  1. Tô màu đỏ viền của thẻ đặt sai vị trí.
  2. Nếu phát hiện chuỗi người học dính vào `traps` (ví dụ `比我很高`), hiển thị ngay giải thích bẫy cú pháp của SCT2.

### 2. Phương án giải quyết & Mã nguồn

```javascript
function evaluateAnswer(userTileIds, currentQuestion) {
  // 1. Kiểm tra chính xác 100%
  const isExact = JSON.stringify(userTileIds) === JSON.stringify(currentQuestion.targetOrder);
  if (isExact) {
    return { status: 'CORRECT' };
  }

  // Ghép chuỗi người học đã tạo thành text
  const userText = userTileIds
    .map(id => currentQuestion.tiles.find(t => t.id === id)?.text || '')
    .join('');

  // 2. Quét bẫy ngữ pháp (Trap Detection)
  if (currentQuestion.traps && currentQuestion.traps.length > 0) {
    for (const trap of currentQuestion.traps) {
      if (userText.includes(trap.pattern)) {
        return {
          status: 'TRAP_TRIGGERED',
          message: trap.msg,
          pattern: trap.pattern
        };
      }
    }
  }

  // 3. Phân tích vị trí thẻ sai (Diffing)
  const diffResult = userTileIds.map((tileId, index) => {
    const isCorrectPosition = currentQuestion.targetOrder[index] === tileId;
    return { tileId, isCorrectPosition };
  });

  return {
    status: 'WRONG_ORDER',
    diffResult,
    standardTrans: currentQuestion.standardTrans
  };
}

// Hàm render phản hồi trực quan trên giao diện
function renderAnswerFeedback(evalResult) {
  const resultBox = document.getElementById('feedback-box');
  
  if (evalResult.status === 'CORRECT') {
    resultBox.className = 'feedback-card bg-emerald-50 border-emerald-400 text-emerald-800 p-4 rounded-xl';
    resultBox.innerHTML = `
      <div class="flex items-center gap-2 font-bold text-base">
        <span>🎉 Xuất sắc! Dịch chuẩn tư duy Hán ngữ.</span>
      </div>
    `;
  } else if (evalResult.status === 'TRAP_TRIGGERED') {
    resultBox.className = 'feedback-card bg-amber-50 border-amber-400 text-amber-900 p-4 rounded-xl';
    resultBox.innerHTML = `
      <div class="font-bold text-amber-800 mb-1">⚠️ PHÁT HIỆN BẪY DỊCH THÔ:</div>
      <p class="text-sm">${evalResult.message}</p>
    `;
  } else {
    // Tô đỏ thẻ sai trên khung ghép thẻ
    evalResult.diffResult.forEach(item => {
      const tileEl = document.querySelector(`[data-tile-id="${item.tileId}"]`);
      if (tileEl) {
        if (!item.isCorrectPosition) {
          tileEl.classList.add('border-red-500', 'bg-red-50', 'shake-animation');
        } else {
          tileEl.classList.add('border-emerald-500', 'bg-emerald-50');
        }
      }
    });

    resultBox.className = 'feedback-card bg-red-50 border-red-400 text-red-800 p-4 rounded-xl';
    resultBox.innerHTML = `
      <div class="font-bold mb-1">CẦN HOÀN THIỆN:</div>
      <div class="text-sm">Trật tự từ chưa chuẩn. Các thẻ viền đỏ đang đặt sai vị trí!</div>
      <div class="text-xs text-gray-500 mt-2">Đáp án chuẩn: ${evalResult.standardTrans}</div>
    `;
  }
}
```

---

## CHỨC NĂNG 5: RÚT GỌN "TRỌNG TÂM BÀI HỌC" THÀNH FLASHCARD 3 ĐIỂM CHẠM

### 1. Phân tích hiện trạng
* **Hiện tượng trong video (giây 00:13):** Bảng "Trọng tâm bài học & Từ vựng cần nhớ" có hàng chục dòng text đặc kín. Người dùng bấm ngay "BẮT ĐẦU LUYỆN DỊCH" mà không ai dừng lại đọc.
* **Mục tiêu:** Rút gọn tối đa thành **3 Flashcard nhỏ** hoặc 3 gạch đầu dòng then chốt nhất của bài, có thể đọc hết chỉ trong 10 giây.

### 2. Phương án giải quyết & Mã nguồn

```html
<div class="lesson-intro-compact bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-100 mb-4">
  <div class="flex items-center gap-2 mb-3">
    <span class="text-lg">🎯</span>
    <h3 class="font-bold text-emerald-900 text-sm uppercase tracking-wide">3 Điểm Cốt Lõi Cần Nhớ Hôm Nay</h3>
  </div>
  
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <!-- Card 1: Công thức -->
    <div class="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
      <span class="text-xs font-semibold text-emerald-600 block mb-1">CÔNG THỨC</span>
      <p class="text-xs text-gray-700 font-medium leading-relaxed">
        <b>A + 比 + B + Tính từ</b><br>
        <i class="text-gray-500">Tuyệt đối không dùng 很 trước tính từ.</i>
      </p>
    </div>

    <!-- Card 2: Bổ ngữ -->
    <div class="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
      <span class="text-xs font-semibold text-amber-600 block mb-1">ĐỘ LỆCH SỐ LƯỢNG</span>
      <p class="text-xs text-gray-700 font-medium leading-relaxed">
        Số đo chênh lệch (五公斤, 三度) <b>luôn đặt ở cuối câu</b> sau tính từ.
      </p>
    </div>

    <!-- Card 3: Phủ định -->
    <div class="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
      <span class="text-xs font-semibold text-rose-600 block mb-1">SO SÁNH KÉM</span>
      <p class="text-xs text-gray-700 font-medium leading-relaxed">
        Dùng <b>A + 没有 + B + Tính từ</b>. Chỉ dùng 不比 khi phản bác.
      </p>
    </div>
  </div>

  <button id="start-lesson-btn" class="w-full mt-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm">
    Bắt đầu làm bài ngay →
  </button>
</div>
```

---

## CHỨC NĂNG 6: THANH TIẾN ĐỘ PHÂN ĐOẠN & HÀNG CHỜ CÂU BỎ QUA

### 1. Phân tích hiện trạng
* **Hiện tượng trong video (giây 00:26):** Khi người học bấm "Bỏ qua", hệ thống thông báo đẩy câu xuống cuối hàng chờ, nhưng chỉ số `0/10` ở góc trên bên phải không phản ánh trực quan được câu nào đã đúng, câu nào đang đợi làm lại.
* **Mục tiêu:** Thay thanh số đơn điệu `0/10` bằng **Thanh phân đoạn đa màu (Segmented Progress Bar)**:
  * Màu xanh lá: Câu đã vượt qua.
  * Màu cam nhạt: Câu bị bỏ qua / làm sai đang chờ phục thù ở cuối hàng đợi.
  * Màu xám: Câu chưa chạm tới.

### 2. Phương án giải quyết & Mã nguồn

#### A. HTML Thanh tiến độ phân đoạn:
```html
<div class="w-full max-w-md mx-auto my-2">
  <div class="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
    <span id="progress-status-text">Đang làm câu 4/10</span>
    <span id="queue-remaining-badge" class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[11px] hidden">
      1 câu cần phục thù
    </span>
  </div>
  
  <!-- Thanh phân đoạn gồm 10 vạch nhỏ ghép lại -->
  <div id="segmented-progress-bar" class="flex gap-1.5 h-2.5 w-full">
    <!-- JS sẽ tự sinh 10 vạch phân đoạn tại đây -->
  </div>
</div>
```

#### B. JavaScript quản lý hàng chờ và đổi màu thanh tiến độ:
```javascript
class QuestionQueueManager {
  constructor(questions) {
    this.initialTotal = questions.length;
    this.queue = [...questions]; // Hàng đợi câu hỏi
    this.questionStates = new Array(this.initialTotal).fill('PENDING'); // PENDING | CORRECT | RETRY
    this.currentIndex = 0;
  }

  getCurrentQuestion() {
    return this.queue[0] || null;
  }

  // Khi làm đúng
  markCurrentAsCorrect() {
    this.questionStates[this.currentIndex] = 'CORRECT';
    this.queue.shift(); // Xóa khỏi hàng chờ
    this.currentIndex++;
    this.renderProgressBar();
  }

  // Khi bấm "Bỏ qua" hoặc làm sai
  sendCurrentToBack() {
    this.questionStates[this.currentIndex] = 'RETRY';
    const skippedQuestion = this.queue.shift();
    this.queue.push(skippedQuestion); // Đẩy xuống cuối mảng
    this.renderProgressBar();
  }

  renderProgressBar() {
    const container = document.getElementById('segmented-progress-bar');
    container.innerHTML = '';

    this.questionStates.forEach((state) => {
      const segment = document.createElement('div');
      segment.className = 'flex-1 rounded-full transition-colors duration-300 ';
      
      if (state === 'CORRECT') {
        segment.className += 'bg-emerald-500'; // Đã xong xanh lá
      } else if (state === 'RETRY') {
        segment.className += 'bg-amber-400 animate-pulse'; // Đang chờ làm lại màu vàng cam
      } else {
        segment.className += 'bg-gray-200'; // Chưa học màu xám
      }
      container.appendChild(segment);
    });

    // Cập nhật nhãn phụ
    const retryCount = this.questionStates.filter(s => s === 'RETRY').length;
    const badge = document.getElementById('queue-remaining-badge');
    if (retryCount > 0) {
      badge.classList.remove('hidden');
      badge.textContent = `${retryCount} câu cần phục thù`;
    } else {
      badge.classList.add('hidden');
    }
  }
}
```

---

## TỔNG KẾT BẢNG THAM CHIẾU CẢI TIẾN

| Chức năng | Trạng thái cũ (Trong Video) | Giải pháp mới | Tác động trải nghiệm |
| :--- | :--- | :--- | :--- |
| **1. Thông báo Streak** | `alert()` chặn toàn bộ trang web | `showToast()` trôi nhẹ góc phải | Không đơ trang, chuẩn UX hiện đại. |
| **2. Khối giải phẫu** | Lộ nguyên vẹn Pinyin & trật tự câu | Đóng dạng Accordion, bấm mới mở | Tăng 100% tính thử thách tư duy dịch. |
| **3. Chi tiết từ vựng** | Modal to che kín câu hỏi | Floating Popover trôi theo thẻ | Xem nhanh nghĩa/bộ thủ trong 1 giây. |
| **4. Báo lỗi sai** | Chỉ báo "Cần hoàn thiện" chung chung | Diff Highlight viền đỏ thẻ đặt sai | Học viên nhận biết ngay lỗi vị trí từ. |
| **5. Trọng tâm bài** | Danh sách chữ dày đặc gây nản | 3 Flashcard cô đọng ngắn gọn | Đọc hiểu trọng tâm chỉ trong 10 giây. |
| **6. Câu bỏ qua** | Chỉ số `0/10` đứng im vô cảm | Thanh phân đoạn đổi màu xanh/cam | Thấy rõ lộ trình và động lực hoàn thành bài. |