// public/js/lesson-assessment.js – lesson assessment UI logic

let currentAudio = null;
let recognition = null;
let isRecording = false;

// Initialize Web Speech API
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.error('Speech Recognition not supported');
        alert('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
        return null;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'ur-PK';
    recognition.continuous = false;
    recognition.interimResults = false;

    return recognition;
}

// Stop any playing audio
function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
}

// Play Urdu text using TTS (Google Translate)
async function speakUrdu(text) {
    try {
        stopAudio();

        const audioUrl = `/api/get-tts-audio?text=${encodeURIComponent(text)}&languageCode=ur-PK`;
        currentAudio = new Audio(audioUrl);

        currentAudio.addEventListener('error', (e) => {
            console.error('Audio playback error:', e);
            alert('Error playing audio. Please try again.');
        });

        await currentAudio.play();

    } catch (error) {
        console.error('TTS Error:', error);
        alert('Error generating speech. Please try again.');
    }
}

// Record Word
async function recordWord(targetText, index) {
    const btn = document.getElementById(`word-btn-${index}`);
    const resultDiv = document.getElementById(`word-result-${index}`);

    if (isRecording) {
        recognition.stop();
        return;
    }

    stopAudio();

    if (!recognition) {
        recognition = initSpeechRecognition();
        if (!recognition) return;
    }

    isRecording = true;
    btn.textContent = '⏹️ Stop';
    btn.style.backgroundColor = '#ef4444';
    resultDiv.innerHTML = '<p style="color: #2563eb;">🎤 Listening... Speak now!</p>';

    recognition.onresult = async (event) => {
        const transcription = event.results[0][0].transcript;
        console.log('Recognized:', transcription);

        // Calculate score
        const score = calculateSimilarity(transcription, targetText);
        const passed = score >= 70;

        displayResult(resultDiv, {
            score,
            passed,
            userSaid: transcription,
            expected: targetText
        });

        if (window.gameSfx) (passed ? window.gameSfx.correct() : window.gameSfx.wrong());

        // Submit score to server
        await submitAssessmentScore('words', score);
        updateScoreDisplay('words', score);
    };

    recognition.onerror = (event) => {
        console.error('Speech error:', event.error);
        resultDiv.innerHTML = `<p style="color: #ef4444;">❌ ${getSpeechErrorMessage(event.error)}</p>`;
        resetRecordButton(btn);
    };

    recognition.onend = () => {
        resetRecordButton(btn);
    };

    try {
        recognition.start();
    } catch (error) {
        console.error('Recognition start error:', error);
        resultDiv.innerHTML = '<p style="color: #ef4444;">❌ Error starting recording</p>';
        resetRecordButton(btn);
    }
}

// Record Sentence
async function recordSentence(targetText, index) {
    const btn = document.getElementById(`sentence-btn-${index}`);
    const resultDiv = document.getElementById(`sentence-result-${index}`);

    if (isRecording) {
        recognition.stop();
        return;
    }

    stopAudio();

    if (!recognition) {
        recognition = initSpeechRecognition();
        if (!recognition) return;
    }

    isRecording = true;
    btn.textContent = '⏹️ Stop';
    btn.style.backgroundColor = '#ef4444';
    resultDiv.innerHTML = '<p style="color: #2563eb;">🎤 Listening... Speak the sentence!</p>';

    recognition.onresult = async (event) => {
        const transcription = event.results[0][0].transcript;
        const score = calculateSimilarity(transcription, targetText);
        const passed = score >= 70;

        displayResult(resultDiv, {
            score,
            passed,
            userSaid: transcription,
            expected: targetText
        });

        if (window.gameSfx) (passed ? window.gameSfx.correct() : window.gameSfx.wrong());

        await submitAssessmentScore('sentences', score);
        updateScoreDisplay('sentences', score);
    };

    recognition.onerror = (event) => {
        resultDiv.innerHTML = `<p style="color: #ef4444;">❌ ${getSpeechErrorMessage(event.error)}</p>`;
        resetRecordButton(btn);
    };

    recognition.onend = () => {
        resetRecordButton(btn);
    };

    recognition.start();
}

// Record Passage
async function recordPassage(targetText) {
    const btn = document.getElementById('passage-btn');
    const resultDiv = document.getElementById('passage-result');

    if (isRecording) {
        recognition.stop();
        return;
    }

    stopAudio();

    if (!recognition) {
        recognition = initSpeechRecognition();
        if (!recognition) return;
    }

    isRecording = true;
    btn.textContent = '⏹️ Stop Reading';
    btn.style.backgroundColor = '#ef4444';
    resultDiv.innerHTML = '<p style="color: #2563eb;">🎤 Listening... Read the passage aloud!</p>';

    recognition.onresult = async (event) => {
        const transcription = event.results[0][0].transcript;
        const score = calculateSimilarity(transcription, targetText);
        const passed = score >= 70;

        displayResult(resultDiv, {
            score,
            passed,
            userSaid: transcription,
            expected: targetText
        });

        if (window.gameSfx) (passed ? window.gameSfx.correct() : window.gameSfx.wrong());

        await submitAssessmentScore('passage', score);
        updateScoreDisplay('passage', score);
    };

    recognition.onerror = (event) => {
        resultDiv.innerHTML = `<p style="color: #ef4444;">❌ ${getSpeechErrorMessage(event.error)}</p>`;
        resetRecordButton(btn);
    };

    recognition.onend = () => {
        resetRecordButton(btn);
    };

    recognition.start();
}

