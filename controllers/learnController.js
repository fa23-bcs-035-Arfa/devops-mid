// controllers/learnController.js

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

async function googleTranslate(text, sl, tl) {
    // Unofficial but commonly used endpoint (no API key)
    // Returns a nested array; we join translated segments.
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
    const resp = await fetch(url, {
        headers: {
            // Helps avoid some blocks
            'User-Agent': 'Mozilla/5.0'
        }
    });

    if (!resp.ok) {
        throw new Error(`Translate API returned ${resp.status}`);
    }

    const data = await resp.json();
    const segments = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];
    const translated = segments.map((s) => (Array.isArray(s) ? s[0] : '')).join('');
    return translated;
}

exports.translate = async (req, res) => {
    try {
        const text = (req.body?.text || req.query?.text || '').toString();
        const sl = (req.body?.sl || req.query?.sl || 'en').toString();
        const tl = (req.body?.tl || req.query?.tl || 'ur').toString();

        if (!text.trim()) {
            return res.status(400).json({ error: 'No text provided' });
        }

        // Keep requests reasonably sized
        const trimmed = text.length > 8000 ? text.slice(0, 8000) : text;
        const translatedText = await googleTranslate(trimmed, sl, tl);

        res.json({ success: true, translatedText });
    } catch (error) {
        res.status(500).json({ error: 'Translation failed', message: error.message });
    }
};

exports.wordMeaning = async (req, res) => {
    try {
        const word = (req.body?.word || req.query?.word || '').toString().trim();
        if (!word) {
            return res.status(400).json({ error: 'No word provided' });
        }

        // Urdu -> English meaning
        const meaning = await googleTranslate(word, 'ur', 'en');
        res.json({ success: true, word, meaning });
    } catch (error) {
        res.status(500).json({ error: 'Lookup failed', message: error.message });
    }
};

function uniq(arr) {
    return [...new Set(arr)];
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

exports.generateQuiz = async (req, res) => {
    try {
        const words = Array.isArray(req.body?.words) ? req.body.words : [];
        const limitRaw = Number(req.body?.limit);
        const limit = Number.isFinite(limitRaw) ? clamp(Math.round(limitRaw), 1, 10) : 5;

        const cleaned = uniq(
            words
                .map((w) => (w || '').toString().trim())
                .filter(Boolean)
                .filter((w) => w.length >= 2)
        ).slice(0, 30);

        if (cleaned.length === 0) {
            return res.status(400).json({ error: 'No words provided' });
        }

        const picked = cleaned.slice(0, limit);

        // Translate each picked word to get the correct English meaning
        const translations = await Promise.all(
            picked.map(async (w) => {
                try {
                    const meaning = await googleTranslate(w, 'ur', 'en');
                    return { word: w, meaning: meaning || '—' };
                } catch {
                    return { word: w, meaning: '—' };
                }
            })
        );

        const allMeanings = translations.map((t) => t.meaning).filter(Boolean);

        const mcqs = translations.map((t, idx) => {
            // Distractors from other meanings
            const distractors = shuffle(allMeanings.filter((m) => m !== t.meaning)).slice(0, 3);
            const options = shuffle([t.meaning, ...distractors]).slice(0, 4);

            // If we don't have enough distractors, pad with generic options
            while (options.length < 4) {
                options.push('Not sure');
            }

            return {
                id: idx + 1,
                urduWord: t.word,
                question: `What does "${t.word}" mean?`,
                options,
                correct: t.meaning
            };
        });

        res.json({ success: true, mcqs });
    } catch (error) {
        res.status(500).json({ error: 'Quiz generation failed', message: error.message });
    }
};
