/**
 * MASTER TEST & REGRESSION RUNNER
 * Chạy độc lập bằng Node.js thuần: node master-test.js
 */

const fs = require('fs');
const path = require('path');

const isQuiet = process.argv.includes('--quiet') || process.argv.includes('-q');
const DATA_DIR = path.join(__dirname, 'data');
let totalQuestions = 0;
let totalFiles = 0;
let errorCount = 0;
let warningCount = 0;

if (!isQuiet) {
    console.log("\x1b[36m%s\x1b[0m", "=======================================================");
    console.log("\x1b[36m%s\x1b[0m", "🚀 BẮT ĐẦU QUÉT KIỂM THỬ TOÀN DIỆN & TỐI ƯU HỆ THỐNG");
    console.log("\x1b[36m%s\x1b[0m", "=======================================================\n");
}

// 1. KIỂM TRA THƯ MỤC DATA
if (!fs.existsSync(DATA_DIR)) {
    console.error("\x1b[31m%s\x1b[0m", "❌ LỖI NGHIÊM TRỌNG: Không tìm thấy thư mục 'data/'!");
    process.exit(1);
}

function getJsonFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getJsonFiles(fullPath));
        } else if (file.startsWith('bai') && file.endsWith('.json')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = getJsonFiles(DATA_DIR);

if (files.length === 0) {
    if (!isQuiet) console.warn("\x1b[33m%s\x1b[0m", "⚠️ CẢNH BÁO: Thư mục 'data/' chưa có file bài học nào (bai*.json).");
    process.exit(0);
}

// 2. BỘ CHUẨN HÓA CHUỖI ĐỐI CHIẾU (MÔ PHỎNG EVALSYS)
function cleanString(str) {
    if (!str) return '';
    return str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'，。？！、：；\s]/g, '').trim().toLowerCase();
}

// 3. QUÉT TỪNG FILE DỮ LIỆU
files.forEach(filePath => {
    totalFiles++;
    const relFile = path.relative(DATA_DIR, filePath);
    let rawContent = '';

    try {
        rawContent = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
        console.error("\x1b[31m%s\x1b[0m", `❌ [${relFile}]: Không thể đọc file - ${err.message}`);
        errorCount++;
        return;
    }

    let parsedData;
    try {
        parsedData = JSON.parse(rawContent);
    } catch (err) {
        console.error("\x1b[31m%s\x1b[0m", `❌ [${relFile}]: Lỗi cú pháp JSON (dư dấu phẩy hoặc ngoặc sai) - ${err.message}`);
        errorCount++;
        return;
    }

    const questions = Array.isArray(parsedData) ? parsedData : (parsedData.lessons || []);
    if (!Array.isArray(questions) || questions.length === 0) {
        console.error("\x1b[31m%s\x1b[0m", `❌ [${relFile}]: Dữ liệu bài học rỗng hoặc không đúng định dạng mảng.`);
        errorCount++;
        return;
    }

    if (!isQuiet) {
        console.log(`📁 Kiểm tra \x1b[32m${relFile}\x1b[0m (${questions.length} câu hỏi):`);
    }

    // Hàng đợi mô phỏng (Queue test)
    let simQueue = [...questions];
    let passActionCount = 0;

    questions.forEach((q, idx) => {
        totalQuestions++;
        const qId = q.id || `${file}#câu_${idx + 1}`;
        const standardTrans = q.standardTrans || (q.zh ? q.zh.replace(/\{([^}]+)\}/g, (m, g1) => g1.split('|')[0]).replace(/\s+/g, '') : '');

        // Kiểm tra trường thiết yếu
        if (!q.vi || !standardTrans) {
            console.error(`  ❌ [${qId}]: Thiếu trường bắt buộc ('vi' hoặc 'standardTrans'/'zh').`);
            errorCount++;
        }

        const cleanStandard = cleanString(standardTrans);

        // Kiểm tra bài tập kéo thả cú pháp
        if (q.type === 'sentence_parsing') {
            if (!Array.isArray(q.tiles) || q.tiles.length === 0) {
                console.error(`  ❌ [${qId}]: Câu kéo thả thiếu mảng 'tiles'.`);
                errorCount++;
            }
            if (!Array.isArray(q.targetOrder) || q.targetOrder.length === 0) {
                console.error(`  ❌ [${qId}]: Câu kéo thả thiếu 'targetOrder'.`);
                errorCount++;
            } else if (Array.isArray(q.tiles)) {
                const availableTileIds = new Set(q.tiles.map(t => t.id));
                const missingIds = q.targetOrder.filter(tid => !availableTileIds.has(tid));
                if (missingIds.length > 0) {
                    console.error(`  ❌ [${qId}]: targetOrder yêu cầu tile [${missingIds.join(', ')}] nhưng không có trong tiles!`);
                    errorCount++;
                }

                // Kiểm tra xem xếp đúng targetOrder có tạo thành câu chuẩn không
                const constructedZh = q.targetOrder.map(tid => {
                    const found = q.tiles.find(t => t.id === tid);
                    return found ? found.text : '';
                }).join('');

                if (cleanString(constructedZh) !== cleanStandard) {
                    console.warn(`  ⚠️ Cảnh báo [${qId}]: Các mảnh ghép theo targetOrder ('${constructedZh}') khác với standardTrans ('${standardTrans}').`);
                    warningCount++;
                }
            }
        }

        // Kiểm tra bài tập chống dịch thô & kho từ gợi ý
        if (q.type === 'anti_word_by_word') {
            if (!Array.isArray(q.requiredKeywordsZh) || q.requiredKeywordsZh.length === 0) {
                console.warn(`  ⚠️ Cảnh báo [${qId}]: Thiếu 'requiredKeywordsZh' để kiểm tra từ khóa trọng tâm.`);
                warningCount++;
            }
        }

        // Kiểm tra bẫy ngữ pháp (Traps)
        if (q.traps && Array.isArray(q.traps)) {
            q.traps.forEach((trap, tIdx) => {
                if (!trap.pattern || !trap.msg) {
                    console.error(`  ❌ [${qId} - Trap #${tIdx + 1}]: Thiếu 'pattern' hoặc 'msg'.`);
                    errorCount++;
                } else {
                    const cleanPattern = cleanString(trap.pattern);
                    // Bẫy ngớ ngẩn: Cụm từ sai lại nằm trong chính câu đúng
                    if (cleanPattern && cleanStandard.includes(cleanPattern)) {
                        console.error(`  ❌ [${qId} - BẪY NGUY HIỂM]: Pattern '${trap.pattern}' nằm trong đáp án đúng '${standardTrans}'! Học viên làm đúng sẽ bị chấm sai!`);
                        errorCount++;
                    }
                }
            });
        }

        // Kiểm tra bẫy trapDetect (mảng chuỗi cũ)
        if (q.trapDetect && Array.isArray(q.trapDetect)) {
            q.trapDetect.forEach((oldTrap) => {
                const cleanOld = cleanString(oldTrap);
                if (cleanOld && cleanStandard === cleanOld) {
                    console.error(`  ❌ [${qId} - BẪY CŨ NGUY HIỂM]: trapDetect '${oldTrap}' trùng hoàn toàn với đáp án đúng!`);
                    errorCount++;
                }
            });
        }

        // Kiểm tra chiết tự tokens
        if (q.tokens && Array.isArray(q.tokens)) {
            q.tokens.forEach(tok => {
                if (!tok.hz && !tok.text) {
                    console.warn(`  ⚠️ Cảnh báo [${qId}]: Token chiết tự thiếu Hán tự hiển thị.`);
                    warningCount++;
                }
            });
        }
    });

    // MÔ PHỎNG BẤM BỎ QUA LIÊN TỤC TRONG HÀNG ĐỢI
    while (simQueue.length > 0 && passActionCount < 50) {
        const item = simQueue.shift();
        if (passActionCount % 2 === 0) {
            simQueue.push(item); // Giả lập bấm "Bỏ qua"
        }
        passActionCount++;
    }
});

