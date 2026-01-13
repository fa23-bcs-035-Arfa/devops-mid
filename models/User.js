const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    // Optional profile avatar image URL
    avatarUrl: {
        type: String,
        default: ''
    },
    totalPoints: {
        type: Number,
        default: 0
    },
    completedLessons: {
        type: [Number],
        default: []
    },
    lessonScores: {
        type: Map,
        of: {
            words: Number,
            sentences: Number,
            passage: Number,
            mcq: Number
        },
        // Ensure new users can safely call user.lessonScores.get(...)
        default: {}
    },

    // User's chosen starting level in the curriculum (1-50)
    assignedLevel: {
        type: Number,
        min: 1,
        max: 50,
        default: 1
    },

    // Placement test metadata (run after signup)
    placement: {
        taken: { type: Boolean, default: false },
        lettersScore: { type: Number, default: 0 },
        wordsScore: { type: Number, default: 0 },
        pronunciationScore: { type: Number, default: 0 },
        totalScore: { type: Number, default: 0 },
        recommendedLevel: { type: Number, default: 1 },
        chosenLevel: { type: Number, default: 1 },
        takenAt: { type: Date }
    },

    // Culture progress (per cultural item)
    // Map key: CulturalItem _id (string)
    cultureProgress: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Context words progress (per context word)
    // Map key: ContextWord _id (string)
    contextWordProgress: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Practice streak + rank
    // Stored on user so it works across devices
    practiceStats: {
        currentStreak: { type: Number, default: 0 },
        bestStreak: { type: Number, default: 0 },
        lastPracticeDay: { type: String, default: '' }, // YYYY-MM-DD (UTC)
        lastDailyBonusDay: { type: String, default: '' } // YYYY-MM-DD (UTC)
    },

    // Bingo progress: simple per-day record to avoid double-awarding points
    bingoProgress: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    rank: {
        type: String,
        enum: ['Bronze', 'Silver', 'Gold'],
        default: 'Bronze'
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);