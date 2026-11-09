/**
 * EVALUATION SYSTEM
 * Chuẩn hóa chuỗi, đối soát đáp án, bắt bẫy dịch thô
 */

const EvalSys = {
    clean: (s) => (s || '')
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'，。？！、：；]/g, '')
        .replace(/\s+/g, '')
        .trim(),

    /**
     * Sinh tất cả các biến thể đáp án hợp lệ từ cú pháp hoán vị: {A|B}
     * Hỗ trợ tự động phân rã tổ hợp (Compact Permutation Pattern)
     */
    getValidAnswers(pattern) {
        if (!pattern) return [''];

        // Tìm cụm hoán vị {A|B}
        const match = pattern.match(/\{([^}]+)\}/);
        if (!match) {
            return [this.clean(pattern)];
        }

        const options = match[1].split('|').map(s => s.trim());
        const prefix = pattern.slice(0, match.index);
        const suffix = pattern.slice(match.index + match[0].length);

        // Sinh hoán vị các nhánh
        const permutations = (arr) => {
            if (arr.length <= 1) return [arr];
            const result = [];
            for (let i = 0; i < arr.length; i++) {
                const current = arr[i];
                const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
                const subPerms = permutations(remaining);
                for (const sub of subPerms) {
                    result.push([current, ...sub]);
                }
            }
            return result;
        };

        const perms = permutations(options);
        const results = [];

        for (const p of perms) {
            const combinedBranch = `${prefix}${p.join('')}${suffix}`;
            // Đệ quy cho các cụm { ... } tiếp theo nếu có
            const subAnswers = this.getValidAnswers(combinedBranch);
            results.push(...subAnswers);
        }

        return [...new Set(results.map(r => this.clean(r)))];
    },

    /**
     * NÂNG CẤP HÀM CHẨN ĐOÁN LỖI BẪY NGỮ PHÁP (Dynamic Contextual Trap Detection)
     * Bắt lỗi theo từng hạt nhân ngữ pháp (Granular Traps)
     */
    evaluateAnswer(userInput, questionData) {
        // 1. Chuẩn hóa chuỗi (bỏ toàn bộ khoảng trắng, dấu câu tiếng Trung & tiếng Anh)
        const cleanInput = this.clean(userInput);
        const cleanTarget = this.clean(questionData.standardTrans || questionData.zh);
        const validAnswers = questionData.validAnswers || this.getValidAnswers(questionData.zh || questionData.standardTrans);

        // 2. Kiểm tra nếu ĐÚNG TUYỆT ĐỐI (khớp mục tiêu chuẩn hoặc bất kỳ biến thể hoán vị hợp lệ nào)
        if (cleanInput === cleanTarget || validAnswers.includes(cleanInput)) {
            return {
                pass: true,
                title: "Đạt Chuẩn Ngữ Pháp!",
                msg: "Xuất sắc! Bạn đã dịch và sắp xếp câu hoàn toàn chuẩn xác."
            };
        }

        // 3. ƯU TIÊN 1: Kiểm tra cấu trúc bẫy mới dạng hạt nhân: traps: [ { pattern, msg } ]
        if (questionData.traps && Array.isArray(questionData.traps)) {
            for (const trap of questionData.traps) {
                const cleanPattern = this.clean(trap.pattern);
                if (cleanPattern && cleanInput.includes(cleanPattern)) {
                    return {
                        pass: false,
                        title: "Bắt Trúng Bẫy Cú Pháp!",
                        msg: trap.msg,
                        trapPattern: trap.pattern
                    };
                }
            }
        }

        // 4. ƯU TIÊN 2 (Tương thích ngược): Kiểm tra bẫy kiểu cũ: trapDetect (mảng) + trapMsg
        if (questionData.trapDetect && Array.isArray(questionData.trapDetect)) {
            for (const oldTrap of questionData.trapDetect) {
                const cleanOldTrap = this.clean(oldTrap);
                if (cleanOldTrap && cleanInput.includes(cleanOldTrap)) {
                    return {
                        pass: false,
                        title: "Phát Hiện Lỗi Dịch Thô!",
                        msg: questionData.trapMsg || questionData.explanation || "Câu của bạn dịch chưa sát văn phong bản xứ.",
                        trapPattern: oldTrap
                    };
                }
            }
        }

        // 5. Nếu sai nhưng không dính vào bẫy định sẵn: Hiển thị điểm ngữ pháp chung làm gợi ý
        return {
            pass: false,
            title: "Cần Hoàn Thiện",
            msg: questionData.grammar || questionData.grammarPoint || questionData.explanation || "Sai trật tự cú pháp Hán ngữ hoặc thiếu từ khóa. Hãy quan sát đáp án chuẩn bên dưới."
        };
    },

    check(q, input) {
        return this.evaluateAnswer(input, q);
    }
};

window.EvalSys = EvalSys;
window.evaluateAnswer = (userInput, questionData) => EvalSys.evaluateAnswer(userInput, questionData);

