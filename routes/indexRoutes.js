const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../models/User');
const Level = require('../models/Level');
const CulturalItem = require('../models/CulturalItem');
const ContextWord = require('../models/ContextWord');

// Avatar upload configuration
const avatarDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
fs.mkdirSync(avatarDir, { recursive: true });

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
        const base = req.session && req.session.userId ? String(req.session.userId) : 'avatar';
        cb(null, `${base}-${Date.now()}${ext}`);
    }
});

const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image uploads are allowed'));
        }
        cb(null, true);
    }
});

// Auth Middleware
const requireAuth = (req, res, next) => {
    // Be defensive in case session middleware is misconfigured
    if (!req.session || !req.session.userId) return res.redirect('/login');
    next();
};

function computeTotalPercent(scoreObj) {
    if (!scoreObj) return 0;
    const vals = ['words', 'sentences', 'passage', 'mcq']
        .map((k) => scoreObj[k])
        .filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function computeBadges(totalPercent) {
    if (totalPercent >= 90) return 3;
    if (totalPercent >= 85) return 2;
    if (totalPercent >= 80) return 1;
    return 0;
}

function computeCurrentLessonNumber(user) {
    const completed = Array.isArray(user?.completedLessons) ? user.completedLessons : [];
    const start = Number.isFinite(user?.assignedLevel) ? Math.max(1, Math.min(50, user.assignedLevel)) : 1;

    for (let n = start; n <= 50; n++) {
        if (!completed.includes(n)) return n;
    }

    // If everything from assignedLevel..50 is done, fall back to the first incomplete overall (or 50).
    for (let n = 1; n <= 50; n++) {
        if (!completed.includes(n)) return n;
    }

    return 50;
}

// ----------------------------------------------------------
// Simple "semantic" text helpers for search (token overlap)
// ----------------------------------------------------------
function basicNormalize(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/[.,!?؟؛،۔\-—_()\[\]{}"'“”‘’:/\\]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function textTokens(str) {
    const n = basicNormalize(str);
    if (!n) return new Set();
    return new Set(n.split(' '));
}

function semanticScore(query, text) {
    const qSet = textTokens(query);
    const tSet = textTokens(text);
    if (!qSet.size || !tSet.size) return 0;
    let intersection = 0;
    for (const w of qSet) {
        if (tSet.has(w)) intersection++;
    }
    return intersection / qSet.size; // 0..1: how much of query is covered
}

// Landing Page
router.get('/', (req, res) => {
    if (req.session && req.session.userId) return res.redirect('/dashboard');
    res.render('landing');
});

// Placement helper: map 0-100 score => 1-50 level
function scoreToLevel(score) {
    const s = Number.isFinite(score) ? score : 0;
    const clamped = Math.max(0, Math.min(100, s));
    return Math.max(1, Math.min(50, Math.round((clamped / 100) * 49) + 1));
}

// Signup
router.get('/signup', (req, res) => {
    res.render('signup', { error: null });
});

router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.render('signup', { error: 'Email or username already exists' });
        }

        const user = new User({ username, email, password });
        await user.save();

        req.session.userId = user._id;
        // Force placement test immediately after signup
        res.redirect('/placement-test');
    } catch (error) {
        res.render('signup', { error: 'Error creating account' });
    }
});

// Login
router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await user.comparePassword(password))) {
            return res.render('login', { error: 'Invalid credentials' });
        }

        req.session.userId = user._id;

        // If placement record exists and isn't taken yet, send them to placement test first.
        // Backwards-compat: older users may have no placement field at all.
        if (user.placement && user.placement.taken !== true) {
            return res.redirect('/placement-test');
        }

        res.redirect('/dashboard');
    } catch (error) {
        res.render('login', { error: 'Login error' });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Placement Test (must be logged in)
router.get('/placement-test', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.redirect('/login');

        res.render('placement-test', {
            user,
            assignedLevel: user.assignedLevel || 1,
            placement: user.placement || { taken: false }
        });
    } catch (error) {
        res.status(500).send('Error loading placement test');
    }
});

