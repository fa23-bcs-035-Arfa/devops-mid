// MCQ model
const mongoose = require('mongoose');

const MCQSchema = new mongoose.Schema({
    level: {
        type: Number,
        required: true,
        min: 1,
        max: 50
    },
    question: {
        urdu: { type: String, required: true },
        english: String
    },
    options: [{
        urdu: { type: String, required: true },
        english: String
    }],
    correctAnswer: {
        type: Number, // Index of correct option (0–3)
        required: true
    },
    explanation: {
        urdu: String,
        english: String
    },
    category: {
        type: String,
        enum: ['vocabulary', 'grammar', 'reading', 'listening'],
        default: 'vocabulary'
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy'
    }
}, { timestamps: true });

module.exports = mongoose.model('MCQ', MCQSchema);

// Reading passage model
const PassageSchema = new mongoose.Schema({
    level: {
        type: Number,
        required: true,
        min: 1,
        max: 50
    },
    title: {
        urdu: { type: String, required: true },
        english: String
    },
    content: {
        urdu: { type: String, required: true },
        english: { type: String, required: true }
    },
    audioUrl: String, // Optional URL to audio file
    comprehensionQuestions: [{
        question: {
            urdu: { type: String, required: true },
            english: String
        },
        options: [{
            urdu: String,
            english: String
        }],
        correctAnswer: Number,
        type: {
            type: String,
            enum: ['multiple-choice', 'true-false', 'short-answer'],
            default: 'multiple-choice'
        }
    }],
    vocabulary: [{
        word: { type: String, required: true },
        meaning: { type: String, required: true },
        example: String
    }],
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    }
}, { timestamps: true });

module.exports = mongoose.model('Passage', PassageSchema);

// Test model – multi-section assessment
const TestSchema = new mongoose.Schema({
    title: {
        urdu: { type: String, required: true },
        english: { type: String, required: true }
    },
    description: {
        urdu: String,
        english: String
    },
    level: {
        type: Number,
        required: true
    },
    timeLimit: {
        type: Number, // in minutes
        default: 30
    },
    sections: [{
        name: String,
        type: {
            type: String,
            enum: ['vocabulary', 'grammar', 'reading', 'listening', 'speaking'],
            required: true
        },
        questions: [{
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'sections.questionModel'
        }],
        questionModel: {
            type: String,
            enum: ['MCQ', 'Passage']
        }
    }],
    passingScore: {
        type: Number,
        default: 60
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    }
}, { timestamps: true });

module.exports = mongoose.model('Test', TestSchema);

// Vocabulary word model
const VocabularySchema = new mongoose.Schema({
    level: {
        type: Number,
        required: true,
        min: 1,
        max: 50
    },
    word: {
        urdu: { type: String, required: true },
        romanUrdu: String,
        english: { type: String, required: true }
    },
    partOfSpeech: {
        type: String,
        enum: ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction'],
    },
    examples: [{
        urdu: String,
        english: String
    }],
    synonyms: [String],
    antonyms: [String],
    imageUrl: String,
    category: String, // e.g., 'food', 'family', 'colors'
}, { timestamps: true });

module.exports = mongoose.model('Vocabulary', VocabularySchema);