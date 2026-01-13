// uploadCSV.js – import CSV MCQ data into MongoDB
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');

// Example: Import MCQs from CSV
const MCQ = require('./models/Question');

async function uploadCSVtoMongoDB(csvFilePath, Model) {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/urdu-learner');
        console.log('Connected to MongoDB');

        const results = [];

        // Read CSV file
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                // Transform CSV row to MongoDB document
                // Adjust this based on your CSV structure
                const document = {
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
                };

                results.push(document);
            })
            .on('end', async () => {
                console.log(`📊 Parsed ${results.length} rows from CSV`);

                try {
                    // Insert all documents
                    await Model.insertMany(results);
                    console.log(`Successfully uploaded ${results.length} documents to MongoDB.`);
                    process.exit(0);
                } catch (error) {
                    console.error('❌ Error inserting documents:', error);
                    process.exit(1);
                }
            })
            .on('error', (error) => {
                console.error('❌ Error reading CSV:', error);
                process.exit(1);
            });

    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

// Usage: Run this script with your CSV file path
const csvFilePath = process.argv[2] || './data/mcqs.csv';
uploadCSVtoMongoDB(csvFilePath, MCQ);

// To run: node uploadCSV.js ./data/mcqs.csv