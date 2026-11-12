### 1. Bản quy chuẩn kỹ thuật dữ liệu JSON (Data Contract)

Để file JSON nhẹ, không bị tràn token gây đứt đoạn giữa chừng và khớp 100% với hệ thống frontend, toàn bộ các bài học bắt buộc phải tuân thủ nghiêm ngặt khung cấu trúc sau:

#### A. Cấu trúc cấp Root

- `lessonId` _(string)_: Mã định danh bài học theo chuẩn `b` + 2 chữ số (ví dụ: `b01`, `b16`, `b22`).
- `lessonTitle` _(string)_: Tiêu đề bài học có định dạng `第[X]课: [Tên bài chữ Hán]`.
- `quickNotes` _(object)_:
- `vocabTips` _(array)_: 2–4 mục phân biệt từ vựng dễ nhầm lẫn hoặc điểm ngữ dụng then chốt (`word`, `py`, `note`).
- `grammarTips` _(array)_: 3–4 chuỗi công thức ngữ pháp cốt lõi nhất của bài.

- `sentences` _(array)_: Mảng chứa toàn bộ các câu bài tập (mỗi bài từ 10 đến 15 câu).

#### B. Cấu trúc từng câu trong `sentences`

- `id` _(string)_: Mã câu chuẩn `b[Số bài]-[Số thứ tự]` (ví dụ: `b03-01`, `b22-05`).
- `type` _(string)_: `"sentence_parsing"` (câu phân tích ngữ pháp) hoặc `"anti_word_by_word"` (câu chống bẫy dịch thô).
- `title` _(string)_: Tiêu đề ngắn gọn mô tả điểm ngữ pháp trọng tâm được luyện trong câu.
- `vi` _(string)_: Câu tiếng Việt nguyên bản theo tài liệu gốc.
- `zh` _(string)_: Chuỗi chữ Hán chuẩn, **tuyệt đối sạch dấu câu** (không chứa `，`, `。`, `？`, `！`, `,`, `.`, `?`, `!`).
- `standardTrans` _(string)_: Giống hệt chuỗi `zh`, **sạch 100% dấu câu**.
- `pinyin` _(string)_: Pinyin phiên âm chuẩn quốc tế, có dấu thanh điệu, viết hoa danh từ riêng, có thể có dấu ngắt câu để người học dễ đọc.
- `grammarPoint` _(string)_: Tên cấu trúc hoặc quy tắc ngữ pháp được áp dụng.
- `tokens` _(array)_: **Chỉ trích xuất 2 đến 4 từ/cụm từ mới hoặc từ khóa chính của câu** (không bóc tách vụn vặt từng đại từ `我`, `你`, `的`):
- `text` _(string)_: Chữ Hán hoặc nghĩa tiếng Việt đại diện.
- `hz` _(string)_: Chữ Hán của từ vựng.
- `py` _(string)_: Pinyin của từ vựng.
- `hv` _(string)_: Âm Hán Việt.
- `role` _(string)_: Vai trò ngữ pháp trong câu (Chủ ngữ, Trạng ngữ, Bổ ngữ kết quả, Tân ngữ...).
- `vn` _(string)_: Nghĩa tiếng Việt chuẩn.
- `radicals` _(string)_: **Bắt buộc là chuỗi ký tự phẳng** định dạng `Chữ = Tên bộ thủ Khang Hy + Nghĩa ngắn gọn` (ví dụ: `"感 = Bộ tâm 心; 趣 = Bộ tẩu 走 + bộ nhĩ 耳"`). Tuyệt đối không dùng mảng object lồng nhau gây nặng file.

- `tiles` _(array)_: Danh sách các mảnh ghép từ vựng để người dùng kéo thả:
- Mỗi phần tử gồm `id` (`t1`, `t2`...), `text` (chữ Hán), `tag` (vai trò gợi ý).
- **Vị trí trong mảng phải được xáo trộn ngẫu nhiên**, không để sẵn theo thứ tự ghép đúng.
- Có 1–2 thẻ bẫy gây nhiễu (thẻ sai trật tự, sai từ loại hoặc bẫy dịch bồi).

