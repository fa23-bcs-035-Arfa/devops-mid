// ==========================================================
// 📄 public/js/placement-test.js
// ==========================================================

const initial = window.__PLACEMENT_INITIAL__ || { assignedLevel: 1, placement: { taken: false } };

// ---- Question data (small starter set; you can expand later) ----
const lettersQuestions = [
    { prompt: 'ا', options: ['a', 'b', 't', 's'], answer: 'a' },
    { prompt: 'ب', options: ['m', 'b', 'kh', 'z'], answer: 'b' },
    { prompt: 'ت', options: ['t', 'd', 'j', 'q'], answer: 't' },
    { prompt: 'س', options: ['sh', 's', 'h', 'f'], answer: 's' },
    { prompt: 'م', options: ['m', 'n', 'l', 'k'], answer: 'm' }
];

const wordsQuestions = [
    { prompt: 'سلام', options: ['Hello/Peace', 'Water', 'Book', 'House'], answer: 'Hello/Peace' },
    { prompt: 'شکریہ', options: ['Sorry', 'Thank you', 'Goodbye', 'Yes'], answer: 'Thank you' },
    { prompt: 'پانی', options: ['Food', 'Water', 'School', 'Friend'], answer: 'Water' },
    { prompt: 'کتاب', options: ['Pen', 'Chair', 'Book', 'Table'], answer: 'Book' },
    { prompt: 'گھر', options: ['Home', 'Market', 'City', 'Time'], answer: 'Home' }
];

// ---- Rendering helpers ----
function renderQuiz(containerId, questions, namePrefix) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = questions
        .map((q, idx) => {
            const name = `${namePrefix}_${idx}`;
            const optionsHtml = q.options
                .map((opt) => {
                    const id = `${name}_${opt}`.replace(/\s+/g, '_');
                    return `
                        <label for="${id}">
                            <input type="radio" id="${id}" name="${name}" value="${escapeHtml(opt)}" data-correct="${escapeHtml(q.answer)}">
                            ${escapeHtml(opt)}
                        </label>
                    `;
                })
                .join('');

            return `
                <div class="question" data-index="${idx}">
                    <p style="margin-bottom: 0.75rem;"><strong>Q${idx + 1}:</strong> <span class="urdu-text" style="font-size: 1.6rem;">${q.prompt}</span></p>
                    ${optionsHtml}
                </div>
            `;
        })
        .join('');
}

function computeQuizScore(containerId, questions, namePrefix) {
    const el = document.getElementById(containerId);
    if (!el) return 0;

    let correct = 0;

    questions.forEach((q, idx) => {
        const name = `${namePrefix}_${idx}`;
        const selected = el.querySelector(`input[name="${name}"]:checked`);
        if (selected && selected.value === q.answer) {
            correct++;
        }
    });

    return Math.round((correct / Math.max(1, questions.length)) * 100);
}

function revealQuizAnswers(containerId, questions, namePrefix) {
    const el = document.getElementById(containerId);
    if (!el) return;

    questions.forEach((q, idx) => {
        const qEl = el.querySelector(`.question[data-index="${idx}"]`);
        if (!qEl) return;

        const name = `${namePrefix}_${idx}`;
        const selected = qEl.querySelector(`input[name="${name}"]:checked`);

        // Mark each option
        qEl.querySelectorAll('label').forEach((label) => {
            label.style.border = '2px solid #e0e0e0';
            label.style.background = '#fff';
        });

        qEl.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
            const label = input.closest('label');
            if (!label) return;

            if (input.value === q.answer) {
                label.style.border = '2px solid #10b981';
                label.style.background = '#d1fae5';
            }

            if (selected && input === selected && selected.value !== q.answer) {
                label.style.border = '2px solid #ef4444';
                label.style.background = '#fee2e2';
            }

            input.disabled = true;
        });

        // Add a tiny line with the correct answer if user got it wrong / didn't answer
        const existing = qEl.querySelector('.correct-answer-hint');
        if (existing) existing.remove();

        const hint = document.createElement('div');
        hint.className = 'correct-answer-hint';
        hint.style.marginTop = '0.6rem';
        hint.style.color = '#065f46';
        hint.style.fontWeight = '600';

        if (!selected) {
            hint.textContent = `Correct answer: ${q.answer}`;
            qEl.appendChild(hint);
        } else if (selected.value !== q.answer) {
            hint.textContent = `Correct answer: ${q.answer}`;
            qEl.appendChild(hint);
        }
    });
}

