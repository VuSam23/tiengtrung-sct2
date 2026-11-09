/**
 * LESSON MANIFEST
 * Danh mục đăng ký chính thức các bài học trong hệ thống theo từng cấp độ HSK.
 */

const HSK_MANIFESTS = {
    hsk1: [
        {
            id: "bai1",
            title: "Bài 1: 你好! - Chào hỏi & Đặc điểm ngữ pháp",
            file: "data/hsk1/bai1.json"
        },
        {
            id: "bai2",
            title: "Bài 2: 你忙吗? - Hỏi trạng thái & Phủ định",
            file: "data/hsk1/bai2.json"
        },
        {
            id: "bai3",
            title: "Bài 3: Luyện Dịch HSK - Gia đình & Nơi chốn",
            file: "data/hsk1/bai3.json"
        },
        {
            id: "bai4",
            title: "Bài 4: Luyện Dịch HSK - Thời gian & Địa điểm",
            file: "data/hsk1/bai4.json"
        },
        {
            id: "bai5",
            title: "Bài 5: Luyện Dịch HSK - Đại từ chỉ thị 这 / 那",
            file: "data/hsk1/bai5.json"
        },
        {
            id: "bai6",
            title: "Bài 6: Luyện Dịch HSK - Câu chính phản & Sở hữu 的",
            file: "data/hsk1/bai6.json"
        },
        {
            id: "bai7",
            title: "Bài 7: Luyện Dịch HSK - Trạng ngữ thời gian & Nơi chốn",
            file: "data/hsk1/bai7.json"
        },
        {
            id: "bai8",
            title: "Bài 8: Luyện Dịch HSK - Số lượng, Giá cả & Cụm số lượng từ",
            file: "data/hsk1/bai8.json"
        },
        {
            id: "bai9",
            title: "Bài 9: Luyện Dịch HSK - Đổi tiền ngân hàng & Số lượng lớn",
            file: "data/hsk1/bai9.json"
        },
        {
            id: "bai10",
            title: "Bài 10: Luyện Dịch HSK - Hỏi nơi cư trú & Số phòng, số nhà",
            file: "data/hsk1/bai10.json"
        },
        {
            id: "bai11",
            title: "Bài 11: Luyện Dịch HSK - Giới thiệu bạn bè & Giới từ 给",
            file: "data/hsk1/bai11.json"
        },
        {
            id: "bai12",
            title: "Bài 12: Luyện Dịch HSK - Địa điểm học tập & Trường đại học",
            file: "data/hsk1/bai12.json"
        },
        {
            id: "bai13",
            title: "Bài 13: 第十三课: 这是不是中药? - Vị trí & Cụm chữ 的",
            file: "data/hsk1/bai13.json"
        },
        {
            id: "bai14",
            title: "Bài 14: 第十四课: 你的车是新的还是旧的? - Câu hỏi lựa chọn 还是 & Màu sắc",
            file: "data/hsk1/bai14.json"
        },
        {
            id: "bai15",
            title: "Bài 15: Luyện Dịch HSK - Nghề nghiệp & Thành viên công ty",
            file: "data/hsk1/bai15.json"
        }
    ],
    hsk2: [
        {
            id: "bai1",
            title: "Bài 16: 第十六课: 你常去图书馆吗? - Phó từ tần suất & Liên từ 或者",
            file: "data/hsk2/bai1.json"
        },
        {
            id: "bai2",
            title: "Bài 17: 第十七课: 他在做什么呢? - Hành động đang diễn ra 正在 & 的时候",
            file: "data/hsk2/bai2.json"
        },
        {
            id: "bai3",
            title: "Bài 18: 第十八课: 我去邮局寄包裹 - Câu liên động & Giới từ 顺便",
            file: "data/hsk2/bai3.json"
        },
        {
            id: "bai4",
            title: "Bài 19: 第十九课: 可以试试吗? - Động từ trùng điệp & Cấu trúc 又...又...",
            file: "data/hsk2/bai4.json"
        }
    ],
    hsk3: [
        {
            id: "bai1",
            title: "Bài 1: 周末你有什么打算 - Kế hoạch cuối tuần & Đại từ phiếm chỉ",
            file: "data/hsk3/bai1.json"
        }
    ]
};

window.HSK_MANIFESTS = HSK_MANIFESTS;

// Xác định cấp độ hiện tại từ localStorage hoặc mặc định hsk1
const savedLevel = (typeof localStorage !== 'undefined') ? (localStorage.getItem('sct2_selected_level') || 'hsk1') : 'hsk1';
window.LESSON_MANIFEST = HSK_MANIFESTS[savedLevel] || HSK_MANIFESTS.hsk1;


