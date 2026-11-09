# 🚀 Hệ Thống Luyện Dịch Hán Ngữ Thực Chiến SCT2 (HSK 1 - HSK 6)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Pure Vanilla JS](https://img.shields.io/badge/Stack-Vanilla%20JS%20%7C%20HTML5%20%7C%20CSS3-yellow.svg)](index.html)
[![Zero Dependency](https://img.shields.io/badge/Dependencies-0%20(No%20Build%20Required)-blue.svg)](package.json)
[![Test Suite](https://img.shields.io/badge/Tests-Passing%20(212%20Questions%20%2F%2020%20Lessons)-brightgreen.svg)](master-test.js)
[![GitHub Pages](https://img.shields.io/badge/Deployment-GitHub%20Pages%20Ready-success.svg)](https://pages.github.com/)

> **Hệ thống webapp luyện phản xạ dịch và bóc tách cú pháp tiếng Trung SCT2** (Sentence Construction & Component Thinking) từ HSK 1 đến HSK 6. Chạy trực tiếp 100% trên trình duyệt (Client-Side), không cần server backend, không cần cài đặt Node.js hay build step.

---

## 🌐 Trải Nghiệm Trực Tiếp (Live Demo)

👉 **Link chạy thử trên GitHub Pages**: `https://<ten-tai-khoan-github>.github.io/<ten-repo>/`  
*(Chỉ cần bật GitHub Pages từ nhánh `main` là web tự động hoạt động sau 30 giây).*

---

## ✨ Điểm Nổi Bật & Tính Năng Vượt Trội

### 1. 🧩 Công Nghệ Bóc Tách Cú Pháp & Bẫy Động (Contextual Trap System)
- **Nhận diện bẫy ngữ pháp thời gian thực**: Khi học viên ghép cụm từ dễ nhầm lẫn (ví dụ: bẫy đảo ngữ `朋友我哥哥` thay vì `我哥哥的朋友`, bẫy trợ từ thừa `你呢吗`, hoặc nhầm phương vị từ `在里箱子`), hệ thống lập tức hiển thị cảnh báo phân tích sai sót kèm quy tắc sửa chuẩn xác.
- **Tùy chỉnh thông minh**: Hộp thoại cảnh báo bẫy chỉ kích hoạt khi thao tác sai, có phân định rõ ràng giữa Tiêu đề bẫy và Lời giải thích, tự động ẩn khi thao tác sửa xong.

### 2. 🌈 Hệ Thống Dải Màu Quang Phổ HSK (Heatmap Spectrum)
Ứng dụng dải quang phổ trực quan giúp học viên cảm nhận độ khó và lộ trình tiến bộ theo chuẩn UI hiện đại:
- 🟢 **HSK 1** (`#10B981` Mint Emerald): Khởi đầu nhẹ nhàng, thư thái.
- 🔵 **HSK 2** (`#0EA5E9` Sky Cyan): Mở rộng nền tảng phản xạ sơ cấp.
- 🔷 **HSK 3** (`#3B82F6` Royal Blue): Củng cố cấu trúc vững vàng.
- 🟠 **HSK 4** (`#F59E0B` Amber Orange): Bước ngoặt trung cấp đột phá.
- 🔴 **HSK 5** (`#EF4444` Coral Red): Cận cao cấp, thử thách từ vựng dịch nhanh.
- 🟣 **HSK 6** (`#8B5CF6` Royal Purple): Đỉnh cao thông thạo ngôn ngữ.

### 3. 🔊 Trợ Lý AI Speech Thông Minh (2 Tầng - Fallback Engine)
- **Tầng 1 (Neural Audio MP3)**: Tự động ưu tiên file âm thanh chất lượng cao chuẩn giọng Bắc Kinh được nén tối ưu.
- **Tầng 2 (Web Speech Synthesis Fallback)**: Tự động chuyển đổi mượt mà sang voice AI nội trang của thiết bị (`zh-CN` / `cmn-Hans-CN`), tinh chỉnh tốc độ học viên (`0.85x` chuẩn hoặc `0.6x` chế độ rùa nghe từng âm tiết).
- **Tránh âm kép (Anti-overlap)**: Tự động ngắt phát âm cũ trước khi phát âm mới, chống treo audio khi bấm liên tục.

### 4. 💡 Hộp Thoại Trọng Tâm & Giải Phẫu Chữ Hán
- **Khởi động 10 giây**: Trình bày trọng tâm ngữ pháp & từ vựng trước mỗi bài học trên nền mờ tập trung (Backdrop Blur), đóng dễ dàng bằng một chạm bất kỳ ra bên ngoài.
- **Bóc tách chiết tự**: Bấm vào bất kỳ khối từ nào để xem Pinyin chuẩn thanh điệu, âm Hán Việt, nghĩa ngữ cảnh và bộ thủ chiết tự Hán tự.

---

## 🏗️ Cấu Trúc Dự Án (Architecture Overview)

Dành cho lập trình viên và các **AI Assistant** (Gemini, Claude, ChatGPT, Cursor...) khi đọc hiểu mã nguồn:

```text
WebCode/
├── index.html              # Giao diện đơn trang hoàn chỉnh (HTML5, Tailwind-styled CSS, Modern Layout)
├── js/
│   ├── app.js              # State machine, logic render câu hỏi, xử lý click từ, AI Speech
│   ├── evaluator.js        # Engine đối soát đáp án, bóc tách cấu trúc câu, phát hiện bẫy cú pháp
│   └── navigation.js       # Quản lý chuyển bài, sidebar HSK 1-6, lưu tiến độ vào LocalStorage
├── data/
│   ├── manifest.js         # Khai báo mục lục toàn bộ bài học (HSK 1 -> HSK 6)
│   ├── hsk1/               # Dữ liệu bài tập HSK 1 (bai1.json -> bai15.json)
│   ├── hsk2/               # Dữ liệu bài tập HSK 2 (bai16.json -> bai22.json)
│   └── ...                 # Sẵn sàng mở rộng HSK 3 -> HSK 6
├── master-test.js          # Bộ kiểm thử tự động toàn diện cho logic JS
├── test-data.js            # Kiểm thử tính toàn vẹn của 100% dữ liệu JSON câu hỏi
└── README.md               # Tài liệu hướng dẫn sử dụng & triển khai
```

---

## 🤖 Hướng Dẫn Dành Cho AI Khi Đọc Repository Này

Nếu bạn là một **AI Agent** đang đọc codebase này để hỗ trợ phát triển hoặc tích hợp:
1. **Dữ liệu bài tập**: Xem tại `data/hsk{N}/bai{M}.json`. Mỗi câu hỏi tuân thủ schema:
   - `vietnamese`: Câu đề bài tiếng Việt.
   - `hanzi`: Đáp án chữ Hán chuẩn.
   - `pinyin`: Phiên âm có dấu thanh điệu.
   - `blocks`: Mảng các khối từ ghép câu (gồm từ đúng và các từ gây nhiễu).
   - `traps`: Mảng định nghĩa bẫy (`trap_sequence`, `trap_type`, `explanation`).
   - `breakdown`: Bóc tách ngữ pháp chi tiết từng thành phần.
2. **Logic kiểm tra**: Nằm toàn bộ ở [`js/evaluator.js`](js/evaluator.js).
3. **Quản lý danh mục**: Đọc file [`data/manifest.js`](data/manifest.js) để lấy danh sách toàn bộ các bài học hiện có.

---

## ⚡ Hướng Dẫn Cài Đặt & Triển Khai (Deployment)

### Cách 1: Triển khai tức thì lên GitHub Pages (Khuyên Dùng - 0 Cài Đặt)
1. Tạo một repository mới trên [GitHub.com](https://github.com/new) (ví dụ đặt tên: `tiengtrung-sct2`), chọn chế độ **Public**.
2. Tải toàn bộ mã nguồn lên repository (dùng kéo thả Web hoặc dùng lệnh Git).
3. Trên trang GitHub của bạn: Vào **Settings** ➔ **Pages** ➔ Chọn branch `main` ➔ Folder `/(root)` ➔ Bấm **Save**.
4. Chờ 30 giây, GitHub sẽ cấp cho bạn một đường link chạy trực tiếp trên toàn cầu!

### Cách 2: Chạy thử trên máy tính cá nhân
Chỉ cần mở trực tiếp file `index.html` bằng bất kỳ trình duyệt nào (Chrome, Edge, Safari, Firefox), hoặc dùng Live Server trong VS Code:
```bash
# Hoặc khởi động nhanh server nội bộ bằng Python nếu muốn:
python -m http.server 8000
# Truy cập: http://localhost:8000
```

---

## 🧪 Kiểm Thử Toàn Vẹn (Automated Test Suite)

Dự án tích hợp sẵn công cụ tự kiểm định chất lượng:
```powershell
# Chạy toàn bộ test kiểm định logic và dữ liệu
powershell -ExecutionPolicy Bypass -File .\master-test.ps1 -Quiet
powershell -ExecutionPolicy Bypass -File .\test-data.ps1
```
*Kết quả hiện tại: 100% PASS trên tất cả 20 bài học và 212 câu hỏi.*

---

## 📄 Bản Quyền & Tác Quyền
Được thiết kế và phát triển tối ưu cho cộng đồng người tự học tiếng Trung và nghiên cứu phương pháp giảng dạy ngôn ngữ thực chiến SCT2. Giấy phép mã nguồn mở MIT.