// 4. BÁO CÁO KẾT QUẢ TỔNG HỢP
if (errorCount === 0) {
    if (isQuiet) {
        console.log("PASS"); // Chỉ xuất đúng 4 ký tự vào context của AI!
    } else {
        console.log("\n\x1b[36m%s\x1b[0m", "-------------------------------------------------------");
        console.log(`📊 Tổng kết: Đã quét ${totalFiles} file | ${totalQuestions} câu hỏi`);
        console.log(`❌ Lỗi chặn chạy (Errors): \x1b[31m${errorCount}\x1b[0m`);
        console.log(`⚠️ Cảnh báo tối ưu (Warnings): \x1b[33m${warningCount}\x1b[0m`);
        console.log("\x1b[36m%s\x1b[0m", "-------------------------------------------------------");
        if (warningCount > 0) {
            console.log("\x1b[43m\x1b[30m%s\x1b[0m", " ✅ ĐẠT TIÊU CHUẨN CƠ BẢN (Cần lưu ý các cảnh báo ⚠️ để app hoàn hảo hơn) ");
        } else {
            console.log("\x1b[42m\x1b[37m%s\x1b[0m", " 🏆 XUẤT SẮC: 100% DỮ LIỆU & LOGIC ĐẠT CHUẨN SƯ PHẠM & CÔNG NGHỆ! ");
        }
    }
    process.exit(0);
} else {
    console.log("\n\x1b[36m%s\x1b[0m", "-------------------------------------------------------");
    console.log(`📊 Tổng kết: Đã quét ${totalFiles} file | ${totalQuestions} câu hỏi`);
    console.log(`❌ Lỗi chặn chạy (Errors): \x1b[31m${errorCount}\x1b[0m`);
    console.error("\x1b[41m\x1b[37m%s\x1b[0m", " ⛔ KIỂM THỬ THẤT BẠI: Cần sửa các lỗi [❌] trước khi triển khai! ");
    process.exit(1);
}

