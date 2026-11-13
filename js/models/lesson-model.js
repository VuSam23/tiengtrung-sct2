/**
 * LESSON MODEL (Tầng Models)
 * Fetch các file JSON tĩnh và Cache trên RAM (Map).
 * Độc lập hoàn toàn, không thao tác DOM.
 */

export const LessonModel = {
    // RAM Cache: key -> { id, title, quickNotes, lessons }
    cache: new Map(),

    /**
     * Tải và chuẩn hóa một file bài học
     */
    async fetchLesson(item) {
        if (!item) return null;
        const cacheKey = typeof item === 'string' ? item : (item.id || item.file);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const filePath = typeof item === 'string' ? `data/${item}.json` : (item.file || `data/${item.id}.json`);
        const id = typeof item === 'string' ? item : item.id;
        const fallbackTitle = typeof item === 'object' ? item.title : id;

        try {
            let res = await fetch(filePath);
            if (!res.ok && filePath.startsWith('data/hsk1/')) {
                res = await fetch(filePath.replace('data/hsk1/', 'data/'));
            }
            if (!res || !res.ok) throw new Error(`Fetch failed: ${filePath}`);

            const rawData = await res.json();
            let parsedLesson = null;

            if (Array.isArray(rawData)) {
                parsedLesson = {
                    id,
                    title: fallbackTitle,
                    lessons: (typeof LessonDataParser !== 'undefined')
                        ? LessonDataParser.normalizeList(rawData, id)
                        : rawData
                };
            } else if (rawData.sentences || rawData.lessons) {
                parsedLesson = {
                    id: rawData.lessonId || rawData.id || id,
                    title: rawData.lessonTitle || rawData.title || fallbackTitle,
                    quickNotes: rawData.quickNotes || null,
                    lessons: (typeof LessonDataParser !== 'undefined')
                        ? LessonDataParser.normalizeList(rawData.sentences || rawData.lessons, id)
                        : (rawData.sentences || rawData.lessons)
                };
            } else {
                parsedLesson = rawData;
            }

            this.cache.set(cacheKey, parsedLesson);
            if (id && id !== cacheKey) {
                this.cache.set(id, parsedLesson);
            }
            return parsedLesson;
        } catch (e) {
            console.warn(`Lỗi nạp bài học ${id}:`, e);
            return null;
        }
    },

    /**
     * Tải danh mục bài học theo cấp độ
     */
    async fetchLevelLessons(level = 'hsk1') {
        const manifest = (typeof window !== 'undefined' && window.HSK_MANIFESTS && window.HSK_MANIFESTS[level])
            || (typeof window !== 'undefined' && level === 'hsk1' ? window.LESSON_MANIFEST : [])
            || [];

        const discovered = {};

        // 1. Quét theo manifest
        for (const item of manifest) {
            const lesson = await this.fetchLesson(item);
            if (lesson && lesson.lessons && lesson.lessons.length > 0) {
                discovered[item.id] = lesson;
            }
        }

        // 2. Quét tuần tự bổ sung
        let index = 1;
        while (index <= 50) {
            const key = `bai${index}`;
            if (discovered[key]) {
                index++;
                continue;
            }

            const path = `data/${level}/${key}.json`;
            try {
                let res = await fetch(path);
                if (!res.ok && level === 'hsk1') {
                    res = await fetch(`data/${key}.json`);
                }
                if (!res || !res.ok) break;

                const rawData = await res.json();
                const manifestItem = manifest.find(m => m.id === key);
                const title = rawData.lessonTitle || rawData.title || (manifestItem ? manifestItem.title : `Bài ${index}: Luyện Dịch ${level.toUpperCase()}`);
                const rawLessons = Array.isArray(rawData) ? rawData : (rawData.sentences || rawData.lessons || []);
                const lessons = (typeof LessonDataParser !== 'undefined')
                    ? LessonDataParser.normalizeList(rawLessons, key)
                    : rawLessons;

                const parsed = {
                    title,
                    quickNotes: rawData.quickNotes || null,
                    lessons
                };
                discovered[key] = parsed;
                this.cache.set(key, parsed);
            } catch (e) {
                break;
            }
            index++;
        }

        return discovered;
    },

    getLessonFromCache(id) {
        return this.cache.get(id) || null;
    },

    clearCache() {
        this.cache.clear();
    }
};

if (typeof window !== 'undefined') {
    window.LessonModel = LessonModel;
}

