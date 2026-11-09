/**
 * AUDIO SERVICE
 * Quản lý Web Audio Synthesizer và SpeechSynthesis phát âm Hán ngữ
 */

/**
 * Audio Engine tối ưu cho Web tĩnh tiếng Trung HSK
 * Chiến lược ưu tiên: Trình duyệt Web Speech API với Neural Voice cao cấp (0ms delay, ngữ điệu tự nhiên) -> Fallback: Cloud Audio
 */
const ChineseVoiceEngine = {
    localVoice: null,
    currentAudio: null,
    initialized: false,

    init() {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        const pickBestVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            if (!voices || voices.length === 0) return;

            let bestScore = -1;
            let bestVoice = null;

            for (const v of voices) {
                const lang = (v.lang || '').toLowerCase().replace('_', '-');
                const name = (v.name || '').toLowerCase();

                // Chỉ chọn giọng tiếng Trung (Mandarin / Putonghua)
                const isChinese = lang.includes('zh') || lang.includes('cmn');
                if (!isChinese) continue;

                let score = 10;
                // Ưu tiên các giọng Neural / Natural cao cấp của Edge & Windows (chất giọng bản xứ tự nhiên nhất)
                if (name.includes('xiaoxiao')) score += 100;
                else if (name.includes('yunxi') || name.includes('yunjian') || name.includes('xiaoyi')) score += 95;
                else if (name.includes('natural') || name.includes('online')) score += 85;
                else if (name.includes('google') && (lang.includes('zh-cn') || lang.includes('cmn'))) score += 75;
                else if (name.includes('tingting') || name.includes('sin-ji') || name.includes('meijia')) score += 70;
                else if (name.includes('huihui') || name.includes('yaoyao') || name.includes('kangkang')) score += 60;

                // Chuẩn đại lục zh-CN
                if (lang === 'zh-cn' || lang === 'cmn-hans-cn' || lang === 'cmn-cn') score += 20;

                if (score > bestScore) {
                    bestScore = score;
                    bestVoice = v;
                }
            }

            if (bestVoice) {
                this.localVoice = bestVoice;
            }
        };

        window.speechSynthesis.onvoiceschanged = pickBestVoice;
        pickBestVoice();
        setTimeout(pickBestVoice, 200);
        setTimeout(pickBestVoice, 800);
        this.initialized = true;
    },

    /**
     * Chuẩn bị chuỗi phát âm: giữ lại dấu ngắt nghỉ và ngữ điệu tự nhiên của câu
     */
    prepareText(text) {
        if (!text) return '';
        return text
            .replace(/\{([^}]+)\}/g, (m, g1) => g1.split('|')[0])
            .replace(/[{}]/g, '')
            .replace(/\|/g, ' ')
            .replace(/[a-zA-Z0-9_\-#$%&*\/\\=~`]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },

    /**
     * Phát âm tiếng Trung
     * @param {string} text - Câu hoặc từ tiếng Trung
     * @param {number} rate - Tốc độ đọc: 0.92 (Tự nhiên rõ chữ) | 0.70 (Chậm con rùa)
     */
    speak(text, rate = 0.92) {
        const cleanText = this.prepareText(text);
        if (!cleanText) return;

        // Dừng âm thanh đang phát trước đó
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        // 1. ƯU TIÊN 1: Phát âm trực tiếp qua SpeechSynthesis nếu có giọng tiếng Trung (0ms delay, ngữ điệu chuẩn)
        if ('speechSynthesis' in window) {
            if (!this.localVoice) this.init();

            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(cleanText);
            utt.lang = 'zh-CN';
            utt.rate = rate;
            utt.pitch = 1.0;

            if (this.localVoice) {
                utt.voice = this.localVoice;
            }

            utt.onerror = () => {
                this.speakFallback(cleanText, rate);
            };

            window.speechSynthesis.speak(utt);
            return;
        }

        // 2. PHƯƠNG ÁN DỰ PHÒNG: Cloud Audio
        this.speakFallback(cleanText, rate);
    },

    /**
     * Phát âm chậm (Con rùa 🐢 - 0.70x): Phù hợp người học nghe rõ thanh điệu & âm bật hơi
     */
    speakSlow(text) {
        this.speak(text, 0.70);
    },

    /**
     * Phương án dự phòng phát qua Cloud TTS khi trình duyệt không hỗ trợ Web Speech
     */
    speakFallback(cleanText, rate = 0.92) {
        try {
            const cloudUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
            const audio = new Audio(cloudUrl);
            audio.playbackRate = rate;
            this.currentAudio = audio;
            audio.play().catch(() => {});
        } catch (e) {
            console.warn("Audio playback failed", e);
        }
    }
};

ChineseVoiceEngine.init();

/**
 * AUDIO MANAGER - NÂNG CẤP CHUẨN HÓA AI SPEECH
 * 1. Ưu tiên phát file Audio Neural MP3 chất lượng cao (.mp3 từ Edge TTS)
 * 2. Tự động fallback sang Web Speech API (ChineseVoiceEngine) nếu thiết bị offline hoặc chưa có file mp3
 */
const AudioManager = {
    currentAudio: null,
    playbackRate: 1.0,

    setRate(rate) {
        this.playbackRate = rate;
        if (this.currentAudio) {
            this.currentAudio.playbackRate = rate;
        }
    },

    /**
     * Phát âm thanh câu học
     * @param {Object|string} sentenceItem - Object chứa { audio, standardTrans, zh } hoặc chuỗi chữ Hán
     * @param {number} rate - Tốc độ phát (tùy chọn)
     */
    playSentence(sentenceItem, rate) {
        this.stop();
        const effectiveRate = rate || this.playbackRate || 1.0;

        if (!sentenceItem) return;

        // 1. Ưu tiên phát file Audio Neural MP3 chất lượng cao
        if (typeof sentenceItem === 'object' && sentenceItem.audio) {
            const audio = new Audio(sentenceItem.audio);
            this.currentAudio = audio;
            audio.playbackRate = effectiveRate;
            audio.play().catch((err) => {
                console.warn("Không phát được file mp3, fallback sang SpeechSynthesis:", err);
                const text = sentenceItem.standardTrans || sentenceItem.zh || '';
                this.fallbackSpeak(text, effectiveRate);
            });
            return;
        }

        // 2. Fallback nếu câu chưa có file audio tĩnh
        const text = typeof sentenceItem === 'string'
            ? sentenceItem
            : (sentenceItem.standardTrans || sentenceItem.zh || '');
        this.fallbackSpeak(text, effectiveRate);
    },

    /**
     * Dự phòng phát âm bằng Web Speech API trình duyệt khi thiếu file âm thanh
     */
    fallbackSpeak(text, rate = 0.92) {
        ChineseVoiceEngine.speak(text, rate);
    },

    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
};

const AudioSvc = {
    ctx: null,
    init() {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) this.ctx = new AC();
        } catch (e) {
            console.warn("AudioContext not supported", e);
        }
        ChineseVoiceEngine.init();
    },
    play(type) {
        if (!this.ctx) this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        if (type === 'ding') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.setValueAtTime(880.00, now + 0.08);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.36);
        } else if (type === 'buzz') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.linearRampToValueAtTime(110, now + 0.18);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.24);
        } else {
            // Click nhẹ
            osc.type = 'sine';
            osc.frequency.setValueAtTime(700, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            osc.start(now);
            osc.stop(now + 0.04);
        }
        osc.connect(gain);
        gain.connect(this.ctx.destination);
    },
    playSentence(sentenceItem, rate) {
        AudioManager.playSentence(sentenceItem, rate);
    },
    speak(text, rate = 0.98) {
        AudioManager.playSentence(text, rate);
    },
    speakSlow(text) {
        AudioManager.playSentence(text, 0.72);
    },
    stop() {
        AudioManager.stop();
    }
};

window.ChineseVoiceEngine = ChineseVoiceEngine;
window.AudioManager = AudioManager;
window.AudioSvc = AudioSvc;

