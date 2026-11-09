import json
import re
import sys
import os

def resolve_filepath(path):
    if os.path.exists(path):
        return path
    # Thử tìm kiếm trong các thư mục con (ví dụ data/hsk1/bai12.json)
    basename = os.path.basename(path)
    for root, _, files in os.walk("data"):
        if basename in files:
            return os.path.join(root, basename)
    return path

def validate_lesson_file(filepath):
    actual_path = resolve_filepath(filepath)
    if not os.path.exists(actual_path):
        print(f"❌ Lỗi: Không tìm thấy file {filepath} (đã quét cả các thư mục con).")
        sys.exit(1)

    with open(actual_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Hỗ trợ cả 2 schema: Object { lessonId, sentences/lessons, quickNotes } và Mảng [ { ... } ]
    if isinstance(data, dict):
        sentences = data.get("sentences") or data.get("lessons") or []
        lesson_id = data.get("lessonId") or data.get("id") or os.path.splitext(os.path.basename(actual_path))[0]
    elif isinstance(data, list):
        sentences = data
        lesson_id = os.path.splitext(os.path.basename(actual_path))[0]
    else:
        raise AssertionError("Lỗi Schema gốc: Dữ liệu JSON phải là Object hoặc Array!")

    assert len(sentences) > 0, "Lỗi: Danh sách câu hỏi rỗng!"
    punctuation_regex = re.compile(r'[。，？！,?!.]')

    print(f"🔍 Bắt đầu thẩm định 4 tầng dữ liệu cho file: {actual_path} ({len(sentences)} câu)...")

    for idx, item in enumerate(sentences):
        sid = item.get("id", f"item-{idx+1}")

        # Tầng 1: Kiểm tra trường bắt buộc
        for req_field in ["zh", "vi", "tiles", "targetOrder"]:
            assert req_field in item, f"[{sid}] Thiếu trường bắt buộc: '{req_field}'!"

        # Tầng 2: Kiểm tra tuyệt đối không có dấu câu trong zh và standardTrans
        zh = item.get("zh", "")
        std_trans = item.get("standardTrans", zh)
        assert not punctuation_regex.search(zh), f"[{sid}] Trường 'zh' còn chứa dấu câu: '{zh}'"
        assert not punctuation_regex.search(std_trans), f"[{sid}] Trường 'standardTrans' còn chứa dấu câu: '{std_trans}'"

        # Tầng 3: Kiểm tra tính toàn vẹn của logic ghép thẻ
        tile_map = {t["id"]: t["text"] for t in item["tiles"] if "id" in t and "text" in t}
        assembled = "".join([tile_map[tid] for tid in item["targetOrder"] if tid in tile_map])
        expected = zh.replace(" ", "")
        assert assembled == expected, (
            f"[{sid}] Lỗi targetOrder không khớp chuỗi Hán tự!\n"
            f"Ghép: {assembled}\n"
            f"Gốc : {expected}"
        )

        # Tầng 4: Kiểm tra mảng tiles đã được xáo trộn hay chưa
        tile_ids = [t["id"] for t in item["tiles"]]
        sorted_ids = sorted(tile_ids)
        if len(tile_ids) > 2:
            assert tile_ids != sorted_ids, f"[{sid}] Cảnh báo: mảng 'tiles' chưa được xáo trộn ngẫu nhiên!"

        # Kiểm tra tính hợp lệ của bẫy cú pháp (traps) nếu có
        if "traps" in item and isinstance(item["traps"], list):
            for trap in item["traps"]:
                assert "pattern" in trap and "msg" in trap, f"[{sid}] Cấu trúc trap phải gồm pattern và msg!"

    print(f"✅ File {actual_path}: Đạt chuẩn dữ liệu 4 tầng tuyệt đối (100% Valid).")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "data/hsk1/bai12.json"
    validate_lesson_file(target)

