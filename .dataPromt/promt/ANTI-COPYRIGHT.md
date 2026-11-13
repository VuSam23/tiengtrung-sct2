Để triệt tiêu hoàn toàn rủi ro bản quyền (cả bản quyền nội dung lẫn bản quyền tuyển tập/cấu trúc sắp xếp), câu trả lời là **CÓ — bắt buộc phải đổi cả tiêu đề, nội dung câu ví dụ lẫn cấu trúc sắp xếp**, chỉ giữ lại "xương sống" là từ vựng đơn lẻ và công thức ngữ pháp gốc (vì quy tắc ngôn ngữ và từ vựng rời rạc thuộc tài sản chung, không bị bảo hộ bản quyền).

### 1. Bảng đối chiếu: Phần được giữ vs. Phần bắt buộc sửa

| Thành phần                      | Giữ lại (An toàn pháp lý)                          | Bắt buộc sửa đổi (Chống bản quyền)                                                                                                                        |
| ------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tiêu đề bài (`lessonTitle`)** | Số thứ tự bài (Bài 13, Bài 14...) hoặc cấp độ HSK. | **Đổi hoàn toàn tên bài.** Không dùng câu tiêu đề bài khóa gốc (VD: bỏ _"这是不是中药？"_ $\rightarrow$ đổi thành _"Mô tả đồ vật, màu sắc & tính chất"_). |

|
| **Từ vựng & Ngữ pháp** | Danh sách từ mới cốt lõi và công thức ngữ pháp (VD: `A不A`, `是...还是...`). | **Viết lại toàn bộ ghi chú (`vocabTips`, `explanation`)** theo văn phong riêng của app, không chép nguyên văn lời giải thích tiếng Việt trong sách.

|
| **Câu ví dụ (`sentences`)** | Khung cấu trúc câu và điểm bẫy ngữ pháp. | **Tự biên soạn mới 100% câu ví dụ:** đổi nhân vật (bỏ _玛丽, 麦克, 田芳_), đổi bối cảnh, con số, đồ vật và địa điểm.

|
| **Cấu trúc & Thứ tự** | Định dạng kỹ thuật JSON của web app (`tokens`, `tiles`, `traps`). | **Phá vỡ trình tự tuyến tính của sách:** xáo trộn ngẫu nhiên thứ tự các câu hỏi và thứ tự các công thức trong `grammarTips`.

|

---

### 2. Bản cải tiến: Giao thức Chống Bản Quyền & Tái Cấu Trúc (Nâng cấp cho Prompt SCT2)

Bạn hãy sao chép khối quy tắc nâng cấp dưới đây để thay thế cho **Thiết luật 6** trong bộ Master Prompt hiện tại nhằm ép AI tái cấu trúc dữ liệu sâu hơn:

```markdown
6. THIẾT LUẬT CHỐNG BẢN QUYỀN & TÁI CẤU TRÚC SÂU (ANTI-COPYRIGHT & DE-STRUCTURING):
   - **Tái định danh tiêu đề (`lessonTitle`):** Tuyệt đối không dịch hoặc chép lại tiêu đề bài khóa gốc. Đặt tên theo chức năng giao tiếp thực tế (VD: "Hỏi đường & Phương tiện", "Mua sắm & Mặc cả").
   - **Thay thế thực thể & Bối cảnh (Entity Swapping):** Cấm dùng lại tên nhân vật kinh điển của giáo trình gốc (玛丽, 麦克, 田芳, 张东, 王兰). Thay bằng đại từ nhân xưng, quan hệ gia đình/công việc (我哥哥, 李经理, 王老师) hoặc tên phổ thông mới, đồng thời thay đổi toàn bộ số lượng, màu sắc và địa điểm.
   - **Đảo cấu trúc tuyến tính (Structural Shuffling):** Không sắp xếp câu theo trình tự Ngữ pháp 1 -> Ngữ pháp 2 -> Ngữ pháp 3 như sách. Bắt buộc xáo trộn ngẫu nhiên thứ tự xuất hiện của các điểm ngữ pháp trong mảng `sentences` và đảo vị trí các mục trong `grammarTips`.
   - **Độc lập diễn giải (`vocabTips` & `explanation`):** Viết lại toàn bộ phần mẹo từ vựng và giải thích ngữ pháp bằng ngôn ngữ sư phạm ngắn gọn của hệ thống SCT2, không sao chép định nghĩa hay ví dụ minh họa từ tài liệu nguồn.
```

---

### 3. Ví dụ thực tế: Trước và Sau khi cải tiến (Trích từ Bài 14)

- **Bản gốc trong tài liệu (Rủi ro bản quyền cao):**
- _Tiêu đề:_ `第十四课：你的车是新的还是旧的`

- _Câu ví dụ:_ `今天我和玛丽去书店买学习用品。` (Nhân vật _玛丽_ và ngữ cảnh đi hiệu sách lấy nguyên từ bài tập Dịch Trung - Việt câu 6, trang 264).

- _Thứ tự câu:_ Xếp lần lượt theo đúng thứ tự mục ngữ pháp 1 (`刚`), 2 (`啊`), 3 (`最近`), 4 (`还是`), 5 (`一点儿`).

- **Bản đã cải tiến (An toàn 100%):**
- _Tiêu đề:_ `"Bài 14: Phương tiện di chuyển & Trạng thái gần đây"`

- _Câu ví dụ viết mới:_ `"我姐姐刚买一辆新汽车 很漂亮啊"` (Đổi nhân vật thành _chị gái_, đổi hành động thành _mua ô tô mới_, lồng ghép tự nhiên cả phó từ `刚` và trợ từ cảm thán `啊` vào một ngữ cảnh mới).

- _Thứ tự câu:_ Đảo ngẫu nhiên (`b14-06` $\rightarrow$ `b14-01` $\rightarrow$ `b14-08` $\rightarrow$ `b14-03`...) để cấu trúc file JSON hoàn toàn độc lập với mục lục bài tập của sách.

Nếu bạn muốn, tôi có thể rà soát lại các file JSON cũ (từ Bài 1 đến Bài 12) hoặc xuất tiếp **Bài 16 / Bài Ôn tập tổng hợp** áp dụng triệt để bộ quy tắc chống bản quyền nâng cấp này.