router.post('/placement-test', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.status(401).json({ error: 'Not logged in' });

        const lettersScore = Number(req.body.lettersScore) || 0;
        const wordsScore = Number(req.body.wordsScore) || 0;
        const pronunciationScore = Number(req.body.pronunciationScore) || 0;

        const totalScore = Number(req.body.totalScore);
        const computedTotal = Math.round(
            0.3 * Math.max(0, Math.min(100, lettersScore)) +
            0.3 * Math.max(0, Math.min(100, wordsScore)) +
            0.4 * Math.max(0, Math.min(100, pronunciationScore))
        );

        const finalTotal = Number.isFinite(totalScore) ? Math.round(Math.max(0, Math.min(100, totalScore))) : computedTotal;
        const recommendedLevel = scoreToLevel(finalTotal);

        const chosenLevelRaw = Number(req.body.chosenLevel);
        const chosenLevel = Number.isFinite(chosenLevelRaw)
            ? Math.max(1, Math.min(50, Math.round(chosenLevelRaw)))
            : recommendedLevel;

        user.assignedLevel = chosenLevel;
        user.placement = {
            taken: true,
            lettersScore: Math.max(0, Math.min(100, Math.round(lettersScore))),
            wordsScore: Math.max(0, Math.min(100, Math.round(wordsScore))),
            pronunciationScore: Math.max(0, Math.min(100, Math.round(pronunciationScore))),
            totalScore: finalTotal,
            recommendedLevel,
            chosenLevel,
            takenAt: new Date()
        };

        await user.save();

        res.json({
            success: true,
            recommendedLevel,
            chosenLevel,
            redirect: '/dashboard'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save placement test' });
    }
});

// Profile avatar upload (from dashboard settings)
router.post('/settings/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.redirect('/login');

        if (!req.file) {
            return res.redirect('/dashboard');
        }

        user.avatarUrl = `/uploads/avatars/${req.file.filename}`;
        await user.save();
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error updating avatar', error);
        res.redirect('/dashboard');
    }
});

// Dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.redirect('/login');

        // Backwards-compat: older users in Mongo may be missing these fields
        user.completedLessons = user.completedLessons || [];
        user.lessonScores = user.lessonScores || new Map();

        // Backwards-compat: older users may not have placement data.
        // Only enforce placement if the field exists and is explicitly not taken.
        if (user.placement && user.placement.taken !== true) {
            return res.redirect('/placement-test');
        }

        const allLevels = await Level.find().sort({ levelNumber: 1 });

        // Build metadata for the UI (score + badges per lesson)
        const lessonMeta = {};
        for (const level of allLevels) {
            const key = String(level.levelNumber);
            const scoreObj = user.lessonScores.get(key) || {};
            const totalPercent = computeTotalPercent(scoreObj);
            const badges = computeBadges(totalPercent);
            lessonMeta[key] = {
                totalPercent,
                totalOutOf10: Math.round(totalPercent / 10),
                badges
            };
        }

        const currentLessonNumber = computeCurrentLessonNumber(user);
        const currentLesson = allLevels.find((l) => Number(l.levelNumber) === Number(currentLessonNumber)) || null;
        const currentLessonMeta = lessonMeta[String(currentLessonNumber)] || { totalPercent: 0, totalOutOf10: 0, badges: 0 };

        // Word of the Day (random from level 1)
        let wordOfDay = {
            urdu: '—',
            english: allLevels.length === 0 ? 'No lessons found yet.' : 'No words found for Level 1',
            romanUrdu: ''
        };

        if (allLevels.length > 0 && Array.isArray(allLevels[0].words) && allLevels[0].words.length > 0) {
            const level1 = allLevels[0];
            wordOfDay = level1.words[Math.floor(Math.random() * level1.words.length)];
        }

        res.render('dashboard', {
            user,
            wordOfDay,
            lessonMeta,
            currentLessonNumber,
            currentLesson,
            currentLessonMeta
        });
    } catch (error) {
        res.status(500).send('Error loading dashboard');
    }
});