// Submit MCQ Quiz
async function submitMCQ() {
    const questions = document.querySelectorAll('#mcq-quiz .question');
    let correctCount = 0;
    let totalQuestions = questions.length;

    questions.forEach((question) => {
        const selected = question.querySelector('input[type="radio"]:checked');
        if (selected) {
            const correct = selected.dataset.correct;
            if (selected.value === correct) {
                correctCount++;
                question.style.backgroundColor = '#d1fae5';
            } else {
                question.style.backgroundColor = '#fee2e2';
            }
        }
    });

    const score = Math.round((correctCount / totalQuestions) * 100);
    const resultDiv = document.getElementById('mcq-result');

    const passed = score >= 70;
    const color = passed ? '#10b981' : '#ef4444';
    resultDiv.innerHTML = `
        <div style="padding: 15px; background: ${color}20; border: 2px solid ${color}; border-radius: 8px;">
            <h4 style="color: ${color}; margin: 0;">Score: ${score}%</h4>
            <p>You got ${correctCount} out of ${totalQuestions} correct!</p>
        </div>
    `;

    if (window.gameSfx) (passed ? window.gameSfx.correct() : window.gameSfx.wrong());

    await submitAssessmentScore('mcq', score);
    updateScoreDisplay('mcq', score);
}

// Helper Functions
function calculateSimilarity(text1, text2) {
    // Pronunciation scoring is based on normalized STT text.
    // Exact normalized matches yield 100%; rules are consistent across the app.

    if (window.urduSimilarity && typeof window.urduSimilarity.similarityPercent === 'function') {
        return window.urduSimilarity.similarityPercent(text1, text2);
    }

    // Fallback (shouldn't happen): exact match only
    const a = String(text1 || '').trim();
    const b = String(text2 || '').trim();
    return a === b ? 100 : 0;
}

function displayResult(container, result) {
    const color = result.passed ? '#10b981' : '#ef4444';
    const emoji = result.passed ? '✅' : '❌';
    const message = result.passed ? 'Well done.' : 'Keep practicing.';

    container.innerHTML = `
        <div style="padding: 15px; background: ${color}20; border: 2px solid ${color}; border-radius: 8px; margin-top: 10px;">
            <h4 style="color: ${color}; margin: 0 0 10px 0;">${emoji} ${message}</h4>
            <p><strong>Score:</strong> <span style="font-size: 20px; color: ${color};">${result.score}%</span></p>
            <div style="margin: 10px 0; padding: 8px; background: white; border-radius: 4px; text-align: right;" dir="rtl">
                <strong>Target:</strong> ${result.expected}
            </div>
            <div style="margin: 10px 0; padding: 8px; background: white; border-radius: 4px; text-align: right;" dir="rtl">
                <strong>You said:</strong> ${result.userSaid}
            </div>
        </div>
    `;
}

function resetRecordButton(btn) {
    isRecording = false;
    btn.textContent = '🎤 Record';
    btn.style.backgroundColor = '';
}

function getSpeechErrorMessage(error) {
    switch (error) {
        case 'no-speech':
            return 'No speech detected. Please try again.';
        case 'audio-capture':
            return 'Microphone not accessible.';
        case 'not-allowed':
            return 'Microphone permission denied.';
        default:
            return 'Error recognizing speech. Please try again.';
    }
}

async function submitAssessmentScore(type, score) {
    try {
        const response = await fetch('/api/submit-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                levelNumber: levelNumber,
                assessmentType: type,
                score: score
            })
        });

        const data = await response.json();
        if (data.success) {
            console.log('Score submitted:', data);

            if (window.xpUi && typeof window.xpUi.updatePointsBadge === 'function') {
                window.xpUi.updatePointsBadge(data.totalPoints);
            } else {
                const pointsDisplay = document.querySelector('.points');
                if (pointsDisplay) pointsDisplay.textContent = `${data.totalPoints} points`;
            }

            try {
                window.dispatchEvent(new CustomEvent('lesson:score', {
                    detail: {
                        assessmentType: type,
                        score,
                        totalPoints: data.totalPoints,
                        lessonCompleted: !!data.lessonCompleted
                    }
                }));
            } catch (e) {
                // Non-blocking
            }

            if (data.lessonCompleted && window.xpUi) {
                window.xpUi.toast('Lesson completed!', 'success');
            }
        }
    } catch (error) {
        console.error('Error submitting score:', error);
    }
}

function updateScoreDisplay(type, score) {
    const scoreDisplay = document.getElementById(`${type}-score`);
    if (scoreDisplay) {
        const currentScore = parseInt(scoreDisplay.textContent.match(/\d+/)[0]);
        if (score > currentScore) {
            scoreDisplay.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Score: ${score}%`;
            scoreDisplay.style.backgroundColor = score >= 70 ? '#d1fae5' : '#fee2e2';
        }
    }
}