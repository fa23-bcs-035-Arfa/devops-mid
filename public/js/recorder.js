// public/js/recorder.js – voice recording with Web Speech API

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let currentAudio = null;
let recognition = null;

const recordBtn = document.getElementById('record-btn');
const resultArea = document.getElementById('result-area');

// Initialize Web Speech API
function initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.error('Speech Recognition not supported in this browser');
        return null;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'ur-PK'; // Urdu language
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    return recognition;
}

// Stop any playing audio before recording
function stopAllAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
}

// Initialize recording
recordBtn.addEventListener('click', async () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

async function startRecording() {
    try {
        // Stop any playing TTS audio first
        stopAllAudio();

        // Initialize speech recognition
        if (!recognition) {
            recognition = initializeSpeechRecognition();
        }

        if (!recognition) {
            resultArea.innerHTML = '<p style="color: #ef4444;">Speech recognition is not supported in this browser.</p>';
            return;
        }

        // Get target text
        const targetText = document.getElementById('target-text').textContent.trim();

        isRecording = true;

        // Update button UI
        recordBtn.textContent = '⏹️ Stop Recording';
        recordBtn.style.backgroundColor = '#ef4444';
        resultArea.innerHTML = '<p style="color: #2563eb;">🎤 Recording... Speak now!</p>';

        // Handle speech recognition results
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const confidence = event.results[0][0].confidence;

            console.log('Recognized:', transcript);
            console.log('Confidence:', confidence);

            processTranscription(transcript, targetText);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isRecording = false;
            recordBtn.textContent = '🎤 Record Voice';
            recordBtn.style.backgroundColor = '';

            let errorMessage = 'Error recognizing speech.';
            if (event.error === 'no-speech') {
                errorMessage = 'No speech detected. Please try again and speak clearly.';
            } else if (event.error === 'audio-capture') {
                errorMessage = 'Microphone not accessible. Please check permissions.';
            } else if (event.error === 'not-allowed') {
                errorMessage = 'Microphone access denied. Please allow microphone access.';
            }

            resultArea.innerHTML = `<p style=\"color: #ef4444;\">${errorMessage}</p>`;
        };

        recognition.onend = () => {
            isRecording = false;
            recordBtn.textContent = '🎤 Record Voice';
            recordBtn.style.backgroundColor = '';
        };

        // Start recognition
        recognition.start();

    } catch (error) {
        console.error('Error starting recording:', error);
        resultArea.innerHTML = '<p style="color: #ef4444;">❌ Error starting recording. Please try again.</p>';
        isRecording = false;
        recordBtn.textContent = '🎤 Record Voice';
        recordBtn.style.backgroundColor = '';
    }
}

function stopRecording() {
    if (recognition && isRecording) {
        recognition.stop();
    }
}

function processTranscription(transcript, targetText) {
    const score = calculateSimilarityPercent(transcript, targetText);
    const passed = score >= 60;

    const result = {
        passed: passed,
        score: score,
        userSaid: transcript,
        target: targetText
    };

    displayResults(result);
}

function calculateSimilarityPercent(str1, str2) {
    if (window.urduSimilarity && typeof window.urduSimilarity.similarityPercent === 'function') {
        return window.urduSimilarity.similarityPercent(str1, str2);
    }

    // Fallback: exact match only
    const a = String(str1 || '').trim();
    const b = String(str2 || '').trim();
    return a === b ? 100 : 0;
}

function displayResults(result) {
    const passed = result.passed;
    const score = result.score;
    const userSaid = result.userSaid || '(No speech detected)';
    const target = result.target;

    const color = passed ? '#10b981' : '#ef4444';
    const emoji = passed ? '✅' : '❌';
    const message = passed ? 'Well done.' : 'Keep practicing.';

    resultArea.innerHTML = `
        <div style="padding: 20px; border: 2px solid ${color}; border-radius: 8px; background-color: ${color}15;">
            <h3 style="color: ${color}; margin: 0 0 15px 0;">${emoji} ${message}</h3>
            
            <div style="margin: 10px 0;">
                <strong>Score:</strong> 
                <span style="font-size: 24px; color: ${color};">${score}%</span>
            </div>
            
            <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px; text-align: right;" dir="rtl">
                <strong>Target:</strong> <span style="font-size: 18px;">${target}</span>
            </div>
            
            <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px; text-align: right;" dir="rtl">
                <strong>You said:</strong> <span style="font-size: 18px;">${userSaid}</span>
            </div>
            
            ${!passed ? '<p style=\"margin-top: 15px; color: #64748b;\">Tip: Listen to the audio again and try to match the pronunciation.</p>' : ''}
        </div>
    `;
}

// Update the downloadAndPlayAudio function to track current audio
window.downloadAndPlayAudio = function (text) {
    const playBtn = document.getElementById('play-btn');
    const audioUrl = `/api/get-tts-audio?text=${encodeURIComponent(text)}&languageCode=ur-PK`;

    // Stop any previous audio
    stopAllAudio();

    // Show loading state
    playBtn.classList.add('loading-audio');
    playBtn.textContent = '⏳ Loading...';

    currentAudio = new Audio(audioUrl);

    currentAudio.addEventListener('canplay', () => {
        playBtn.classList.remove('loading-audio');
        playBtn.textContent = '🔊 Listen';
    });

    currentAudio.addEventListener('error', (e) => {
        console.error("Audio playback error:", e);
        playBtn.classList.remove('loading-audio');
        playBtn.textContent = '❌ Error - Try Again';
        currentAudio = null;

        setTimeout(() => {
            playBtn.textContent = '🔊 Listen';
        }, 2000);
    });

    currentAudio.addEventListener('ended', () => {
        currentAudio = null;
    });

    currentAudio.play().catch(e => {
        console.error("Audio play error:", e);
        playBtn.classList.remove('loading-audio');
        playBtn.textContent = '🔊 Listen';
        currentAudio = null;
    });
};