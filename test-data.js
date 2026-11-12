/**
 * TEST-DATA.JS
 * Lead QA Automation Script: Quét và kiểm định toàn diện chất lượng dữ liệu HSK
 * Chạy bằng lệnh: node test-data.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Hàm chuẩn hóa chuỗi tiếng Trung (bỏ dấu câu, khoảng trắng)
function cleanZh(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'，。？！、：；\s]/g, '')
        .trim();
}

// Phân giải cú pháp hoán vị {A|B} thành danh sách đáp án hợp lệ
function getValidAnswers(pattern) {
    if (!pattern) return [''];
    const match = pattern.match(/\{([^}]+)\}/);
    if (!match) return [cleanZh(pattern)];

    const options = match[1].split('|').map(s => s.trim());
    const prefix = pattern.slice(0, match.index);
    const suffix = pattern.slice(match.index + match[0].length);

    const permutations = (arr) => {
        if (arr.length <= 1) return [arr];
        const res = [];
        for (let i = 0; i < arr.length; i++) {
            const cur = arr[i];
            const rem = [...arr.slice(0, i), ...arr.slice(i + 1)];
            for (const sub of permutations(rem)) {
                res.push([cur, ...sub]);
            }
        }
        return res;
    };

    const perms = permutations(options);
    const results = [];
    for (const p of perms) {
        const branch = `${prefix}${p.join('')}${suffix}`;
        results.push(...getValidAnswers(branch));
    }
    return [...new Set(results.map(cleanZh))];
}

console.log('='.repeat(70));
console.log('🚀 LEAD QA AUTOMATION: BẮT ĐẦU QUÉT DỮ LIỆU TOÀN BỘ BÀI HỌC HSK');
console.log('='.repeat(70));

if (!fs.existsSync(DATA_DIR)) {
    console.error(`❌ Không tìm thấy thư mục: ${DATA_DIR}`);
    process.exit(1);
}

function getJsonFiles(dir) {
    let results = [];
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results = results.concat(getJsonFiles(fullPath));
        } else if (file.startsWith('bai') && file.endsWith('.json')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = getJsonFiles(DATA_DIR);

let totalFiles = 0;
let totalQuestions = 0;
let errorCount = 0;
let warningCount = 0;
const reportList = [];

files.forEach(filePath => {
    totalFiles++;
    const relName = path.relative(DATA_DIR, filePath);
    console.log(`\n📁 Đang kiểm tra file: ${relName}`);

    let rawText = '';
    let parsedData = null;

    // 1. Kiểm tra cú pháp JSON
    try {
        rawText = fs.readFileSync(filePath, 'utf8');
        parsedData = JSON.parse(rawText);
    } catch (err) {
        errorCount++;
        reportList.push({
            file: relName,
            qId: 'FILE_PARSE',
            issue: `Lỗi cú pháp JSON không hợp lệ: ${err.message}`,
            severity: 'Cao',
            fix: 'Kiểm tra dấu phẩy thừa/thiếu, ngoặc nhọn hoặc ký tự đặc biệt'
        });
        console.error(`  ❌ LỖI JSON SYNTAX: ${err.message}`);
        return;
    }

    // Chuẩn hóa mảng câu hỏi
    const questions = Array.isArray(parsedData)
        ? parsedData
        : (parsedData.sentences || parsedData.lessons || []);

    if (!Array.isArray(questions) || questions.length === 0) {
        warningCount++;
        reportList.push({
            file: relName,
            qId: 'EMPTY',
            issue: 'File không có danh sách câu hỏi nào',
            severity: 'Trung bình',
            fix: 'Bổ sung mảng câu hỏi [ ... ] hoặc lessons: [ ... ] hoặc sentences: [ ... ]'
        });
        return;
    }

    questions.forEach((q, idx) => {
        totalQuestions++;
        const qId = q.id || `CÂU_${idx + 1}`;
        const targetZh = q.standardTrans || q.zh || '';
        const cleanTarget = cleanZh(targetZh);
        const validAnswers = q.validAnswers || getValidAnswers(q.zh || q.standardTrans);

        // 2. Kiểm tra tính toàn vẹn (id, vi, standardTrans/zh, type)
        if (!q.vi || !q.vi.trim()) {
            errorCount++;
            reportList.push({
                file: relName,
                qId: qId,
                issue: 'Thiếu đề bài tiếng Việt (trường "vi" rỗng)',
                severity: 'Cao',
                fix: 'Bổ sung câu tiếng Việt vào trường "vi"'
            });
        }

        if (!cleanTarget) {
            errorCount++;
            reportList.push({
                file: relName,
                qId: qId,
                issue: 'Thiếu đáp án tiếng Trung chuẩn (trường "standardTrans" hoặc "zh" rỗng)',
                severity: 'Cao',
                fix: 'Bổ sung câu tiếng Trung chuẩn vào "standardTrans" hoặc "zh"'
            });
        }

        // 3. Kiểm tra tính toàn vẹn của tiles & targetOrder (nếu có cấu trúc pre-baked)
        if (q.targetOrder && Array.isArray(q.targetOrder)) {
            const tileMap = new Map((q.tiles || []).map(t => [t.id, t.text]));
            let assembled = '';
            let missingTile = false;

            for (const tid of q.targetOrder) {
                if (!tileMap.has(tid)) {
                    errorCount++;
                    missingTile = true;
                    reportList.push({
                        file: relName,
                        qId: qId,
                        issue: `targetOrder chứa ID "${tid}" không tồn tại trong mảng tiles`,
                        severity: 'Cao',
                        fix: `Bổ sung tile có id "${tid}" vào mảng tiles`
                    });
                } else {
                    assembled += tileMap.get(tid);
                }
            }

            if (!missingTile) {
                const cleanAssembled = cleanZh(assembled);
                const isMatch = validAnswers.includes(cleanAssembled) || cleanAssembled === cleanTarget;
                if (!isMatch) {
                    errorCount++;
                    reportList.push({
                        file: relName,
                        qId: qId,
                        issue: `Ghép targetOrder ra "${cleanAssembled}" KHÔNG KHỚP với standardTrans "${cleanTarget}"`,
                        severity: 'Cao',
                        fix: 'Sửa lại targetOrder hoặc text của các tiles để ghép ra đúng đáp án chuẩn'
                    });
                }
            }
        }

        // 4. Kiểm tra bẫy traps (hạt nhân mới)
        if (q.traps && Array.isArray(q.traps)) {
            q.traps.forEach((trap, tIdx) => {
                const pat = trap.pattern;
                const cleanPat = cleanZh(pat);

                if (!cleanPat) {
                    errorCount++;
                    reportList.push({
                        file: relName,
                        qId: qId,
                        issue: `Traps #${tIdx + 1} có pattern rỗng hoặc thiếu`,
                        severity: 'Trung bình',
                        fix: 'Điền từ khóa lỗi cần bắt vào trường "pattern"'
                    });
                    return;
                }

                if (!trap.msg || !trap.msg.trim()) {
                    warningCount++;
                    reportList.push({
                        file: relName,
                        qId: qId,
                        issue: `Traps pattern "${pat}" thiếu thông điệp cảnh báo ("msg")`,
                        severity: 'Thấp',
                        fix: 'Bổ sung giải thích lỗi vào trường "msg"'
                    });
                }

                // KIỂM TRA BẪY NGỚ NGẨN (Pattern lại là chuỗi con của đáp án đúng!)
                for (const validAns of validAnswers) {
                    if (validAns.includes(cleanPat)) {
                        errorCount++;
                        reportList.push({
                            file: relName,
                            qId: qId,
                            issue: `[BẪY NHẦM NGHIÊM TRỌNG] Pattern "${pat}" nằm trong đáp án đúng "${validAns}". Học viên làm đúng sẽ bị báo sai!`,
                            severity: 'Cao',
                            fix: `Xóa hoặc đổi pattern "${pat}" thành từ sai thực sự (không được là chuỗi con của đáp án đúng)`
                        });
                        break;
                    }
                }
            });
        }

        // 5. Kiểm tra bẫy trapDetect (mảng chuỗi cũ)
        if (q.trapDetect && Array.isArray(q.trapDetect)) {
            q.trapDetect.forEach((oldTrap) => {
                const cleanOld = cleanZh(oldTrap);
                if (cleanOld && validAnswers.includes(cleanOld)) {
                    errorCount++;
                    reportList.push({
                        file: relName,
                        qId: qId,
                        issue: `[BẪY NHẦM CŨ] trapDetect "${oldTrap}" lại trùng với đáp án đúng!`,
                        severity: 'Cao',
                        fix: `Xóa "${oldTrap}" khỏi danh sách trapDetect`
                    });
                }
            });
        }
    });

    console.log(`  ✓ Đã duyệt ${questions.length} câu hỏi`);
});

console.log('\n' + '='.repeat(70));
console.log(`📊 TỔNG KẾT KIỂM THỬ: ${totalFiles} file | ${totalQuestions} câu hỏi`);
console.log(`❌ Lỗi (Cao / Trung bình): ${errorCount} | ⚠️ Cảnh báo (Thấp): ${warningCount}`);
console.log('='.repeat(70));

if (reportList.length > 0) {
    console.log('\n📋 BẢNG CHI TIẾT CÁC VẤN ĐỀ CẦN XỬ LÝ:');
    console.table(reportList.map(r => ({
        'File / Câu': `${r.file} (${r.qId})`,
        'Vấn đề': r.issue.length > 60 ? r.issue.substring(0, 57) + '...' : r.issue,
        'Mức độ': r.severity,
        'Khắc phục': r.fix.length > 45 ? r.fix.substring(0, 42) + '...' : r.fix
    })));
} else {
    console.log('\n🎉 XUẤT SẮC! TOÀN BỘ 100% BÀI HỌC VÀ CÂU HỎI ĐẠT CHUẨN TOÀN VẸN!');
}

process.exit(errorCount > 0 ? 1 : 0);

