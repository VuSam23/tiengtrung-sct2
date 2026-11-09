import os
import json
import glob
import re
import asyncio

try:
    import edge_tts
except ImportError:
    print("Vui lòng cài đặt edge-tts trước: pip install edge-tts asyncio")
    exit(1)

# Cấu hình giọng đọc chuẩn HSK Studio (Microsoft Azure Neural)
# 'zh-CN-XiaoxiaoNeural' (Nữ, trong trẻo, tự nhiên, ngắt nghỉ chuẩn giáo trình HSK)
# 'zh-CN-YunxiNeural' (Nam, trầm ấm, chuẩn phát thanh viên)
VOICE = "zh-CN-XiaoxiaoNeural"
AUDIO_DIR = "audio"
DATA_DIR = "data"

os.makedirs(AUDIO_DIR, exist_ok=True)

def clean_chinese_text(text: str) -> str:
    """Chuẩn hóa văn bản tiếng Trung trước khi đưa vào bộ tổng hợp giọng nói"""
    if not text:
        return ""
    # Giải quyết cú pháp biến thể {A|B} -> lấy nhánh đầu tiên A
    t = re.sub(r'\{([^}]+)\}', lambda m: m.group(1).split('|')[0], text)
    # Loại bỏ các ký tự thừa
    t = re.sub(r'[{}\[\]]', '', t)
    t = re.sub(r'\s+', '', t)
    return t.strip()

async def synthesize(text: str, output_path: str):
    """Gọi engine Edge TTS Neural để sinh file âm thanh mp3 chất lượng cao"""
    clean_text = clean_chinese_text(text)
    if not clean_text:
        return
    # Tốc độ -5% giúp người học nghe rõ thanh điệu & âm bật hơi chuẩn xác
    communicate = edge_tts.Communicate(clean_text, VOICE, rate="-5%")
    await communicate.save(output_path)

async def process_lessons():
    # Tìm kiếm toàn bộ file JSON trong thư mục data (bao gồm cả data/hsk1, data/hsk2, ...)
    json_files = glob.glob(os.path.join(DATA_DIR, "**", "bai*.json"), recursive=True)
    flat_files = glob.glob(os.path.join(DATA_DIR, "bai*.json"))
    all_files = sorted(list(set(json_files + flat_files)))

    print("=" * 60)
    print(f"BẮT ĐẦU ĐỒNG BỘ AI SPEECH STUDIO CHO DỰ ÁN SCT2")
    print(f"Tìm thấy {len(all_files)} file bài học cần xử lý âm thanh...")
    print("=" * 60)

    total_created = 0
    total_skipped = 0

    for file_path in all_files:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"Lỗi đọc file {file_path}: {e}")
            continue

        is_array = isinstance(data, list)
        sentences = data if is_array else (data.get("sentences") or data.get("lessons") or [])
        updated = False

        for idx, item in enumerate(sentences):
            if not isinstance(item, dict):
                continue

            s_id = item.get("id")
            if not s_id:
                base_name = os.path.splitext(os.path.basename(file_path))[0]
                s_id = f"{base_name}_{idx + 1}"
                item["id"] = s_id
                updated = True

            zh_text = item.get("standardTrans") or item.get("zh")
            if not zh_text:
                continue

            audio_filename = f"{s_id}.mp3"
            audio_path = os.path.join(AUDIO_DIR, audio_filename)
            rel_audio_path = f"audio/{audio_filename}"

            # Chỉ tải và sinh file nếu chưa tồn tại
            if not os.path.exists(audio_path):
                print(f"  [TẠO AUDIO] [{s_id}] -> {clean_chinese_text(zh_text)}")
                try:
                    await synthesize(zh_text, audio_path)
                    total_created += 1
                except Exception as e:
                    print(f"  [LỖI] khi tải {s_id}: {e}")
                    continue
            else:
                total_skipped += 1

            # Cập nhật đường dẫn audio vào JSON nếu chưa có
            if item.get("audio") != rel_audio_path:
                item["audio"] = rel_audio_path
                updated = True

        if updated:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"-> Đã đồng bộ đường dẫn audio vào file: {file_path}")

    print("=" * 60)
    print(f"HOÀN TẤT 100% TIẾN TRÌNH ĐỒNG BỘ ÂM THANH NEURAL STUDIO!")
    print(f"Số file âm thanh mới tạo: {total_created} | Đã tồn tại sẵn: {total_skipped}")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(process_lessons())

