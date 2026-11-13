Dưới đây là bộ cấu hình 2 file chuẩn chỉnh nhất để bạn thả thẳng vào thư mục dự án trong **Antigravity IDE**.

Cơ chế này áp dụng kỹ thuật **TDD (Viết bài test bẫy lỗi trước khi viết code tính năng)** kết hợp **ép chạy Terminal kiểm chứng thực tế**, giúp khắc phục triệt để bệnh "tự khen" và ảo giác khi chạy tự hành trên **Gemini 3.8 Flash (Medium)**.

---

### 1. File Luật Dự Án: `.antigravity/rules.md`

_Tác dụng: Khóa chặt kiến trúc web tĩnh thuần Vanilla JS/JSON của bạn, ngăn AI tự ý cài thư viện nặng hoặc đập phá tính năng cũ._

```markdown
# QUY TẮC KIẾN TRÚC & PHÁT TRIỂN DỰ ÁN

## 1. Tech Stack & Ràng buộc cứng

- Dự án là ứng dụng web tĩnh (Static Web App) chạy thuần phía client (HTML5, CSS3, Vanilla JavaScript ES6+) và đọc dữ liệu từ các file `.json` tĩnh.
- **CẤM:** Không tự ý cài đặt thêm framework (React, Vue, Tailwind...) hay tạo backend server nếu không có lệnh trực tiếp.
- **Bảo toàn tính năng:** Tuyệt đối không xóa, đổi tên biến toàn cục hoặc làm hỏng các tính năng hiện có (gamification, audio TTS, lưu trữ `localStorage`, giao diện ghép từ).

## 2. Tiêu chuẩn viết Code để tự kiểm thử

- Tách biệt rõ ràng giữa **Logic xử lý dữ liệu** (Pure Functions: chấm điểm, kiểm tra đáp án, tính streak, lọc câu hỏi) và **Thao tác giao diện (DOM Manipulation)**.
- Mọi hàm xử lý logic mới bắt buộc phải viết theo dạng có thể chạy độc lập trong môi trường Node.js (hoặc dễ dàng cô lập để test) mà không bị phụ thuộc cứng vào `document` hay `window`.
- Luôn xử lý các trường hợp ngoại lệ (Edge Cases): dữ liệu JSON bị thiếu trường, người dùng nhập chuỗi rỗng, ký tự đặc biệt, hoặc `localStorage` bị trống/lỗi.
```

---

### 2. File Prompt Vòng Lặp Tự Hành: `.agent/workflows/improve.md`

_Tác dụng: Ép AI tự động chạy quy trình 5 bước khép kín, tự bắt lỗi qua Terminal và lặp lại tối đa 3 lần cho đến khi code chạy sạch 100%._

```markdown
---
description: Quy trình tự hành phát triển tính năng, viết test bắt lỗi và tự sửa qua Terminal
---

Khi nhận được yêu cầu thêm tính năng hoặc cải tiến hệ thống, bạn PHẢI thực hiện nghiêm ngặt chu trình 5 bước dưới đây. Không được phép dừng lại hay báo cáo hoàn thành cho đến khi vượt qua toàn bộ bài kiểm tra ở Bước 4.

### BƯỚC 1: PHÂN TÍCH & LẬP KẾ HOẠCH (PLAN)

1. Đọc các file HTML, CSS, JS và cấu trúc JSON liên quan hiện có trong dự án để nắm rõ luồng dữ liệu.
2. Tạo file nháp `_temp_plan.md` ghi rõ:
   - Danh sách các file sẽ chỉnh sửa/tạo mới.
   - Cấu trúc dữ liệu mới (nếu có tác động đến `localStorage` hoặc JSON).
   - Liệt kê ít nhất **4 tình huống lỗi/ngoại lệ (Edge Cases)** có thể làm hỏng tính năng này khi người dùng thao tác thực tế.

### BƯỚC 2: THIẾT KẾ BÀI TEST KHẮT KHE TRƯỚC KHI CODE (TEST-FIRST)

1. Trước khi sửa code chính, hãy tạo file `_temp_test.js` chạy trên Node.js.
2. Đóng vai một **QA Tester khó tính**, viết các hàm kiểm thử (`assert`) bao phủ toàn bộ logic cốt lõi và 4 tình huống ngoại lệ đã nêu ở Bước 1 (ví dụ: đầu vào rỗng, sai kiểu dữ liệu, spam click, dữ liệu cũ trong `localStorage` chưa có trường mới).

### BƯỚC 3: THỰC THI CODE TÍNH NĂNG (EXECUTE)

1. Dựa theo `_temp_plan.md`, tiến hành viết code cập nhật vào các file HTML, CSS, JS của dự án.
2. Đảm bảo giao diện mới đồng bộ với phong cách CSS hiện tại của trang web (responsive trên cả điện thoại và máy tính).

### BƯỚC 4: KIỂM CHỨNG THỰC TẾ & VÒNG LẶP TỰ SỬA (VERIFY & LOOP)

Bạn bắt buộc phải mở Terminal và thực thi tuần tự 2 lệnh kiểm tra sau:

1. Chạy `node --check <tên-file-js-vừa-sửa>` cho tất cả các file JS bị tác động để đảm bảo 0 lỗi cú pháp.
2. Chạy `node _temp_test.js` để kiểm tra logic tính năng.

**QUY TẮC VÒNG LẶP (Tối đa 3 lần):**

- Nếu Terminal báo lỗi cú pháp hoặc bất kỳ test case nào trong `_temp_test.js` bị `FAIL`: **KHÔNG ĐƯỢC BIỆN MINH**. Hãy đọc log lỗi, quay lại Bước 3 để sửa code và chạy lại Bước 4.
- Nếu đã lặp đủ 3 lần mà vẫn còn lỗi chưa thể tự giải quyết: Dừng lại và báo cáo chi tiết nguyên nhân vướng mắc cho người dùng.

### BƯỚC 5: NGHIỆM THU CUỐI & DỌN DẸP (CLEANUP)

1. Kiểm tra chéo lần cuối: Đảm bảo các ID và Class mới trong file JS khớp 100% với file HTML/CSS.
2. Xóa bỏ các file tạm `_temp_plan.md` và `_temp_test.js` khỏi thư mục dự án để giữ repo sạch sẽ.
3. Báo cáo ngắn gọn cho người dùng:
   - Các file đã thay đổi.
   - Các kịch bản ngoại lệ đã được xử lý an toàn.
   - Hướng dẫn cách test nhanh trên trình duyệt.
```

---

### Cách sử dụng thực tế trong Antigravity IDE

1. Tạo 2 thư mục `.antigravity` và `.agent/workflows` ở thư mục gốc dự án của bạn, sau đó dán nội dung 2 file trên vào.
2. Mở khung chat Agent, chọn model **Gemini 3.8 Flash** ở mức **Medium**.
3. Gõ lệnh `/improve` kèm yêu cầu rõ ràng, ví dụ:

   > `/improve Tạo tính năng "Sổ tay từ vựng khó": khi người dùng bấm vào một từ vựng bất kỳ trong phần giải thích đáp án, cho phép lưu từ đó vào localStorage và xem lại trong một modal riêng.`

4. Bạn có thể theo dõi AI tự động tạo file `_temp_plan.md` $\rightarrow$ viết bẫy lỗi vào `_temp_test.js` $\rightarrow$ code tính năng $\rightarrow$ chạy terminal báo đỏ/xanh $\rightarrow$ tự sửa lỗi $\rightarrow$ tự xóa file tạm và bàn giao code hoàn chỉnh.
