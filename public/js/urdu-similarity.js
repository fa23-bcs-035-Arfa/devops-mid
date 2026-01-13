// public/js/urdu-similarity.js
// Shared similarity scoring used by multiple pages.
//
// IMPORTANT:
// - This scores similarity between *text strings* (STT transcript vs target text).
// - It cannot be “100% accurate” for pronunciation because browser STT can mis-hear.

(function () {
    function normalizeUrdu(str) {
        if (str === undefined || str === null) return '';

        let s = String(str);

        // Unicode normalize
        if (typeof s.normalize === 'function') {
            s = s.normalize('NFKC');
        }

        // Lowercase (mostly relevant for roman / mixed)
        s = s.toLowerCase();

        // Remove ZWJ/ZWNJ
        s = s.replace(/[\u200c\u200d]/g, '');

        // Remove tatweel
        s = s.replace(/\u0640/g, '');

        // Remove Arabic diacritics / harakaat
        s = s.replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, '');

        // Normalize common Arabic/Urdu variants
        s = s
            .replace(/ك/g, 'ک')
            .replace(/ي/g, 'ی')
            .replace(/ى/g, 'ی')
            .replace(/ة/g, 'ہ')
            .replace(/ۀ/g, 'ہ')
            .replace(/ؤ/g, 'و')
            .replace(/ئ/g, 'ی');

        // Remove punctuation (Urdu + English)
        // Includes Urdu full stop (۔) and question mark (؟)
        s = s.replace(/[.,!?؟؛،۔\-—_()\[\]{}"'“”‘’:/\\]/g, ' ');

        // Collapse whitespace
        s = s.replace(/\s+/g, ' ').trim();

        return s;
    }

    function levenshtein(a, b) {
        const s = a || '';
        const t = b || '';

        if (s === t) return 0;
        if (s.length === 0) return t.length;
        if (t.length === 0) return s.length;

        const v0 = new Array(t.length + 1);
        const v1 = new Array(t.length + 1);

        for (let i = 0; i < v0.length; i++) v0[i] = i;

        for (let i = 0; i < s.length; i++) {
            v1[0] = i + 1;

            for (let j = 0; j < t.length; j++) {
                const cost = s[i] === t[j] ? 0 : 1;
                v1[j + 1] = Math.min(
                    v1[j] + 1, // insertion
                    v0[j + 1] + 1, // deletion
                    v0[j] + cost // substitution
                );
            }

            for (let j = 0; j < v0.length; j++) v0[j] = v1[j];
        }

        return v1[t.length];
    }

    function jaccardTokenSimilarity(a, b) {
        const A = new Set((a || '').split(' ').filter(Boolean));
        const B = new Set((b || '').split(' ').filter(Boolean));

        if (A.size === 0 && B.size === 0) return 1;
        if (A.size === 0 || B.size === 0) return 0;

        let intersection = 0;
        for (const w of A) {
            if (B.has(w)) intersection++;
        }

        const union = A.size + B.size - intersection;
        return union === 0 ? 0 : intersection / union;
    }

    function similarityPercent(text1, text2) {
        const a = normalizeUrdu(text1);
        const b = normalizeUrdu(text2);

        if (!a && !b) return 100;
        if (!a || !b) return 0;

        // Character similarity (edit distance)
        const dist = levenshtein(a, b);
        const maxLen = Math.max(a.length, b.length);
        const charSim = maxLen === 0 ? 1 : 1 - dist / maxLen;

        // Token similarity (word overlap)
        const tokenSim = jaccardTokenSimilarity(a, b);

        // Weighted blend
        const blended = 0.7 * charSim + 0.3 * tokenSim;
        const pct = Math.round(Math.max(0, Math.min(1, blended)) * 100);
        return pct;
    }

    window.urduSimilarity = {
        normalizeUrdu,
        similarityPercent
    };
})();
