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

