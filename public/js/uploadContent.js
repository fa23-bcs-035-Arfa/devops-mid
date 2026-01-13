// uploadContent.js – CSV uploader for multiple content types
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');

// Import models
const MCQ = require('./models/Question');
const Vocabulary = require('./models/Vocabulary');
const Passage = require('./models/Passage');

// Different parsers for different content types
const parsers = {
    mcqs: (row) => ({
        level: parseInt(row.level),
        question: {
            urdu: row.question_urdu,
            english: row.question_english
        },
        options: [
            { urdu: row.option1_urdu, english: row.option1_english },
            { urdu: row.option2_urdu, english: row.option2_english },
            { urdu: row.option3_urdu, english: row.option3_english },
            { urdu: row.option4_urdu, english: row.option4_english }
        ],
        correctAnswer: parseInt(row.correct_answer),
        category: row.category || 'vocabulary',
        difficulty: row.difficulty || 'easy'
    }),

    vocabulary: (row) => ({
        level: parseInt(row.level),
        word: {
            urdu: row.word_urdu,
            romanUrdu: row.word_roman,
            english: row.word_english
        },
        partOfSpeech: row.part_of_speech,
        examples: [
            {
                urdu: row.example_urdu,
                english: row.example_english
            }
        ],
        category: row.category
    }),

    passages: (row) => ({
        level: parseInt(row.level),
        title: {
            urdu: row.title_urdu,
            english: row.title_english
        },
        content: {
            urdu: row.content_urdu,
            english: row.content_english
        },
        difficulty: row.difficulty || 'beginner',
        comprehensionQuestions: [] // Add these separately or in JSON format
    }),

    sentences: (row) => ({
        urdu: row.urdu,
        englishTranslation: row.english,
        category: row.category,
        difficulty: row.difficulty || 'easy'
    })
};

const models = {
    mcqs: MCQ,
    vocabulary: Vocabulary,
    passages: Passage
};

async function uploadCSVtoMongoDB(csvFilePath, contentType) {
    try {
        // Validate content type
        if (!parsers[contentType]) {
            console.error(`Invalid content type: ${contentType}`);
            console.log('Valid types: mcqs, vocabulary, passages, sentences');
            process.exit(1);
        }

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/urdu-learner');
        console.log('Connected to MongoDB');

        const results = [];
        const parser = parsers[contentType];

        // Read and parse CSV
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                try {
                    const document = parser(row);
                    results.push(document);
                } catch (error) {
                    console.error('Error parsing row:', row, error.message);
                }
            })
            .on('end', async () => {
                console.log(`Parsed ${results.length} rows from CSV`);

                if (results.length === 0) {
                    console.log('No valid data found in CSV');
                    process.exit(1);
                }

                try {
                    const Model = models[contentType];
                    await Model.insertMany(results);
                    console.log(`Successfully uploaded ${results.length} ${contentType} to MongoDB.`);
                    console.log('Upload complete.');
                    process.exit(0);
                } catch (error) {
                    console.error('Error inserting documents:', error.message);
                    process.exit(1);
                }
            })
            .on('error', (error) => {
                console.error('Error reading CSV:', error.message);
                console.log('\nHint: ensure the CSV file is UTF-8 encoded.');
                process.exit(1);
            });

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Command line usage
const contentType = process.argv[2]; // mcqs, vocabulary, passages, sentences
const csvFilePath = process.argv[3];

if (!contentType || !csvFilePath) {
    console.log('Usage: node uploadContent.js <type> <csv-file-path>');
    console.log('');
    console.log('Examples:');
    console.log('  node uploadContent.js mcqs ./data/mcqs.csv');
    console.log('  node uploadContent.js vocabulary ./data/vocabulary.csv');
    console.log('  node uploadContent.js passages ./data/passages.csv');
    console.log('');
    console.log('Content types: mcqs, vocabulary, passages, sentences');
    process.exit(1);
}

// Check if file exists
if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File not found: ${csvFilePath}`);
    process.exit(1);
}

console.log('\nStarting upload...');
console.log(`File: ${csvFilePath}`);
console.log(`Type: ${contentType}\n`);

uploadCSVtoMongoDB(csvFilePath, contentType);