// All Lessons Page (1-50)
router.get('/lessons', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.redirect('/login');

        user.completedLessons = user.completedLessons || [];
        user.lessonScores = user.lessonScores || new Map();

        const allLevels = await Level.find().sort({ levelNumber: 1 });

        const lessonMeta = {};
        for (const level of allLevels) {
            const key = String(level.levelNumber);
            const scoreObj = user.lessonScores.get(key) || {};
            const totalPercent = computeTotalPercent(scoreObj);
            const badges = computeBadges(totalPercent);
            lessonMeta[key] = {
                totalPercent,
                totalOutOf10: Math.round(totalPercent / 10),
                badges
            };
        }

        const currentLessonNumber = computeCurrentLessonNumber(user);

        const qRaw = String(req.query.q || '').trim();
        const difficulty = String(req.query.difficulty || 'all');
        const allowedDifficulties = new Set(['all', 'beginner', 'intermediate', 'advanced']);
        const d = allowedDifficulties.has(difficulty) ? difficulty : 'all';

        let filtered;
        if (!qRaw) {
            // No search text: just filter by difficulty as before
            filtered = (allLevels || []).filter((lvl) => {
                const n = Number(lvl.levelNumber);
                const diffRaw = String(lvl.difficultyLevel || '').trim().toLowerCase();
                const diff = diffRaw || (n <= 10 ? 'beginner' : n <= 30 ? 'intermediate' : 'advanced');
                if (d !== 'all' && diff !== d) return false;
                return true;
            });
        } else {
            // Semantic-ish search: score lessons by how well they match the query
            const scored = (allLevels || []).map((lvl) => {
                const n = Number(lvl.levelNumber);

                const diffRaw = String(lvl.difficultyLevel || '').trim().toLowerCase();
                const diff = diffRaw || (n <= 10 ? 'beginner' : n <= 30 ? 'intermediate' : 'advanced');
                if (d !== 'all' && diff !== d) return null;

                const textBlob = [
                    lvl.title,
                    lvl.vocabularyTheme,
                    lvl.grammarFocus,
                    lvl.targetAudience,
                    String(lvl.levelNumber || '')
                ].join(' ');

                const score = semanticScore(qRaw, textBlob);
                return { lvl, score };
            }).filter(Boolean)
              .filter(entry => entry.score > 0.05);

            scored.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.lvl.levelNumber - b.lvl.levelNumber;
            });

            filtered = scored.map((entry) => entry.lvl);
        }

        res.render('lessons', {
            user,
            levels: filtered,
            lessonMeta,
            currentLessonNumber,
            q: qRaw,
            difficulty: d
        });
    } catch (error) {
        res.status(500).send('Error loading lessons');
    }
});

// Lesson Page
router.get('/lesson/:level', requireAuth, async (req, res) => {
    try {
        const level = await Level.findOne({ levelNumber: req.params.level });
        if (!level) return res.redirect('/dashboard');

        const user = await User.findById(req.session.userId);
        if (!user) return res.redirect('/login');

        // Backwards-compat: older users in Mongo may be missing these fields
        user.completedLessons = user.completedLessons || [];
        user.lessonScores = user.lessonScores || new Map();

        const userScores = user.lessonScores.get(level.levelNumber.toString()) || {};

        res.render('lesson', { level, user, userScores });
    } catch (error) {
        res.status(500).send('Error loading lesson');
    }
});

// Learn Yourself (translate + word lookup + quiz)
router.get('/learn-yourself', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.redirect('/login');
        res.render('learn-yourself', { user });
    } catch (error) {
        res.status(500).send('Error loading learn-yourself page');
    }
});

// ==========================================================
// Learning Analytics Dashboard
// ==========================================================
router.get('/analytics', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.redirect('/login');

        user.completedLessons = user.completedLessons || [];
        user.lessonScores = user.lessonScores || new Map();

        const levels = await Level.find().sort({ levelNumber: 1 });

        // Vocabulary growth: score per level
        const vocabSeries = levels.map((lvl) => {
            const key = String(lvl.levelNumber);
            const scoreObj = user.lessonScores.get(key) || {};
            const totalPercent = computeTotalPercent(scoreObj);
            return {
                levelNumber: lvl.levelNumber,
                totalPercent
            };
        });

        // Grammar areas: aggregate by grammarFocus text
        const grammarMap = new Map();
        for (const lvl of levels) {
            const gf = String(lvl.grammarFocus || '').trim();
            if (!gf) continue;
            const key = gf.toLowerCase();
            const meta = grammarMap.get(key) || { label: gf, total: 0, count: 0 };
            const scoreObj = user.lessonScores.get(String(lvl.levelNumber)) || {};
            const totalPercent = computeTotalPercent(scoreObj);
            meta.total += totalPercent;
            meta.count += 1;
            grammarMap.set(key, meta);
        }

        const grammarAreas = Array.from(grammarMap.values())
            .map((g) => ({ label: g.label, avg: g.count ? Math.round(g.total / g.count) : 0 }))
            .sort((a, b) => a.avg - b.avg); // weakest first

        // Game stats: culture + context words
        const gameStats = {
            culture: { attempts: 0, completed: 0 },
            context: {
                meaning: { attempts: 0, completed: 0 },
                scenario: { attempts: 0, completed: 0 },
                duel: { attempts: 0, completed: 0 }
            }
        };

        const cultureProgress = user.cultureProgress instanceof Map ? user.cultureProgress : new Map(Object.entries(user.cultureProgress || {}));
        for (const [, val] of cultureProgress) {
            if (!val || typeof val !== 'object') continue;
            const attempts = Number(val.attempts || 0);
            if (attempts > 0) gameStats.culture.attempts += attempts;
            if (val.quizCompleted) gameStats.culture.completed += 1;
        }

        const contextProgress = user.contextWordProgress instanceof Map ? user.contextWordProgress : new Map(Object.entries(user.contextWordProgress || {}));
        for (const [, val] of contextProgress) {
            if (!val || typeof val !== 'object') continue;
            const at = val.attempts || {};
            ['meaning', 'scenario', 'duel'].forEach((mode) => {
                const tries = Number(at[mode] || 0);
                if (tries > 0) gameStats.context[mode].attempts += tries;
                if (val[`${mode}Completed`]) gameStats.context[mode].completed += 1;
            });
        }

        res.render('analytics', {
            user,
            vocabSeries,
            grammarAreas,
            gameStats,
            practiceStats: user.practiceStats || { currentStreak: 0, bestStreak: 0 }
        });
    } catch (error) {
        res.status(500).send('Error loading analytics');
    }
});

