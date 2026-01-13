// controllers/assessmentController.js – assessment and TTS/STT handlers
const fs = require('fs');
const User = require('../models/User');

// Helper: Calculate similarity score
function calculateSimilarity(text1, text2) {
    const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const words1 = normalize(text1).split(/\s+/);
    const words2 = normalize(text2).split(/\s+/);

    let matches = 0;
    words1.forEach(word => {
        if (words2.includes(word)) matches++;
    });

    return Math.round((matches / Math.max(words1.length, words2.length)) * 100);
}

// TTS audio via Google Translate
exports.getTtsAudio = async (req, res) => {
    try {
        const text = req.query.text;
        const languageCode = req.query.languageCode || 'ur';

        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        console.log('🎵 TTS Request for:', text);

        // Use Google Translate TTS (FREE, no credentials needed)
        const encodedText = encodeURIComponent(text);
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${languageCode}&client=tw-ob&q=${encodedText}`;

        const response = await fetch(ttsUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`TTS API returned ${response.status}`);
        }

        const audioArrayBuffer = await response.arrayBuffer();
        const audioBuffer = Buffer.from(audioArrayBuffer);

        console.log('✅ Audio generated, size:', audioBuffer.length);

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length,
            'Cache-Control': 'public, max-age=3600'
        });

        res.send(audioBuffer);

    } catch (error) {
        console.error('❌ TTS Error:', error.message);
        res.status(500).json({ error: 'TTS failed', details: error.message });
    }
};

// STT pronunciation check (primarily client-side Web Speech API; this is a fallback)
exports.checkPronunciation = async (req, res) => {
    try {
        const { targetText, transcription } = req.body;

        // If transcription is provided from client (Web Speech API)
        if (transcription) {
            const score = calculateSimilarity(transcription, targetText);
            const passed = score >= 70;

            return res.json({
                score,
                passed,
                userSaid: transcription,
                expected: targetText
            });
        }

        // Fallback: If audio file is uploaded (not recommended without Google Cloud)
        const audioFile = req.file;
        if (!audioFile) {
            return res.status(400).json({
                error: 'No transcription or audio provided',
                message: 'Please use Web Speech API on client side'
            });
        }

        // Clean up temp file
        if (fs.existsSync(audioFile.path)) {
            fs.unlinkSync(audioFile.path);
        }

        res.status(501).json({
            error: 'Server-side STT not configured',
            message: 'Use Web Speech API in the browser'
        });

    } catch (error) {
        console.error('❌ STT Error:', error.message);

        // Clean up temp file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ error: 'Speech recognition failed', details: error.message });
    }
};

// Submit Score
exports.submitScore = async (req, res) => {
    try {
        const { levelNumber, assessmentType, score } = req.body;
        const userId = req.session?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not logged in' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Backwards-compat: older users in Mongo may be missing these fields
        user.completedLessons = user.completedLessons || [];
        user.lessonScores = user.lessonScores || new Map();

        const levelKey = levelNumber.toString();
        const currentScores = user.lessonScores.get(levelKey) || {};

        // Update score if better
        if (!currentScores[assessmentType] || currentScores[assessmentType] < score) {
            currentScores[assessmentType] = score;
            user.lessonScores.set(levelKey, currentScores);

            // Award points
            const points = Math.round(score);
            user.totalPoints += points;
        }

        // Check if lesson completed (all assessments >= 70%)
        const allAssessments = ['words', 'sentences', 'passage', 'mcq'];
        const completed = allAssessments.every(type => currentScores[type] >= 70);

        if (completed && !user.completedLessons.includes(levelNumber)) {
            user.completedLessons.push(levelNumber);
        }

        await user.save();

        res.json({
            success: true,
            totalPoints: user.totalPoints,
            lessonCompleted: completed
        });

    } catch (error) {
        console.error('❌ Submit Score Error:', error.message);
        res.status(500).json({ error: 'Failed to submit score' });
    }
};

// Get Lesson Progress
exports.getLessonProgress = async (req, res) => {
    try {
        const { levelNumber } = req.params;
        const userId = req.session?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not logged in' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Backwards-compat: older users in Mongo may be missing these fields
        user.completedLessons = user.completedLessons || [];
        user.lessonScores = user.lessonScores || new Map();

        const scores = user.lessonScores.get(levelNumber) || {};
        const completed = user.completedLessons.includes(parseInt(levelNumber));

        res.json({ scores, completed });
    } catch (error) {
        console.error('❌ Get Progress Error:', error.message);
        res.status(500).json({ error: 'Failed to get progress' });
    }
};