// ==========================================================
// 📄 seed.js
// ==========================================================
require('dotenv').config();
const mongoose = require('mongoose');
const Level = require('./models/Level');
const connectDB = require('./config/db');

connectDB();

const generateContent = (level) => {
    // Generates mock data for 50 levels
    const baseWord = `لفظ_${level}`;
    const baseSentence = `یہ لیول ${level} کا جملہ ہے۔`;
    const basePassage = `یہ ایک لمبا اقتباس ہے۔ یہ لیول ${level} کے لیے کچھ اضافی مواد فراہم کرتا ہے۔`;

    return {
        words: [
            { urdu: baseWord, english: `Word ${level}`, romanUrdu: `Lafz ${level}` },
            { urdu: 'سلام', english: 'Hello/Peace', romanUrdu: 'Salam' },
            { urdu: 'شکریہ', english: 'Thank you', romanUrdu: 'Shukriya' },
        ],
        sentences: [
            { urdu: baseSentence, englishTranslation: `This is a sentence for Level ${level}.` },
            { urdu: 'میرا نام علی ہے۔', englishTranslation: 'My name is Ali.' },
        ],
        passage: {
            urdu: basePassage,
            englishTranslation: `This is the descriptive passage for Level ${level} designed for reading practice.`,
        }
    };
};

const seedLevels = async () => {
    try {
        console.log('Clearing existing levels...');
        await Level.deleteMany({});

        const levelData = [];
        for (let i = 1; i <= 50; i++) {
            const content = generateContent(i);

            levelData.push({
                levelNumber: i,
                title: `Urdu Beginner: Level ${i}`,
                words: content.words,
                sentences: content.sentences,
                passage: content.passage
            });
        }

        console.log(`Inserting ${levelData.length} new levels...`);
        await Level.insertMany(levelData);

        console.log('✅ Database Seeding Complete! 50 levels are ready.');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        mongoose.connection.close();
    }
};

seedLevels();