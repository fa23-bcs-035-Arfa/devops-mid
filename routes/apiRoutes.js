const express = require('express');
const router = express.Router();
const multer = require('multer');
const os = require('os');

const upload = multer({ dest: os.tmpdir() });

const assessmentController = require('../controllers/assessmentController');
const learnController = require('../controllers/learnController');
const practiceController = require('../controllers/practiceController');

// STT - Check Pronunciation
router.post('/check-pronunciation', upload.single('audio'), assessmentController.checkPronunciation);

// TTS - Get Audio
router.get('/get-tts-audio', assessmentController.getTtsAudio);

// Submit Score
router.post('/submit-score', assessmentController.submitScore);

// Get Lesson Progress
router.get('/lesson-progress/:levelNumber', assessmentController.getLessonProgress);

// Learn Yourself: Translate / Dictionary / Quiz
router.post('/translate', learnController.translate);
router.post('/word-meaning', learnController.wordMeaning);
router.post('/generate-quiz', learnController.generateQuiz);

// Practice + points tracking (Culture + Context Words + Bingo)
router.post('/practice/culture', practiceController.submitCultureQuiz);
router.post('/practice/context', practiceController.submitContextPractice);
router.post('/practice/bingo', practiceController.submitBingo);

module.exports = router;
