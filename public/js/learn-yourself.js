// public/js/learn-yourself.js

const englishInput = document.getElementById('englishInput');
const fileInput = document.getElementById('fileInput');
const translateBtn = document.getElementById('translateBtn');
const translateError = document.getElementById('translateError');

const urduOutput = document.getElementById('urduOutput');
const tooltip = document.getElementById('tooltip');

const readAloudBtn = document.getElementById('readAloudBtn');
const makeQuizBtn = document.getElementById('makeQuizBtn');

const quizArea = document.getElementById('quizArea');
const quizResult = document.getElementById('quizResult');

const wordChips = document.getElementById('wordChips');
const selectedCount = document.getElementById('selectedCount');

let lastUrduText = '';
let lastQuiz = [];
let selectedWords = [];

function showError(msg) {
    if (!translateError) return;
    translateError.style.display = 'block';
    translateError.textContent = msg;
}

function clearError() {
    if (!translateError) return;
    translateError.style.display = 'none';
    translateError.textContent = '';
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function apiPost(url, body) {
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        throw new Error(data.message || data.error || `Request failed: ${resp.status}`);
    }
    return data;
}

function normalizeUrduWord(word) {
    // Remove punctuation and Urdu/English punctuation marks
    return String(word)
        .trim()
        .replace(/[\u200c\u200d]/g, '')
        .replace(/[.,!?؛،\-—()\[\]{}"'“”‘’]/g, '')
        .trim();
}

function extractCandidateWords(urduText) {
    // Basic tokenization: split by whitespace, strip punctuation
    const tokens = String(urduText)
        .split(/\s+/)
        .map(normalizeUrduWord)
        .filter(Boolean);

    // Heuristic “difficult”: longer tokens and unique
    const uniques = [...new Set(tokens)];

    // Filter out very short/common-ish tokens
    const filtered = uniques.filter((t) => t.length >= 4);

    // Prefer the longest words first
    filtered.sort((a, b) => b.length - a.length);

    // Cap
    return filtered.slice(0, 12);
}

async function speakUrdu(text) {
    const audio = new Audio(`/api/get-tts-audio?text=${encodeURIComponent(text)}&languageCode=ur-PK`);
    await audio.play();
}

function setSelectedWords(next) {
    selectedWords = Array.isArray(next) ? next : [];
    if (selectedCount) selectedCount.textContent = String(selectedWords.length);

    if (!wordChips) return;
    wordChips.querySelectorAll('.word-chip').forEach((chip) => {
        const w = chip.dataset.word;
        chip.classList.toggle('selected', selectedWords.includes(w));
    });
}

function renderWordChips(words) {
    if (!wordChips) return;

    const list = Array.isArray(words) ? words : [];
    if (list.length === 0) {
        wordChips.innerHTML = '<div class="muted">Translate text to see suggested quiz words.</div>';
        setSelectedWords([]);
        return;
    }

    wordChips.innerHTML = list
        .map((w) => {
            const safe = escapeHtml(w);
            return `<button type="button" class="word-chip" data-word="${safe}">${safe}</button>`;
        })
        .join('');

    wordChips.querySelectorAll('.word-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            const w = chip.dataset.word;
            const has = selectedWords.includes(w);

            // cap selection to avoid overly repetitive quizzes
            const next = has
                ? selectedWords.filter((x) => x !== w)
                : (selectedWords.length >= 10 ? selectedWords : [...selectedWords, w]);

            setSelectedWords(next);
        });
    });

    // default: no manual selection; user can click to choose
    setSelectedWords([]);
}

async function translateText() {
    clearError();

    const text = (englishInput?.value || '').trim();
    if (!text) {
        showError('Please paste English text or upload a .txt file.');
        return;
    }

    translateBtn.disabled = true;
    translateBtn.textContent = 'Translating...';

    try {
        const data = await apiPost('/api/translate', { text, sl: 'en', tl: 'ur' });
        lastUrduText = data.translatedText || '';
        urduOutput.textContent = lastUrduText || '—';

        // Suggest quiz words
        const candidates = extractCandidateWords(lastUrduText);
        renderWordChips(candidates);

        quizArea.innerHTML = '';
        quizResult.innerHTML = '';
        lastQuiz = [];
    } catch (e) {
        showError(String(e.message || e));
    } finally {
        translateBtn.disabled = false;
        translateBtn.textContent = 'Translate';
    }
}

// File upload (TXT)
if (fileInput) {
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;

        // Only support plain text for now
        const text = await file.text();
        if (englishInput) englishInput.value = text;
    });
}

if (translateBtn) {
    translateBtn.addEventListener('click', translateText);
}

