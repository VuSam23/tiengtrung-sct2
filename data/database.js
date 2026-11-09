/**
 * DATABASE TRUNG TÂM CÁC BÀI HỌC HSK
 * Tự động đồng bộ các bài từ thư mục data/
 */

const DEFAULT_DATABASE = {
    "bai1": {
        title: "Bài 1: 你好! - Chào hỏi & Đặc điểm ngữ pháp",
        lessons: [
            {
                id: "b1-01",
                type: "sentence_parsing",
                title: "Chào hỏi thông dụng",
                vi: "Xin chào",
                zh: "你好",
                pinyin: "nǐ hǎo",
                grammarPoint: "Công thức chào hỏi thông dụng: Đại từ nhân xưng / Danh từ chỉ người + 好",
                tokens: [
                    { text: "Bạn", hz: "你", py: "nǐ", hv: "Nhĩ", role: "Chủ ngữ (Đại từ)", vn: "Anh, chị, bạn", radicals: "Bộ nhân đứng 亻 + chữ nhĩ 尔 (gồm bộ mịch 冖 + bộ tiểu 小)" },
                    { text: "Khỏe / Tốt", hz: "好", py: "hǎo", hv: "Hảo", role: "Vị ngữ (Tính từ)", vn: "Tốt, đẹp, khỏe", radicals: "Bộ nữ 女 + bộ tử 子" }
                ],
                targetOrder: ["t-b1-01-ni", "t-b1-01-hao"],
                tiles: [
                    { id: "t-b1-01-ni", text: "你", tag: "Đại từ" },
                    { id: "t-b1-01-hao", text: "好", tag: "Tính từ" },
                    { id: "t-b1-01-shi", text: "是", tag: "Bẫy (Là)" }
                ],
                trapLiteral: "你是好 / 好你",
                standardTrans: "你好",
                explanation: "Lỗi dịch thô: Đừng dịch bồi theo thói quen tiếng Việt. Trong tiếng Trung, chào hỏi dùng trật tự 'Người + 好', không thêm động từ '是' và không đưa tính từ '好' lên trước đại từ. Biến điệu: nǐ hǎo đọc thành ní hǎo."
            },
            {
                id: "b1-02",
                type: "sentence_parsing",
                title: "Cấu trúc phủ định với phó từ 不",
                vi: "Bạn không khỏe",
                zh: "你不好",
                pinyin: "nǐ bù hǎo",
                grammarPoint: "Cấu trúc phủ định với phó từ: Chủ ngữ + 不 + Tính từ",
                tokens: [
                    { text: "Bạn", hz: "你", py: "nǐ", hv: "Nhĩ", role: "Chủ ngữ", vn: "Anh, chị, bạn", radicals: "Bộ nhân đứng 亻 + chữ nhĩ 尔" },
                    { text: "Không", hz: "不", py: "bù", hv: "Bất", role: "Phó từ phủ định", vn: "Không, chẳng", radicals: "Bộ nhất 一 + nét phẩy 丿 + nét sổ 丨 + nét chấm 丶" },
                    { text: "Khỏe", hz: "好", py: "hǎo", hv: "Hảo", role: "Vị ngữ", vn: "Tốt, đẹp, khỏe", radicals: "Bộ nữ 女 + bộ tử 子" }
                ],
                targetOrder: ["t-b1-02-ni", "t-b1-02-bu", "t-b1-02-hao"],
                tiles: [
                    { id: "t-b1-02-ni", text: "你", tag: "Chủ ngữ" },
                    { id: "t-b1-02-bu", text: "不", tag: "Phó từ" },
                    { id: "t-b1-02-hao", text: "好", tag: "Tính từ" },
                    { id: "t-b1-02-mei", text: "没", tag: "Bẫy (Không)" }
                ],
                trapLiteral: "你没好 / 不好你",
                standardTrans: "你不好",
                explanation: "Lỗi dịch thô: Phủ định tính chất hoặc trạng thái hiện tại phải dùng '不', không dùng '没'; trật tự ngữ pháp phải là Chủ ngữ đứng trước cụm vị ngữ '不好'. Phó từ '不' đọc thanh 4 trước thanh 3 giữ nguyên thanh điệu bù."
            },
            {
                id: "b1-03",
                type: "sentence_parsing",
                title: "Cụm danh từ: Tính từ + Danh từ",
                vi: "Ngựa to",
                zh: "大马",
                pinyin: "dà mǎ",
                grammarPoint: "Cấu trúc cụm danh từ cơ bản: Tính từ làm định ngữ + Danh từ trung tâm",
                tokens: [
                    { text: "To / Lớn", hz: "大", py: "dà", hv: "Đại", role: "Định ngữ", vn: "To, lớn", radicals: "Bộ đại 大" },
                    { text: "Con ngựa", hz: "马", py: "mǎ", hv: "Mã", role: "Trung tâm ngữ", vn: "Con ngựa", radicals: "Bộ mã 马" }
                ],
                targetOrder: ["t-b1-03-da", "t-b1-03-ma"],
                tiles: [
                    { id: "t-b1-03-da", text: "大", tag: "Định ngữ" },
                    { id: "t-b1-03-ma", text: "马", tag: "Danh từ" },
                    { id: "t-b1-03-de", text: "的", tag: "Bẫy (Trợ từ)" }
                ],
                trapLiteral: "马大",
                standardTrans: "大马",
                explanation: "Lỗi dịch thô: Người Việt quen nói danh từ trước tính từ sau ('ngựa to') nên rất dễ ghép ngược thành '马大'. Trong tiếng Trung, từ chỉ tính chất (大) bắt buộc phải đứng trước danh từ (马). Tính từ đơn âm tiết bổ nghĩa trực tiếp cho danh từ không cần trợ từ '的'."
            },
            {
                id: "b1-04",
                type: "sentence_parsing",
                title: "Định ngữ màu sắc: Màu sắc + Danh từ",
                vi: "Ngựa trắng",
                zh: "白马",
                pinyin: "bái mǎ",
                grammarPoint: "Tính từ chỉ màu sắc làm định ngữ trực tiếp cho danh từ: Màu sắc + Danh từ",
                tokens: [
                    { text: "Màu trắng", hz: "白", py: "bái", hv: "Bạch", role: "Định ngữ", vn: "Màu trắng, trắng", radicals: "Bộ bạch 白" },
                    { text: "Con ngựa", hz: "马", py: "mǎ", hv: "Mã", role: "Trung tâm ngữ", vn: "Con ngựa", radicals: "Bộ mã 马" }
                ],
                targetOrder: ["t-b1-04-bai", "t-b1-04-ma"],
                tiles: [
                    { id: "t-b1-04-bai", text: "白", tag: "Màu sắc" },
                    { id: "t-b1-04-ma", text: "马", tag: "Danh từ" },
                    { id: "t-b1-04-shi", text: "是", tag: "Bẫy (Là)" }
                ],
                trapLiteral: "马白",
                standardTrans: "白马",
                explanation: "Lỗi dịch thô: Không dịch bồi từ tiếng Việt sang là '马白'. Cụm danh từ tiếng Trung quy định thành phần định ngữ bổ nghĩa (白) phải đi trước trung tâm ngữ (马)."
            },
            {
                id: "b1-05",
                type: "sentence_parsing",
                title: "Chào hỏi theo các buổi trong ngày",
                vi: "Chào buổi sáng",
                zh: "早上好",
                pinyin: "zǎoshang hǎo",
                grammarPoint: "Mẫu câu chào theo các buổi trong ngày: Mốc thời gian + 好",
                tokens: [
                    { text: "Sớm", hz: "早", py: "zǎo", hv: "Tảo", role: "Từ tố", vn: "Sớm, buổi sáng", radicals: "Bộ nhật 日 + bộ thập 十" },
                    { text: "Trên", hz: "上", py: "shàng", hv: "Thượng", role: "Từ tố", vn: "Trên, phía trên", radicals: "Bộ nhất 一 + nét sổ 丨 + nét chấm 丶" },
                    { text: "Buổi sáng", hz: "早上", py: "zǎoshang", hv: "Tảo thượng", role: "Mốc thời gian", vn: "Buổi sáng", radicals: "Chữ 早 (bộ nhật 日 + bộ thập 十) + chữ 上 (bộ nhất 一 + nét sổ 丨 + nét chấm 丶)" },
                    { text: "Tốt / Chào", hz: "好", py: "hǎo", hv: "Hảo", role: "Vị ngữ", vn: "Tốt, đẹp, khỏe, an lành", radicals: "Bộ nữ 女 + bộ tử 子" }
                ],
                targetOrder: ["t-b1-05-zaoshang", "t-b1-05-hao"],
                tiles: [
                    { id: "t-b1-05-zaoshang", text: "早上", tag: "Thời gian" },
                    { id: "t-b1-05-hao", text: "好", tag: "Tính từ" },
                    { id: "t-b1-05-wen", text: "问", tag: "Bẫy (Chào hỏi)" }
                ],
                trapLiteral: "好早上 / 早好好",
                standardTrans: "早上好",
                explanation: "Lỗi dịch thô: Đừng đặt từ '好' ra trước theo kiểu 'Chào + Buổi sáng' của tiếng Việt. Lời chào theo buổi trong tiếng Hán luôn là 'Buổi + 好'. Âm tiết '上' trong '早上' thường đọc thanh nhẹ (khinh thanh)."
            },
            {
                id: "b1-06",
                type: "sentence_parsing",
                title: "Chào hỏi lịch sự, tôn kính",
                vi: "Chào ngài",
                zh: "您好",
                pinyin: "nín hǎo",
                grammarPoint: "Chào hỏi lịch sự, tôn kính: Đại từ tôn kính 您 + 好",
                tokens: [
                    { text: "Ngài / Ông / Bà", hz: "您", py: "nín", hv: "Nẫm", role: "Đại từ tôn kính", vn: "Ngài, ông, bà (ngôi thứ hai trang trọng)", radicals: "Chữ 你 (bộ nhân đứng 亻 + chữ 尔) + bộ tâm nằm 心" },
                    { text: "Khỏe / Tốt", hz: "好", py: "hǎo", hv: "Hảo", role: "Vị ngữ", vn: "Tốt, đẹp, khỏe", radicals: "Bộ nữ 女 + bộ tử 子" }
                ],
                targetOrder: ["t-b1-06-nin", "t-b1-06-hao"],
                tiles: [
                    { id: "t-b1-06-nin", text: "您", tag: "Kính ngữ" },
                    { id: "t-b1-06-hao", text: "好", tag: "Tính từ" },
                    { id: "t-b1-06-ma", text: "吗", tag: "Bẫy (Hỏi thăm)" }
                ],
                trapLiteral: "您好吗 / 你您好",
                standardTrans: "您好",
                explanation: "Lỗi dịch thô: Nhầm lẫn giữa câu chào kính ngữ '您好' (Xin chào ngài) và câu hỏi thăm '您好吗' (Ngài có khỏe không?), hoặc thừa thãi đại từ xưng hô. Dùng cho người lớn tuổi hơn, thầy cô, đối tác; '您' không có dạng số nhiều 您们."
            },
            {
                id: "b1-07",
                type: "sentence_parsing",
                title: "Lời chúc ban mai trang nhã",
                vi: "Ngày mới vui vẻ nhé",
                zh: "早安",
                pinyin: "zǎo'ān",
                grammarPoint: "Cách chúc buổi sáng trang nhã, nhẹ nhàng: 早 + 安",
                tokens: [
                    { text: "Sớm", hz: "早", py: "zǎo", hv: "Tảo", role: "Thời gian", vn: "Sớm, buổi sáng", radicals: "Bộ nhật 日 + bộ thập 十" },
                    { text: "An lành", hz: "安", py: "ān", hv: "An", role: "Chúc an", vn: "Yên tĩnh, an lành, bình an", radicals: "Bộ miên 宀 (mái nhà) + bộ nữ 女 (phụ nữ)" },
                    { text: "Chào buổi sáng", hz: "早安", py: "zǎo'ān", hv: "Tảo an", role: "Cụm cố định", vn: "Chào buổi sáng, chúc ngày mới an lành", radicals: "Chữ 早 (bộ nhật 日 + bộ thập 十) + chữ 安 (bộ miên 宀 + bộ nữ 女)" }
                ],
                targetOrder: ["t-b1-07-zao", "t-b1-07-an"],
                tiles: [
                    { id: "t-b1-07-zao", text: "早", tag: "Buổi sáng" },
                    { id: "t-b1-07-an", text: "安", tag: "An lành" },
                    { id: "t-b1-07-ni", text: "你", tag: "Bẫy (Thừa đại từ)" }
                ],
                trapLiteral: "安早 / 早安你",
                standardTrans: "早安",
                explanation: "Lỗi dịch thô: Đảo ngược từ vựng thành '安早' hoặc ghép đuôi '你' vào sau. Lời chúc buổi sáng chuẩn là cố định cụm từ '早安'. Thường dùng trong lời chúc đầu ngày cho người thân quen, mang hàm ý chúc một ngày mới an lành tốt đẹp."
            },
            {
                id: "b1-08",
                type: "sentence_parsing",
                title: "Chào hỏi buổi tối khi gặp mặt",
                vi: "Chào buổi tối",
                zh: "晚上好",
                pinyin: "wǎnshang hǎo",
                grammarPoint: "Công thức chào hỏi buổi tối khi gặp mặt: 晚上 + 好",
                tokens: [
                    { text: "Tối / Muộn", hz: "晚", py: "wǎn", hv: "Vãn", role: "Từ tố", vn: "Muộn, tối", radicals: "Bộ nhật 日 + chữ miễn 免" },
                    { text: "Buổi tối", hz: "晚上", py: "wǎnshang", hv: "Vãn thượng", role: "Mốc thời gian", vn: "Buổi tối", radicals: "Chữ 晚 (bộ nhật 日 + chữ miễn 免) + chữ 上 (bộ nhất 一 + nét sổ 丨 + nét chấm 丶)" },
                    { text: "Tốt / Chào", hz: "好", py: "hǎo", hv: "Hảo", role: "Vị ngữ", vn: "Tốt, đẹp, an lành", radicals: "Bộ nữ 女 + bộ tử 子" }
                ],
                targetOrder: ["t-b1-08-wanshang", "t-b1-08-hao"],
                tiles: [
                    { id: "t-b1-08-wanshang", text: "晚上", tag: "Thời gian" },
                    { id: "t-b1-08-hao", text: "好", tag: "Tính từ" },
                    { id: "t-b1-08-an", text: "安", tag: "Bẫy (Chúc ngủ ngon)" }
                ],
                trapLiteral: "好晚上 / 晚安",
                standardTrans: "晚上好",
                explanation: "Lỗi dịch thô: Nhầm lẫn giữa '晚上好' (chào khi gặp nhau vào buổi tối) và '晚安' (chúc ngủ ngon khi đi ngủ), hoặc dịch thuận theo tiếng Việt thành '好晚上'."
            }
        ]
    },
    "bai2": {
        title: "Bài 2: 你忙吗? - Hỏi trạng thái & Phủ định",
        lessons: [
            {
                id: "b2-01",
                type: "sentence_parsing",
                title: "Hỏi thăm trạng thái: Trợ từ 吗",
                vi: "Cậu bận không?",
                zh: "你忙吗？",
                pinyin: "Nǐ máng ma?",
                grammarPoint: "Cấu trúc câu hỏi: S + Tính từ + 吗",
                tokens: [
                    { text: "Cậu", hz: "你", py: "nǐ", hv: "Nhĩ", role: "Chủ ngữ", vn: "Bạn, cậu", radicals: "Bộ nhân đứng 亻 + chữ nhĩ 尔" },
                    { text: "Bận", hz: "忙", py: "máng", hv: "Mang", role: "Vị ngữ", vn: "Bận rộn", radicals: "Bộ tâm đứng 忄 + bộ vong 亡" },
                    { text: "Không?", hz: "吗", py: "ma", hv: "Ma", role: "Trợ từ hỏi", vn: "Không, chăng", radicals: "Bộ khẩu 口 + chữ mã 马" }
                ],
                targetOrder: ["t-b2-01-ni", "t-b2-01-mang", "t-b2-01-ma"],
                tiles: [
                    { id: "t-b2-01-ma", text: "吗？", tag: "Trợ từ hỏi" },
                    { id: "t-b2-01-ni", text: "你", tag: "Chủ ngữ" },
                    { id: "t-b2-01-mang", text: "忙", tag: "Tính từ" },
                    { id: "t-b2-01-you", text: "有", tag: "Bẫy (Có)" }
                ],
                trapLiteral: "你有忙吗",
                standardTrans: "你忙吗？",
                explanation: "Trong câu hỏi nghi vấn vị ngữ tính từ kết thúc bằng trợ từ 吗, tuyệt đối không thêm 有 hay 是."
            }
        ]
    }
};

window.SCT2_DATABASE = DEFAULT_DATABASE;

