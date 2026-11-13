Để triệt tiêu hoàn toàn tình trạng treo 25 phút (29 lượt gọi công cụ + lỗi nghẽn server `503`), bạn cần xử lý đồng bộ cả **bộ quy tắc của Agent** lẫn **cấu trúc file `js/app.js**`.

Dưới đây là giải pháp tối ưu nhất để bạn áp dụng ngay trong 3 bước:

---

### Bước 1: Cập nhật bộ file cấu hình siêu tốc (Giảm từ 29 lượt xuống còn ~5 lượt)

Thay thế toàn bộ nội dung 2 file hiện có trong dự án bằng bản tinh gọn dưới đây để cắt bỏ các bước tạo/xóa file nháp rườm rà và khóa chặt bản đồ file:

#### 1. File `.antigravity/rules.md`

```markdown
# QUY TẮC KIẾN TRÚC & TỐI ƯU DỰ ÁN (MODULAR MVC + SERVICES)

## 1. Tech Stack & Ràng buộc cứng

- Ứng dụng web tĩnh thuần HTML5, CSS3, Vanilla JS (Native ES Modules `type="module"`), đọc dữ liệu từ file `.json` tĩnh. Cấm cài thêm framework hoặc tạo backend.
- Tuyệt đối không làm hỏng các tính năng hiện có (gamification hồi tim/streak, audio TTS, `localStorage`, Vocab Inspector, Dark Mode).

## 2. Bản đồ kiến trúc tệp (Đọc thẳng file, cấm tìm kiếm tràn lan)

- `index.html`: Khung giao diện chính, modal, Dark Mode classes.
- `js/app.js`: Điểm khởi chạy duy nhất & bắt sự kiện tập trung (`data-action`).
- `js/models/`: Quản lý state & `localStorage` (`state-model.js`), fetch & cache JSON (`lesson-model.js`). Cấm thao tác DOM.
- `js/views/`: Render giao diện (`quiz-view.js`, `modal-view.js`, `toast-view.js`).
- `js/controllers/`: Điều phối luồng bấm nút (`quiz-controller.js`, `nav-controller.js`).
- `js/services/`: Pure logic & Web APIs (`evaluator-service.js`, `gamification-service.js`, `audio-service.js`).
- `data/bai1.json` -> `bai44.json` & `test-data.js`: Dữ liệu 480 câu hỏi và script kiểm thử.

## 3. Tiêu chuẩn hiệu năng & Tái cấu trúc

- **Giới hạn kích thước:** Mọi file JS mới hoặc sau khi tách không vượt quá **300 dòng**.
- **Luồng import một chiều:** `app.js` -> `controllers/` -> (`models/`, `views/`, `services/`). Cấm `models/` và `services/` import ngược lại `views/`.
- **Quy tắc đọc JSON:** Chỉ đọc tối đa 50 dòng đầu của `bai1.json` khi cần xem schema; cấm mở nhiều file JSON cùng lúc.
- **Tối ưu DOM:** Không dùng `innerHTML +=` trong vòng lặp (dùng `Array.join('')`); cache JSON đã tải vào `Map` trên RAM.
```

#### 2. File `.agent/workflows/improve.md` (Bản rút gọn 3 bước — Chạy dưới 1 phút)

```markdown
---
description: Quy trình phát triển tính năng nhanh gọn, kiểm chứng cú pháp qua Terminal
---

Thực hiện trực tiếp theo 3 bước sau (KHÔNG tạo file nháp `_temp_plan.md` hay `_temp_test.js`):

### BƯỚC 1: ĐỊNH VỊ & VIẾT CODE

1. Dựa vào Bản đồ kiến trúc trong `.antigravity/rules.md`, mở đúng vùng dòng của file mục tiêu cần sửa.
2. Viết trực tiếp tính năng vào code, đảm bảo xử lý đủ trường hợp ngoại lệ (dữ liệu rỗng, click nhầm nút con, Dark Mode, Responsive Mobile).

### BƯỚC 2: KIỂM CHỨNG NHANH QUA TERMINAL

1. Chạy `node --check <tên-file-js-vừa-sửa>` để đảm bảo 0 lỗi cú pháp.
2. **Chỉ chạy** `node test-data.js` khi có chỉnh sửa file trong thư mục `data/`. Nếu chỉ sửa HTML/CSS/JS, **bỏ qua** lệnh này.
3. Nếu phát hiện lỗi cú pháp hoặc sai liên kết ID/Class, tự sửa ngay (tối đa 2 vòng).

### BƯỚC 3: BÁO CÁO NGẮN

- Liệt kê các file đã cập nhật và tóm tắt thay đổi trong 3–5 gạch đầu dòng.
```

---

### Bước 2: Chuyển cấu hình Model mặc định sang `Low`

Trên thanh chọn model ở góc dưới Antigravity IDE:

- **Chuyển từ `Medium` sang `Gemini 3.8 Flash (Low)**`cho toàn bộ các tác vụ viết code tính năng, sửa giao diện và tách file. Mức`Low`phản hồi tức thì và tránh được cụm server đang bị quá tải lỗi`503 No capacity`của bản`Medium`.
- Chỉ chuyển sang `Medium` hoặc `High` khi bạn chạy script xử lý dữ liệu JSON phức tạp.

---

### Bước 3: Tháo gỡ "nút thắt cổ chai" `js/app.js` (Làm 1 lần dùng mãi mãi)

File `js/app.js` dài 2.349 dòng chính là nguyên nhân khiến AI phải cắt nhỏ để đọc và sửa tới 8–9 lần mỗi phiên. Hãy sao lưu Git (`git add . && git commit -m "backup truoc khi tach MVC"`), sau đó chạy lần lượt **3 lệnh tách cuốn chiếu** sau ở chế độ **Low** (mỗi lệnh mất khoảng 30–45 giây):

1. **Lệnh 1 (Tách Views phụ & Audio Service):**

   > `/improve Tạo thư mục js/models, js/views, js/controllers, js/services. Tách logic Toast sang js/views/toast-view.js, các Modal (VocabInspector, Hint, Briefing, QuickNotes) sang js/views/modal-view.js, và âm thanh TTS sang js/services/audio-service.js. Cập nhật index.html dùng type="module" và chạy node --check.`

2. **Lệnh 2 (Tách Models & Gamification Service):**

   > `/improve Tách phần quản lý biến state và localStorage từ js/app.js sang js/models/state-model.js; tách fetch JSON kèm RAM cache sang js/models/lesson-model.js; tách logic hồi tim và streak sang js/services/gamification-service.js. Cập nhật import và chạy node --check.`

3. **Lệnh 3 (Tách Quiz View & Controllers):**
   > `/improve Tách phần render khung #p-slot và thẻ từ sang js/views/quiz-view.js. Gom logic chấm điểm vào js/services/evaluator-service.js, điều phối câu hỏi vào js/controllers/quiz-controller.js và js/controllers/nav-controller.js. Dọn gọn js/app.js chỉ còn khởi tạo và bắt sự kiện data-action.`

_(Lưu ý: Sau khi chuyển sang `type="module"`, bạn mở web bằng **Live Server** trong VS Code hoặc lệnh `npx serve` để tránh lỗi CORS của trình duyệt)._
