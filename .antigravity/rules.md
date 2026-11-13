# QUY TẮC KIẾN TRÚC & PHÁT TRIỂN DỰ ÁN

## 1. Tech Stack & Ràng buộc cứng

- Dự án là ứng dụng web tĩnh (Static Web App) chạy thuần phía client (HTML5, CSS3, Vanilla JavaScript ES6+) và đọc dữ liệu từ các file `.json` tĩnh.
- **CẤM:** Không tự ý cài đặt thêm framework (React, Vue, Tailwind...) hay tạo backend server nếu không có lệnh trực tiếp.
- **Bảo toàn tính năng:** Tuyệt đối không xóa, đổi tên biến toàn cục hoặc làm hỏng các tính năng hiện có (gamification, audio TTS, lưu trữ `localStorage`, giao diện ghép từ).

## 2. Quy tắc thực thi nhanh (Cấm tự bày việc)

- Chỉ đọc và sửa đúng file liên quan theo sơ đồ Mục 3; tuyệt đối không tạo file nháp (`_temp_*`) hay lục lọi `git log` / `git diff`.
- Cấm chạy `node -e` để giả lập trình duyệt (`window`, `document`, `localStorage`). Sửa xong chỉ chạy duy nhất `node -c <tên-file>` để kiểm tra cú pháp.

## 3. Kiến trúc chuẩn: Modular MVC + Services (Bắt buộc tuân thủ)

Dự án sử dụng chuẩn Native ES Modules (`type="module"`) theo mô hình MVC phân tầng:

- `js/app.js`: Điểm khởi chạy duy nhất (Entry point), gắn Event Delegation qua `data-action`. Không chứa logic nghiệp vụ rườm rà.
- `js/models/`: Quản lý state, `localStorage` (`state-model.js`) và fetch/cache JSON (`lesson-model.js`). Cấm thao tác DOM trong thư mục này.
- `js/views/`: Chuyên trách render DOM (`quiz-view.js`, `modal-view.js`, `toast-view.js`).
- `js/controllers/`: Điều phối luồng tương tác (`quiz-controller.js`, `nav-controller.js`).
- `js/services/`: Chứa pure functions & Web APIs (`evaluator-service.js`, `gamification-service.js`, `audio-service.js`).

### Quy tắc ràng buộc khi sửa/tạo file:

1. Giới hạn mỗi file JS tối đa **300 dòng**.
2. Tuân thủ luồng import một chiều: `app.js` -> `controllers/` -> (`models/`, `views/`, `services/`). Cấm `models/` hoặc `services/` import ngược lại `views/`.
3. Khi cần tìm kiếm logic, đọc thẳng file trong thư mục chức năng tương ứng theo sơ đồ trên, không quét toàn bộ dự án.

## 4. Quy tắc luồng dữ liệu một chiều (Chống lỗi chéo file)

- `models/` và `services/`: **Độc lập hoàn toàn**, tuyệt đối không `import` từ `views/` hay `controllers/`.
- `views/`: Chỉ được `import` dữ liệu từ `models/state-model.js` để hiển thị lên màn hình.
- `controllers/`: Là nơi duy nhất gọi kết hợp `models/`, `services/` và `views/`.
- `js/app.js`: Chỉ làm 2 việc là gọi `init()` của các controller và lắng nghe sự kiện `click` tập trung qua thuộc tính `data-action`.

## 5. Quy tắc mở rộng tính năng mới (Feature Placement)

- Khi thêm tính năng nhỏ (< 50 dòng): Bổ sung trực tiếp vào file Model/View/Controller/Service có chức năng gần nhất.
- Khi thêm tính năng lớn độc lập (ví dụ: Sổ tay từ vựng, Luyện nghe, Thống kê): Tạo cặp file chuyên biệt `js/views/<ten>-view.js` và `js/controllers/<ten>-controller.js`, sau đó đăng ký vào `js/app.js`.
- Mọi thao tác đọc/ghi `localStorage` mới bắt buộc phải đi qua `js/models/state-model.js`, cấm gọi trực tiếp `localStorage.setItem` rải rác ở các file khác.