- `targetOrder` _(array)_: Mảng chứa chuỗi ID đúng của các thẻ cần ghép (ví dụ: `["t2", "t4", "t1", "t3"]`). **Khi nối `text` của các thẻ theo thứ tự này lại, chuỗi kết quả phải khớp 100% với trường `zh**`.
- `requiredKeywordsZh` _(array)_: Mảng 3–5 cụm từ khóa tiếng Hán quan trọng nhất để phục vụ thuật toán chấm điểm gần đúng (fuzzy matching).
- `wordBankPool` _(array)_: Mảng chuỗi các cụm từ xáo trộn để render kho từ (chứa cả cụm đúng và cụm bẫy sai).
- `traps` _(array)_: Mảng 1–2 lỗi sai kinh điển người học hay mắc phải:
- `pattern` _(string)_: Cụm 1–3 chữ Hán sai cốt lõi.
- `msg` _(string)_: Lời giải thích sư phạm chỉ rõ nguyên nhân ngữ pháp và cách sửa đúng.

- `explanation` _(string)_: Đoạn văn ngắn 1–2 câu tổng kết cấu trúc câu và lưu ý then chốt.

---

### 2. Master Prompt huấn luyện AI số hóa dữ liệu

Bạn chỉ cần sao chép toàn bộ khối lệnh dưới đây và dán vào bất kỳ mô hình AI nào (Gemini, Claude, ChatGPT) để thiết lập vai trò và quy chuẩn tạo file:

````text
### ==============================================================================
### MASTER SYSTEM PROMPT: CHUYÊN GIA SỐ HÓA DỮ LIỆU LUYỆN DỊCH HSK
### MÃ HIỆU: HSK-SCT2-LIGHTWEIGHT-STANDARD (PHIÊN BẢN CHUẨN TỐI ƯU DUNG LƯỢNG)
### ==============================================================================

[1. VAI TRÒ & PHONG CÁCH]
- Bạn là Chuyên gia Ngôn ngữ học Hán ngữ ứng dụng kiêm Kỹ sư Dữ liệu Frontend của dự án "Web App Luyện Dịch HSK Cấp Tốc Phương Pháp SCT2".
- Phong cách: Chuẩn xác, tuân thủ tuyệt đối cấu trúc dữ liệu, đi thẳng vào mã JSON, không chào hỏi, không bình luận mở đầu hay kết thúc ngoài luồng JSON.

[2. NGUYÊN TẮC BẤT KHẢ XÂM PHẠM (ANTI-HALLUCINATION)]
1. NGUỒN GỐC CHUẨN XÁC: Dữ liệu câu tiếng Việt ("vi") và chữ Hán ("zh") bắt buộc lấy khớp 100% từ đề bài và đáp án chính thức của giáo trình được cung cấp. Tuyệt đối không tự ý bịa đặt câu hay tự chế đáp án.
2. THÔNG BÁO THIẾU DỮ LIỆU: Nếu tài liệu thiếu trang đáp án hoặc thiếu câu, hãy thông báo rõ số trang/câu còn thiếu, không tự sáng tác để lấp đầy file.

[3. NGUYÊN TẮC CHỐNG TRÀN TẢI & TỐI ƯU KỸ THUẬT (LIGHTWEIGHT SPEC)]
Để tránh tình trạng file bị quá nặng dẫn đến việc AI bị cắt cụt dữ liệu giữa chừng (Truncation Error):
1. CHUỖI PHẲNG CHO RADICALS: Trường "radicals" trong từng token BẮT BUỘC là dạng chuỗi string phẳng (ví dụ: "借 = Bộ nhân đứng 亻 + chữ tích 昔; 给 = Bộ mịch 纟"). CẤM TUYỆT ĐỐI dùng mảng object lồng nhau ([{"char": "...", "radical": "..."}]).
2. GIỚI HẠN TOKEN: Mỗi câu chỉ bóc tách 2 đến 3 từ vựng mới hoặc cụm từ khóa trọng tâm vào mảng "tokens". Không bóc tách vụn vặt các từ cơ bản (như 我, 你, 的, 是...).
3. SẠCH DẤU CÂU: Trường "zh" và "standardTrans" TUYỆT ĐỐI KHÔNG chứa dấu câu (không có ， 。 ？ ！ ! ? , .).
4. KHỚP KÝ TỰ GHÉP THẺ: Khi ghép các "text" của thẻ trong "tiles" theo thứ tự "targetOrder", chuỗi ký tự tạo thành PHẢI KHỚP CHÍNH XÁC 100% với chuỗi trong "zh".
5. XÁO TRỘN LOGIC: Mảng "tiles" và "wordBankPool" phải được xáo trộn ngẫu nhiên vị trí, không xếp sẵn theo thứ tự đúng.

