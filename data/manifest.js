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
        },
        {
            id: "bai5",
            title: "Bài 20: 第二十课: 祝你生日快乐 - Ngày tháng, Tuổi tác & Tiệc sinh nhật",
            file: "data/hsk2/bai5.json"
        },
        {
            id: "bai6",
            title: "Bài 21: 第二十一课: 我们明天七点一刻出发 - Thời gian biểu & Giờ giấc",
            file: "data/hsk2/bai6.json"
        },
        {
            id: "bai7",
            title: "Bài 22: 第二十二课: 我打算请老师教我京剧 - Câu kiêm ngữ & Dự định 打算",
            file: "data/hsk2/bai7.json"
        },
        {
            id: "bai8",
            title: "Bài 23: 第二十三课: 学校里边有邮局吗? - Phương vị từ & Tồn tại",
            file: "data/hsk2/bai8.json"
        },
        {
            id: "bai9",
            title: "Bài 24: 第二十四课: 我想学太极拳 - Động từ năng nguyện 会/能/可以",
            file: "data/hsk2/bai9.json"
        },
        {
            id: "bai10",
            title: "Bài 25: 第二十五课: 他学得很好 - Bổ ngữ trạng thái 得",
            file: "data/hsk2/bai10.json"
        },
        {
            id: "bai11",
            title: "Bài 26: 第二十六课: 田芳去哪儿了 - Động tác đang tiếp diễn & 又/再",
            file: "data/hsk2/bai11.json"
        },
        {
            id: "bai12",
            title: "Bài 27: 第二十七课: 玛丽哭了 - Bổ ngữ kết quả & Sự biến đổi với 了",
            file: "data/hsk2/bai12.json"
        },
        {
            id: "bai13",
            title: "Bài 28: 第二十八课: 我吃了早饭就来了 - Hành động liên tiếp 了...就... & Sớm muộn",
            file: "data/hsk2/bai13.json"
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
let savedLevel = 'hsk1';
try {
    if (typeof localStorage !== 'undefined') {
        savedLevel = localStorage.getItem('sct2_selected_level') || 'hsk1';
    }
} catch (e) {
    // localStorage bị chặn (private browsing / quota) → dùng mặc định hsk1
    savedLevel = 'hsk1';
}
window.LESSON_MANIFEST = HSK_MANIFESTS[savedLevel] || HSK_MANIFESTS.hsk1;