// ---- Pronunciation (Web Speech API) ----
let recognition = null;
let isRecording = false;
let pronunciationScore = 0;

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.lang = 'ur-PK';
    rec.continuous = false;
    rec.interimResults = false;
    return rec;
}

function calculateSimilarity(text1, text2) {
    if (window.urduSimilarity && typeof window.urduSimilarity.similarityPercent === 'function') {
        return window.urduSimilarity.similarityPercent(text1, text2);
    }
    const a = String(text1 || '').trim();
    const b = String(text2 || '').trim();
    return a === b ? 100 : 0;
}

async function speakUrdu(text) {
    const audioUrl = `/api/get-tts-audio?text=${encodeURIComponent(text)}&languageCode=ur-PK`;
    const audio = new Audio(audioUrl);
    await audio.play();
}

function setPronunciationResult({ score, passed, transcript, expected }) {
    const el = document.getElementById('pronunciation-result');
    if (!el) return;

    const color = passed ? '#10b981' : '#ef4444';
    const emoji = passed ? '✅' : '❌';

    el.innerHTML = `
        <div style="padding: 15px; background: ${color}20; border: 2px solid ${color}; border-radius: 8px; margin-top: 10px;">
            <h4 style="color: ${color}; margin: 0 0 10px 0;">${emoji} Pronunciation score: ${score}%</h4>
            <div style="margin: 10px 0; padding: 8px; background: white; border-radius: 4px; text-align: right;" dir="rtl">
                <strong>Target:</strong> ${escapeHtml(expected)}
            </div>
            <div style="margin: 10px 0; padding: 8px; background: white; border-radius: 4px; text-align: right;" dir="rtl">
                <strong>You said:</strong> ${escapeHtml(transcript)}
            </div>
        </div>
    `;
}

// ---- Level recommendation ----
function scoreToLevel(score) {
    const s = Number.isFinite(score) ? score : 0;
    const clamped = Math.max(0, Math.min(100, s));
    return Math.max(1, Math.min(50, Math.round((clamped / 100) * 49) + 1));
}

function setSummary({ lettersScore, wordsScore, pronunciationScore, totalScore, recommendedLevel }) {
    const el = document.getElementById('placement-summary');
    if (!el) return;

    el.innerHTML = `
        <div>
            <div><strong>Letters:</strong> ${lettersScore}%</div>
            <div><strong>Words:</strong> ${wordsScore}%</div>
            <div><strong>Pronunciation:</strong> ${pronunciationScore}%</div>
            <div style="margin-top: 0.5rem;"><strong>Total:</strong> ${totalScore}%</div>
            <div style="margin-top: 0.75rem;"><strong>Recommended level:</strong> Level ${recommendedLevel}</div>
        </div>
    `;
}

