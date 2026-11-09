/**
 * LESSON DATA PARSER
 * Tự động chuyển hóa mọi định dạng JSON bài tập thô thành bài tương tác đầy đủ
 */

const LessonDataParser = {
    shuffle(arr, targetOrder = []) {
        if (!Array.isArray(arr) || arr.length <= 1) return arr ? [...arr] : [];
        const res = [...arr];
        for (let i = res.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [res[i], res[j]] = [res[j], res[i]];
        }
        if (targetOrder && targetOrder.length > 1) {
            const isMatch = res.slice(0, targetOrder.length).every((t, i) => t.id === targetOrder[i]);
            if (isMatch && res.length > 1) {
                [res[0], res[1]] = [res[1], res[0]];
            }
        }
        return res;
    },

    normalizeItem(raw, idx, prefix = 'lesson') {
        if (raw.targetOrder && raw.tiles) {
            raw.tiles = this.shuffle(raw.tiles, raw.targetOrder);
            return raw;
        }

        const id = raw.id || `${prefix}-${String(idx + 1).padStart(2, '0')}`;
        const zh = raw.zh || "";
        const vi = raw.vi || "";
        const grammarPoint = raw.grammar || raw.grammarPoint || "";
        const pinyin = raw.pinyin || (Array.isArray(raw.vocab) ? raw.vocab.map(v => v.py).join(' ') : "");
        const trapLiteral = Array.isArray(raw.trapDetect) ? raw.trapDetect.join(' / ') : (raw.trapLiteral || "");
        const explanation = [raw.trapMsg, raw.notes].filter(Boolean).join(' ') || raw.explanation || "";

        // Sinh tokens giải phẫu chữ Hán
        let tokens = [];
        if (Array.isArray(raw.vocab) && raw.vocab.length > 0) {
            tokens = raw.vocab.map(v => ({
                text: v.meaning ? `${v.meaning.split(/[,;]/)[0].trim()} (${v.hz})` : v.hz,
                hz: v.hz,
                py: v.py || "",
                hv: v.hv || "",
                role: "Từ vựng",
                vn: v.meaning || v.vn || "",
                radicals: v.radicals || ""
            }));
        } else if (Array.isArray(raw.tokens)) {
            tokens = raw.tokens;
        }

        // Tách từ cho các thẻ kéo thả
        // Biến đổi cú pháp hoán vị {A|B} thành các cụm từ độc lập để sinh tile
        const cleanForTokens = zh.replace(/\{([^}]+)\}/g, (m, g1) => ' ' + g1.split('|').join(' ') + ' ');
        const validAnswers = (typeof EvalSys !== 'undefined' && EvalSys.getValidAnswers)
            ? EvalSys.getValidAnswers(zh)
            : [zh.replace(/\s+/g, '')];

        const standardTrans = (validAnswers && validAnswers.length > 0)
            ? validAnswers[0]
            : zh.replace(/\{([^}]+)\}/g, (m, g1) => g1.split('|')[0]).replace(/\s+/g, '');

        let words = [];
        if (Array.isArray(raw.vocab) && raw.vocab.length > 0) {
            // Ưu tiên các cụm từ dài trước để tránh cắt đôi từ ghép
            const multiWords = raw.vocab
                .filter(v => v.hz && v.hz.length > 1 && cleanForTokens.includes(v.hz))
                .map(v => v.hz)
                .sort((a, b) => b.length - a.length);

            let i = 0;
            while (i < cleanForTokens.length) {
                // Bỏ qua khoảng trắng và các dấu câu tiếng Trung / tiếng Anh
                if (/[\s.,\/#!$%\^&\*;:{}=\-_`~()?"'，。？！、：；]/.test(cleanForTokens[i])) {
                    i++;
                    continue;
                }

                let matched = false;
                for (const mw of multiWords) {
                    if (cleanForTokens.startsWith(mw, i)) {
                        words.push(mw);
                        i += mw.length;
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    words.push(cleanForTokens[i]);
                    i++;
                }
            }
        } else {
            words = cleanForTokens.replace(/[\s.,\/#!$%\^&\*;:{}=\-_`~()?"'，。？！、：；]/g, '').split('');
        }

        const tiles = [];
        const targetOrder = [];
        words.forEach((w, wIdx) => {
            const tid = `t-${id}-${wIdx}`;
            tiles.push({ id: tid, text: w, tag: "Từ ngữ" });
            targetOrder.push(tid);
        });

        // Bẫy dịch từ traps (hạt nhân mới) và trapDetect (mảng cũ)
        const trapChars = [];
        if (Array.isArray(raw.traps)) {
            raw.traps.forEach(t => {
                const pat = (t.pattern || '').replace(/\s+/g, '');
                for (const c of pat) {
                    if (!zh.includes(c) && !trapChars.includes(c) && /[\u4e00-\u9fa5]/.test(c)) {
                        trapChars.push(c);
                    }
                }
            });
        }
        if (Array.isArray(raw.trapDetect)) {
            raw.trapDetect.forEach(td => {
                for (const c of td) {
                    if (!zh.includes(c) && !trapChars.includes(c) && /[\u4e00-\u9fa5]/.test(c)) {
                        trapChars.push(c);
                    }
                }
            });
        }
        trapChars.slice(0, 2).forEach((tc, tcIdx) => {
            tiles.push({ id: `t-${id}-trap-${tcIdx}`, text: tc, tag: "Bẫy" });
        });

        // Xáo trộn vị trí hiển thị ban đầu bằng Fisher-Yates
        const finalTiles = this.shuffle(tiles, targetOrder);

        return {
            id: id,
            type: raw.type || "sentence_parsing",
            title: raw.title || (grammarPoint ? grammarPoint.split(':')[0] : "Luyện dịch"),
            vi: vi,
            zh: zh,
            pinyin: pinyin,
            grammarPoint: grammarPoint,
            grammar: raw.grammar || grammarPoint,
            tokens: tokens,
            targetOrder: targetOrder,
            tiles: finalTiles,
            trapLiteral: trapLiteral,
            standardTrans: standardTrans,
            validAnswers: validAnswers,
            traps: raw.traps || [],
            trapDetect: raw.trapDetect || [],
            trapMsg: raw.trapMsg || "",
            explanation: explanation
        };
    },

    normalizeList(list, prefix = 'lesson') {
        if (!Array.isArray(list)) return [];
        return list.map((item, idx) => this.normalizeItem(item, idx, prefix));
    }
};

window.LessonDataParser = LessonDataParser;