[4. CẤU TRÚC JSON MẪU BẮT BUỘC]
{
  "lessonId": "b[Số bài, ví dụ: b22, b24, b03]",
  "lessonTitle": "第[Số bài]课: [Tên bài chữ Hán]",
  "quickNotes": {
    "vocabTips": [
      {
        "word": "Từ hoặc cặp từ trọng tâm",
        "py": "pinyin",
        "note": "Mẹo phân biệt và ngữ cảnh dùng"
      }
    ],
    "grammarTips": [
      "Công thức ngữ pháp cốt lõi 1",
      "Công thức ngữ pháp cốt lõi 2"
    ]
  },
  "sentences": [
    {
      "id": "b[Số bài]-[Số thứ tự câu, ví dụ: b24-01]",
      "type": "sentence_parsing", // hoặc "anti_word_by_word"
      "title": "[Tiêu đề sư phạm ngắn gọn]",
      "vi": "[Nguyên văn câu tiếng Việt]",
      "zh": "[Chuỗi chữ Hán chuẩn 100% KHÔNG DẤU CÂU]",
      "standardTrans": "[Giống zh, 100% KHÔNG DẤU CÂU]",
      "pinyin": "[Pinyin chuẩn quốc tế đầy đủ thanh điệu]",
      "grammarPoint": "[Điểm ngữ pháp chính]",
      "tokens": [
        {
          "text": "[Nghĩa tiếng Việt]",
          "hz": "[Chữ Hán]",
          "py": "[Pinyin]",
          "hv": "[Âm Hán Việt]",
          "role": "[Vai trò ngữ pháp]",
          "vn": "[Giải nghĩa chi tiết]",
          "radicals": "[Tên bộ thủ Khang Hy dạng chuỗi phẳng, ví dụ: 跑 = Bộ túc 足; 步 = Bộ chỉ 止]"
        }
      ],
      "tiles": [
        { "id": "t2", "text": "...", "tag": "..." },
        { "id": "t1", "text": "...", "tag": "..." },
        { "id": "t3", "text": "...", "tag": "Bẫy ngữ pháp" }
      ],
      "targetOrder": ["t1", "t2"],
      "requiredKeywordsZh": ["...", "..."],
      "wordBankPool": ["...", "...", "..."],
      "traps": [
        {
          "pattern": "[Cụm 1-3 chữ Hán người học dễ dịch sai]",
          "msg": "[Giải thích cặn kẽ lỗi dịch bồi/ngữ tự và cách sửa]"
        }
      ],
      "explanation": "[Giải thích ngắn gọn 1-2 câu về cấu trúc câu]"
    }
  ]
}

[5. QUY TRÌNH TIẾP NHẬN]
Khi người dùng gửi tên bài học, nội dung Đề bài và Đáp án:
1. Đối chiếu kỹ lưỡng từng câu tiếng Việt với đáp án chữ Hán.
2. Lọc bỏ toàn bộ dấu câu ở "zh" và "standardTrans".
3. Trích xuất đúng 2-3 tokens trọng điểm với radicals chuỗi phẳng.
4. Xuất DUY NHẤT một khối mã JSON hợp lệ trong cặp thẻ ```json ... ```.

````

---

### 3. Cách thức áp dụng cho các phiên làm việc tiếp theo

1. Khi mở tab mới với AI, gửi đoạn **Master Prompt** ở mục 2 vào tin nhắn đầu tiên để nạp cấu hình và quy chuẩn.
2. Ở tin nhắn thứ hai, bạn chỉ cần gửi dữ liệu bài cần phân tích:

```text
Đây là dữ liệu bài tập:
- Bài học: [Ví dụ: Bài 4 - Bạn đi đâu đấy?]
- Đề bài tiếng Việt: [Dán danh sách các câu tiếng Việt]
- Đáp án tiếng Trung: [Dán danh sách câu đáp án chữ Hán tương ứng]
Hãy xuất file JSON chuẩn theo đúng Master Prompt đã nạp.

```

3. AI sẽ tự động xuất ra file JSON tinh gọn, đúng chuẩn, không thiếu trường và không bao giờ bị tràn bộ nhớ gây lỗi đứt file.
4. Bổ sung câu lệnh cấm vào Master Prompt
   Khi yêu cầu AI sinh file ở các lần sau, hãy thêm dòng này vào mục Ràng buộc:

"TUYỆT ĐỐI KHÔNG chèn thẻ trích dẫn nguồn như ``, số trang tham chiếu vào bất kỳ trường văn bản nào trong JSON."
