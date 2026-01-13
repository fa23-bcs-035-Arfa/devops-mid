// Text-to-Speech
function speakWord(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
}

function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
}

// MCQ Quiz
function submitMCQ() {
    const questions = document.querySelectorAll('#mcq-quiz .question');
    let correct = 0;

    questions.forEach((q, idx) => {
        const selected = q.querySelector('input[type="radio"]:checked');
        const correctAnswer = parseInt(q.dataset.correct);

        if (selected && parseInt(selected.value) === correctAnswer) {
            correct++;
            q.style.background = '#c8e6c9';
        } else {
            q.style.background = '#ffcdd2';
        }
    });

    const result = document.getElementById('mcq-result');
    result.style.display = 'block';
    result.className = correct === questions.length ? 'result-success' : 'result-info';
    result.textContent = `You got ${correct} out of ${questions.length} correct!`;

    submitAssessment('mcq', correct, questions.length);
}

// Matching Game
let draggedElement = null;

function allowDrop(e) {
    e.preventDefault();
}

function drag(e) {
    draggedElement = e.target;
    e.dataTransfer.effectAllowed = 'move';
}

function drop(e) {
    e.preventDefault();
    if (draggedElement) {
        e.target.textContent = draggedElement.textContent + ' - ' + e.target.textContent.split(' - ')[0];
        e.target.dataset.selected = draggedElement.dataset.word;
        e.target.classList.add('filled');
        draggedElement.style.opacity = '0.5';
    }
}

function submitMatching() {
    const dropZones = document.querySelectorAll('.drop-zone');
    let correct = 0;

    dropZones.forEach(zone => {
        if (zone.dataset.selected === zone.dataset.meaning) {
            correct++;
            zone.style.borderColor = '#4caf50';
            zone.style.background = '#c8e6c9';
        } else {
            zone.style.borderColor = '#f44336';
            zone.style.background = '#ffcdd2';
        }
    });

    const result = document.getElementById('matching-result');
    result.style.display = 'block';
    result.className = correct === dropZones.length ? 'result-success' : 'result-info';
    result.textContent = `You matched ${correct} out of ${dropZones.length} correctly!`;

    submitAssessment('matching', correct, dropZones.length);
}

// Speech Recognition
let recognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
}

function startRecording(btn, targetText) {
    if (!recognition) {
        alert('Speech recognition not supported in this browser');
        return;
    }

    const originalText = btn.textContent;
    btn.textContent = '🎤 Listening...';
    btn.disabled = true;

    recognition.start();

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        const target = targetText.toLowerCase();
        const similarity = calculateSimilarity(transcript, target);

        const score = Math.round(similarity * 100);
        const points = score >= 70 ? score : 0;

        alert(`Your pronunciation score: ${score}%\nYou said: "${transcript}"`);

        if (points > 0) {
            submitAssessment('reading', score, 100);
        }

        btn.textContent = originalText;
        btn.disabled = false;
    };

    recognition.onerror = () => {
        btn.textContent = originalText;
        btn.disabled = false;
        alert('Error recording. Please try again.');
    };

    recognition.onend = () => {
        btn.textContent = originalText;
        btn.disabled = false;
    };
}

function startPassageRecording(passage) {
    if (!recognition) {
        alert('Speech recognition not supported in this browser');
        return;
    }

    recognition.start();

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        const target = passage.toLowerCase();
        const similarity = calculateSimilarity(transcript, target);

        const score = Math.round(similarity * 100);

        const result = document.getElementById('listening-result');
        result.style.display = 'block';
        result.className = score >= 70 ? 'result-success' : 'result-info';
        result.innerHTML = `
      <strong>Pronunciation Score: ${score}%</strong><br>
      You said: "${transcript}"<br>
      Expected: "${passage}"
    `;

        if (score >= 50) {
            submitAssessment('listening', score, 100);
        }
    };

    recognition.onerror = () => {
        alert('Error recording. Please try again.');
    };
}

// Calculate text similarity
function calculateSimilarity(str1, str2) {
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    let matches = 0;

    words1.forEach(word => {
        if (words2.includes(word)) matches++;
    });

    return matches / Math.max(words1.length, words2.length);
}

// Submit assessment score
async function submitAssessment(type, score, maxScore) {
    try {
        const response = await fetch('/submit-assessment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lessonId,
                assessmentType: type,
                score,
                maxScore
            })
        });

        const data = await response.json();
        if (data.success) {
            console.log(`Earned ${data.points} points! Total: ${data.totalPoints}`);
        }
    } catch (error) {
        console.error('Error submitting assessment:', error);
    }
}