// Level model – lesson content and metadata
const mongoose = require('mongoose');

const WordAssessmentSchema = new mongoose.Schema({
    urdu: { type: String, required: true },
    english: { type: String, required: true },
    romanUrdu: String,
});

const TextAssessmentSchema = new mongoose.Schema({
    urdu: { type: String, required: true },
    englishTranslation: { type: String, required: true },
});

const LevelSchema = new mongoose.Schema({
    levelNumber: {
        type: Number,
        required: true,
        unique: true,
        min: 1,
        max: 50
    },

    // Title shown in the UI
    title: {
        type: String,
        required: true,
        default: 'Urdu Basics - Level '
    },

    // Optional CSV metadata
    unitId: { type: String, default: '' },
    difficultyLevel: { type: String, default: '' },
    targetAudience: { type: String, default: '' },
    grammarFocus: { type: String, default: '' },
    vocabularyTheme: { type: String, default: '' },

    // True when this is a generated placeholder lesson
    isPlaceholder: { type: Boolean, default: false },

    words: { type: [WordAssessmentSchema], default: [] },
    sentences: { type: [TextAssessmentSchema], default: [] },
    passage: {
        type: TextAssessmentSchema,
        default: { urdu: '—', englishTranslation: '—' }
    },
    targetLanguageCode: {
        type: String,
        default: 'ur-PK'
    }
});

module.exports = mongoose.model('Level', LevelSchema);