// ==========================================================
// Cultural Corner
// ==========================================================
router.get('/culture', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.redirect('/login');

        const type = String(req.query.type || 'idiom');
        const currentType = ['idiom', 'story', 'folktale'].includes(type) ? type : 'idiom';
        const qRaw = String(req.query.q || '').trim();

        // Base filter only on type; we will rank results in-memory using semanticScore
        const baseItems = await CulturalItem.find({ type: currentType }).sort({ createdAt: -1 }).limit(200);

        let items = baseItems;
        if (qRaw) {
            const scored = baseItems.map((item) => {
                const textBlob = [
                    item.titleEnglish,
                    item.titleUrdu,
                    Array.isArray(item.tags) ? item.tags.join(' ') : '',
                    item.summaryEnglish,
                    item.summaryUrdu
                ].join(' ');
                const score = semanticScore(qRaw, textBlob);
                return { item, score };
            }).filter(entry => entry.score > 0.05);

            scored.sort((a, b) => b.score - a.score);
            items = scored.map((entry) => entry.item);
        }

        res.render('culture', { user, items, currentType, q: qRaw });
    } catch (error) {
        res.status(500).send('Error loading culture section');
    }
});

router.get('/culture/:id', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.redirect('/login');

        const item = await CulturalItem.findById(req.params.id);
        if (!item) return res.redirect('/culture');

        res.render('culture-item', { user, item });
    } catch (error) {
        res.status(500).send('Error loading culture item');
    }
});

// ==========================================================
// Context Words (same word, different meanings)
// ==========================================================
router.get('/context-words', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.redirect('/login');

        const qRaw = String(req.query.q || '').trim();

        const baseItems = await ContextWord.find({}).sort({ createdAt: -1 }).limit(200);

        let items = baseItems;
        if (qRaw) {
            const scored = baseItems.map((item) => {
                const textBlob = [
                    item.wordUrdu,
                    item.romanUrdu,
                    item.baseEnglish,
                    Array.isArray(item.tags) ? item.tags.join(' ') : '',
                    // include example sentences from senses if available
                    Array.isArray(item.senses)
                        ? item.senses.map(s => `${s.exampleUrdu} ${s.exampleEnglish}`).join(' ')
                        : ''
                ].join(' ');
                const score = semanticScore(qRaw, textBlob);
                return { item, score };
            }).filter(entry => entry.score > 0.05);

            scored.sort((a, b) => b.score - a.score);
            items = scored.map((entry) => entry.item);
        }

        res.render('context-words', { user, items, q: qRaw });
    } catch (error) {
        res.status(500).send('Error loading context words');
    }
});

router.get('/context-words/:id', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.redirect('/login');

        const item = await ContextWord.findById(req.params.id);
        if (!item) return res.redirect('/context-words');

        res.render('context-word', { user, item });
    } catch (error) {
        res.status(500).send('Error loading context word');
    }
});

// ==========================================================
// Word Games
// ==========================================================
router.get('/games', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.redirect('/login');

        // Simple pool of words for games: take first 40 words and grammar concepts from first few levels.
        const levels = await Level.find().sort({ levelNumber: 1 }).limit(10);
        const words = [];
        const grammarConcepts = [];

        for (const level of levels) {
            if (Array.isArray(level.words)) {
                for (const w of level.words) {
                    if (w && w.urdu && w.english) {
                        words.push({
                            urdu: w.urdu,
                            english: w.english,
                            romanUrdu: w.romanUrdu || ''
                        });
                    }
                }
            }

            if (level.grammarFocus) {
                const trimmed = String(level.grammarFocus).trim();
                if (trimmed) grammarConcepts.push(trimmed);
            }
        }

        const limitedWords = words.slice(0, 80);
        const uniqueConcepts = Array.from(new Set(grammarConcepts)).slice(0, 80);

        res.render('games', {
            user,
            gameWords: limitedWords,
            grammarConcepts: uniqueConcepts
        });
    } catch (error) {
        console.error('Error loading games page', error);
        res.status(500).send('Error loading games');
    }
});

module.exports = router;
