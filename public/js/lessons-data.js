module.exports = [
    {
        id: 1,
        title: "Lesson 1: Basic Greetings",
        level: "Beginner",
        vocabulary: [
            { word: "hello", meaning: "a greeting" },
            { word: "goodbye", meaning: "a farewell" },
            { word: "thank you", meaning: "expression of gratitude" },
            { word: "please", meaning: "polite request" },
            { word: "yes", meaning: "affirmative response" }
        ],
        mcq: [
            { question: "What does 'hello' mean?", options: ["greeting", "farewell", "question", "answer"], correct: 0 },
            { question: "Which word means 'affirmative'?", options: ["no", "maybe", "yes", "never"], correct: 2 },
            { question: "What is 'thank you'?", options: ["question", "gratitude", "greeting", "command"], correct: 1 }
        ],
        sentences: [
            "Hello, how are you?",
            "Thank you very much.",
            "Goodbye, see you later."
        ],
        passage: "Hello! My name is Sarah. Thank you for learning with me today. When we meet someone, we say hello. When we leave, we say goodbye. Please remember to be polite."
    },
    {
        id: 2,
        title: "Lesson 2: Numbers 1-10",
        level: "Beginner",
        vocabulary: [
            { word: "one", meaning: "number 1" },
            { word: "two", meaning: "number 2" },
            { word: "three", meaning: "number 3" },
            { word: "four", meaning: "number 4" },
            { word: "five", meaning: "number 5" }
        ],
        mcq: [
            { question: "What comes after two?", options: ["one", "three", "four", "five"], correct: 1 },
            { question: "How many fingers on one hand?", options: ["three", "four", "five", "six"], correct: 2 },
            { question: "What is 2 + 2?", options: ["three", "four", "five", "six"], correct: 1 }
        ],
        sentences: [
            "I have one apple.",
            "There are two cats.",
            "Count from one to five."
        ],
        passage: "Learning numbers is important. We use numbers every day. One, two, three, four, five. Can you count to ten? Let's practice together. Numbers help us understand quantity and order."
    }
    // Add more lessons up to 50 with increasing difficulty
];

// Generate additional lessons (3-50)
for (let i = 3; i <= 50; i++) {
    const difficulty = i <= 10 ? "Beginner" : i <= 30 ? "Intermediate" : "Advanced";
    module.exports.push({
        id: i,
        title: `Lesson ${i}: ${difficulty} Level`,
        level: difficulty,
        vocabulary: [
            { word: `word${i}-1`, meaning: `meaning of word ${i}-1` },
            { word: `word${i}-2`, meaning: `meaning of word ${i}-2` },
            { word: `word${i}-3`, meaning: `meaning of word ${i}-3` },
            { word: `word${i}-4`, meaning: `meaning of word ${i}-4` },
            { word: `word${i}-5`, meaning: `meaning of word ${i}-5` }
        ],
        mcq: [
            { question: `Question ${i}-1?`, options: ["A", "B", "C", "D"], correct: 0 },
            { question: `Question ${i}-2?`, options: ["A", "B", "C", "D"], correct: 1 },
            { question: `Question ${i}-3?`, options: ["A", "B", "C", "D"], correct: 2 }
        ],
        sentences: [
            `Sentence ${i}-1 for practice.`,
            `Sentence ${i}-2 for practice.`,
            `Sentence ${i}-3 for practice.`
        ],
        passage: `This is lesson ${i}. The passage contains content for ${difficulty} level learners. Practice makes perfect. Keep learning and you will improve.`
    });
}