function populateLevelSelect(defaultLevel) {
    const select = document.getElementById('chosenLevel');
    if (!select) return;

    select.innerHTML = '';
    for (let i = 1; i <= 50; i++) {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = `Level ${i}`;
        if (i === defaultLevel) opt.selected = true;
        select.appendChild(opt);
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ---- Boot ----
renderQuiz('letters-quiz', lettersQuestions, 'letters');
renderQuiz('words-quiz', wordsQuestions, 'words');

// Initialize default level selection (if placement already taken, show chosen; else show 1 initially)
const initialChosen = (initial.placement && initial.placement.taken && initial.placement.chosenLevel) ? Number(initial.placement.chosenLevel) : Number(initial.assignedLevel || 1);
populateLevelSelect(Math.max(1, Math.min(50, initialChosen || 1)));

const listenBtn = document.getElementById('pronounce-listen');
const recordBtn = document.getElementById('pronounce-record');

if (listenBtn) {
    listenBtn.addEventListener('click', async () => {
        const target = document.getElementById('pronunciation-target')?.textContent?.trim() || '';
        try {
            await speakUrdu(target);
        } catch (e) {
            alert('Error playing audio.');
        }
    });
}

if (recordBtn) {
    recordBtn.addEventListener('click', async () => {
        if (isRecording && recognition) {
            recognition.stop();
            return;
        }

        if (!recognition) {
            recognition = initSpeechRecognition();
            if (!recognition) {
                alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
                return;
            }
        }

        const target = document.getElementById('pronunciation-target')?.textContent?.trim() || '';
        const resultEl = document.getElementById('pronunciation-result');
        if (resultEl) {
            resultEl.innerHTML = '<p style="color: #2563eb;">🎤 Listening... Speak now!</p>';
        }

        isRecording = true;
        recordBtn.textContent = '⏹️ Stop';
        recordBtn.style.backgroundColor = '#ef4444';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            pronunciationScore = calculateSimilarity(transcript, target);
            setPronunciationResult({
                score: pronunciationScore,
                passed: pronunciationScore >= 70,
                transcript,
                expected: target
            });
        };

        recognition.onerror = (event) => {
            if (resultEl) {
                resultEl.innerHTML = `<p style=\"color:#ef4444;\">❌ ${escapeHtml(event.error || 'Speech error')}</p>`;
            }
        };

        recognition.onend = () => {
            isRecording = false;
            recordBtn.textContent = '🎤 Record';
            recordBtn.style.backgroundColor = '';
        };

        try {
            recognition.start();
        } catch (e) {
            // Some browsers throw if start() is called too quickly
            isRecording = false;
            recordBtn.textContent = '🎤 Record';
            recordBtn.style.backgroundColor = '';
        }
    });
}

// Save placement
const saveBtn = document.getElementById('savePlacement');
if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
        const lettersScore = computeQuizScore('letters-quiz', lettersQuestions, 'letters');
        const wordsScore = computeQuizScore('words-quiz', wordsQuestions, 'words');
        const pronScore = pronunciationScore;

        const totalScore = Math.round(0.3 * lettersScore + 0.3 * wordsScore + 0.4 * pronScore);
        const recommendedLevel = scoreToLevel(totalScore);

        // Show answers on screen (per your request)
        revealQuizAnswers('letters-quiz', lettersQuestions, 'letters');
        revealQuizAnswers('words-quiz', wordsQuestions, 'words');

        setSummary({
            lettersScore,
            wordsScore,
            pronunciationScore: pronScore,
            totalScore,
            recommendedLevel
        });

        const chosenLevel = Number(document.getElementById('chosenLevel')?.value) || recommendedLevel;

        const errorEl = document.getElementById('save-error');
        if (errorEl) {
            errorEl.style.display = 'none';
            errorEl.textContent = '';
        }

        const goBtn = document.getElementById('goDashboard');
        if (goBtn) goBtn.style.display = 'none';

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            const resp = await fetch('/placement-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lettersScore,
                    wordsScore,
                    pronunciationScore: pronScore,
                    totalScore,
                    chosenLevel
                })
            });

            const data = await resp.json();
            if (!resp.ok || !data.success) {
                throw new Error(data.error || 'Failed to save');
            }

            // Do not force redirect; show a clear button to continue.
            if (goBtn) {
                goBtn.href = data.redirect || '/dashboard';
                goBtn.style.display = 'inline-block';
            }

            saveBtn.textContent = 'Saved ✓';
        } catch (e) {
            if (errorEl) {
                errorEl.style.display = 'block';
                errorEl.textContent = String(e.message || e);
            }
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save & Show Results';
        }
    });
}

// If placement already taken, show the previous summary immediately
if (initial.placement && initial.placement.taken) {
    const lettersScore = Number(initial.placement.lettersScore) || 0;
    const wordsScore = Number(initial.placement.wordsScore) || 0;
    const pronScore = Number(initial.placement.pronunciationScore) || 0;
    const totalScore = Number(initial.placement.totalScore) || Math.round(0.3 * lettersScore + 0.3 * wordsScore + 0.4 * pronScore);
    const recommendedLevel = Number(initial.placement.recommendedLevel) || scoreToLevel(totalScore);

    setSummary({ lettersScore, wordsScore, pronunciationScore: pronScore, totalScore, recommendedLevel });
    populateLevelSelect(Number(initial.placement.chosenLevel) || recommendedLevel);
}