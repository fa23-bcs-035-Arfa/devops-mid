// server.js – Express app entry point with basic error handling
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const connectDB = require('./config/db');
const path = require('path');

const app = express();

// Startup checks
console.log('🔍 Starting Urdu Learning Platform...');

// 1. Database Connection
connectDB();

// 2. Middleware Setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions (required because routes read/write req.session.userId)
// NOTE: For production, use a persistent store (e.g. connect-mongo). MemoryStore is OK for local dev.
if (!process.env.SESSION_SECRET) {
    console.warn('⚠️  SESSION_SECRET not found in .env; using an insecure default (OK for local dev only).');
}
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
        }
    })
);

// Serves static files (CSS, JS, uploads) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));
console.log('📁 Static files served from:', path.join(__dirname, 'public'));

// 3. View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 4. Route Handling
app.use('/', require('./routes/indexRoutes'));
app.use('/api', require('./routes/apiRoutes'));
app.use('/blog', require('./routes/blogRoutes'));

// Basic health check
app.get('/test', (req, res) => {
    res.json({
        message: 'Server is working!',
        ttsProvider: 'google-translate'
    });
});

// 5. Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.message);
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('');
    console.log(`🚀 Server started on http://localhost:${PORT}`);
    console.log('📝 Ready to accept requests');
    console.log('');
});