// Double click meaning popup
if (urduOutput) {
    urduOutput.addEventListener('dblclick', async (e) => {
        const selection = window.getSelection()?.toString() || '';
        const word = normalizeUrduWord(selection);
        if (!word) return;

        // Show tooltip immediately
        tooltip.style.left = `${e.pageX}px`;
        tooltip.style.top = `${e.pageY}px`;
        tooltip.style.display = 'block';
        tooltip.textContent = 'Loading...';

        try {
            const data = await apiPost('/api/word-meaning', { word });
            tooltip.textContent = `${data.word}: ${data.meaning}`;
        } catch (err) {
            tooltip.textContent = 'Meaning not found.';
        }

        // Hide after a bit
        setTimeout(() => {
            tooltip.style.display = 'none';
        }, 3500);
    });
}

// Read aloud
if (readAloudBtn) {
    readAloudBtn.addEventListener('click', async () => {
        if (!lastUrduText.trim()) {
            alert('Translate something first.');
            return;
        }

        // TTS endpoints can struggle with very long text; keep it bounded.
        const snippet = lastUrduText.length > 250 ? lastUrduText.slice(0, 250) : lastUrduText;
        try {
            await speakUrdu(snippet);
        } catch (e) {
            alert('Error playing Urdu audio.');
        }
    });
}

function renderQuiz(mcqs) {
    if (!quizArea) return;

    quizArea.innerHTML = (mcqs || [])
        .map((q, idx) => {
            const optionsHtml = (q.options || [])
                .map((opt, oi) => {
                    const id = `q_${idx}_${oi}`;
                    return `
                        <label class="quiz-option" for="${id}">
                            <input type="radio" id="${id}" name="q_${idx}" value="${escapeHtml(opt)}" data-correct="${escapeHtml(q.correct)}">
                            ${escapeHtml(opt)}
                        </label>
                    `;
                })
                .join('');

            return `
                <div class="quiz-box question" style="margin-bottom: 1rem;">
                    <div class="quiz-question"><strong>Q${idx + 1}.</strong> ${escapeHtml(q.question)}</div>
                    <div style="display:flex; align-items:center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
                        <div class="urdu-text" dir="rtl" style="font-size: 1.9rem;">${escapeHtml(q.urduWord)}</div>
                        <button class="btn btn-small" type="button" onclick="window.__learnSpeak('${escapeHtml(q.urduWord)}')">🔊 Listen</button>
                    </div>
                    <div class="quiz-options">${optionsHtml}</div>
                </div>
            `;
        })
        .join('');

    quizArea.insertAdjacentHTML(
        'beforeend',
        `<button id="submitQuizBtn" class="btn btn-primary">Submit Quiz</button>`
    );

    const submit = document.getElementById('submitQuizBtn');
    if (submit) {
        submit.addEventListener('click', () => {
            const questions = quizArea.querySelectorAll('.question');
            let correctCount = 0;

            questions.forEach((question) => {
                const selected = question.querySelector('input[type="radio"]:checked');
                if (!selected) return;

                const correct = selected.dataset.correct;
                const ok = selected.value === correct;
                if (ok) correctCount++;

                question.style.borderColor = ok ? '#10b981' : '#ef4444';
            });

            const total = questions.length;
            const score = total === 0 ? 0 : Math.round((correctCount / total) * 100);
            const color = score >= 70 ? '#10b981' : '#ef4444';

            quizResult.innerHTML = `
                <div style="padding: 15px; background: ${color}20; border: 2px solid ${color}; border-radius: 12px;">
                    <h4 style="color: ${color}; margin: 0;">Score: ${score}%</h4>
                    <p style="margin: 0.35rem 0 0 0;">You got ${correctCount} out of ${total} correct.</p>
                </div>
            `;
        });
    }
}

// Expose speak helper for inline button
window.__learnSpeak = async (text) => {
    try {
        await speakUrdu(text);
    } catch {
        alert('Audio error');
    }
};

// Make quiz
if (makeQuizBtn) {
    makeQuizBtn.addEventListener('click', async () => {
        if (!lastUrduText.trim()) {
            alert('Translate something first.');
            return;
        }

        makeQuizBtn.disabled = true;
        makeQuizBtn.textContent = 'Generating...';
        quizResult.innerHTML = '';

        try {
            const candidates = extractCandidateWords(lastUrduText);
            const words = (selectedWords && selectedWords.length > 0) ? selectedWords : candidates;

            if (words.length === 0) {
                quizArea.innerHTML = '<p class="error-text">No good quiz words found. Try a longer text.</p>';
                return;
            }

            const data = await apiPost('/api/generate-quiz', { words, limit: 5 });
            lastQuiz = data.mcqs || [];
            renderQuiz(lastQuiz);
        } catch (e) {
            quizArea.innerHTML = `<p class="error-text">${escapeHtml(String(e.message || e))}</p>`;
        } finally {
            makeQuizBtn.disabled = false;
            makeQuizBtn.textContent = '📝 Make quiz';
        }
    });
}
