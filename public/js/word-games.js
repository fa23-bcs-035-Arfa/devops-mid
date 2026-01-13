(function () {
  const data = (window.WORD_GAMES_DATA && Array.isArray(window.WORD_GAMES_DATA.words)
    ? window.WORD_GAMES_DATA.words
    : []).filter(w => w && w.urdu && w.english);
  const grammarConcepts = (window.WORD_GAMES_DATA && Array.isArray(window.WORD_GAMES_DATA.grammarConcepts)
    ? window.WORD_GAMES_DATA.grammarConcepts
    : []);

  const fallbackWords = [
    { urdu: 'کتاب', english: 'book', romanUrdu: 'kitaab', imageKey: 'book' },
    { urdu: 'سیب', english: 'apple', romanUrdu: 'seb', imageKey: 'apple' },
    { urdu: 'گھر', english: 'house', romanUrdu: 'ghar', imageKey: 'house' },
    { urdu: 'دروازہ', english: 'door', romanUrdu: 'darwaza', imageKey: 'door' },
    { urdu: 'کرسی', english: 'chair', romanUrdu: 'kursi', imageKey: 'chair' },
  ];

  const words = data.length > 0 ? data : fallbackWords;

  // Helper: random item and shuffle
  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffleArray(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // Simple seeded RNG (for deterministic bingo boards by room code)
  function hashStringToSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      // xorshift32
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }

  function shuffleWithRng(arr, rng) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // ==========================================================
  // Tabs switching
  // ==========================================================
  const tabsRoot = document.getElementById('gamesTabs');
  if (tabsRoot) {
    const tabs = Array.from(tabsRoot.querySelectorAll('.tab'));
    const panels = Array.from(document.querySelectorAll('[data-game-panel]'));

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const game = tab.getAttribute('data-game');
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        panels.forEach(p => {
          p.style.display = p.getAttribute('data-game-panel') === game ? '' : 'none';
        });
      });
    });
  }

  // ==========================================================
  // Scramble Game
  // ==========================================================
  (function initScramble() {
    const display = document.getElementById('scrambleWordDisplay');
    const lettersRow = document.getElementById('scrambleLetters');
    const feedback = document.getElementById('scrambleFeedback');
    const btnClear = document.getElementById('scrambleClear');
    const btnCheck = document.getElementById('scrambleCheck');
    const btnNext = document.getElementById('scrambleNext');

    if (!display || !lettersRow || !feedback || !btnClear || !btnCheck || !btnNext) return;

    let currentWord = null;
    let currentGuess = '';

    function pickWord() {
      currentWord = randomItem(words);
      currentGuess = '';
      feedback.textContent = '';
      render();
    }

    function render() {
      display.textContent = currentGuess || '___';
      lettersRow.innerHTML = '';
      const chars = shuffleArray(Array.from(currentWord.urdu));
      chars.forEach((ch, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'letter-btn';
        btn.textContent = ch;
        btn.addEventListener('click', () => {
          currentGuess += ch;
          display.textContent = currentGuess;
        });
        lettersRow.appendChild(btn);
      });
    }

    btnClear.addEventListener('click', () => {
      currentGuess = '';
      display.textContent = '___';
      feedback.textContent = '';
    });

    btnCheck.addEventListener('click', () => {
      if (!currentWord) return;
      if (currentGuess === currentWord.urdu) {
        feedback.textContent = `✅ درست لفظ: ${currentWord.urdu}`;
        feedback.className = 'game-feedback success';
      } else {
        feedback.textContent = '❌ دوبارہ کوشش کریں';
        feedback.className = 'game-feedback error';
      }
    });

    btnNext.addEventListener('click', pickWord);

    pickWord();
  })();

  // ==========================================================
  // Mini Crossword
  // (simple plus-shaped layout with up to 4 words)
  // ==========================================================
  (function initCrossword() {
    const gridRoot = document.getElementById('crosswordGrid');
    const cluesRoot = document.getElementById('crosswordClues');
    const feedback = document.getElementById('crosswordFeedback');
    const btnCheck = document.getElementById('crosswordCheck');
    const btnNew = document.getElementById('crosswordNew');

    if (!gridRoot || !cluesRoot || !feedback || !btnCheck || !btnNew) return;

    let cells = []; // { row, col, char, inputEl }

    function buildPuzzle() {
      gridRoot.innerHTML = '';
      cluesRoot.innerHTML = '';
      feedback.textContent = '';
      cells = [];

      const selected = shuffleArray(words).slice(0, 3);
      const centerRow = 2;
      const centerCol = 2;
      const size = 7;

      const grid = Array.from({ length: size }, () => Array(size).fill(null));

      // Word 0 horizontally through center
      const w0 = selected[0];
      const startCol = centerCol - Math.floor(w0.urdu.length / 2);
      for (let i = 0; i < w0.urdu.length && startCol + i < size; i++) {
        grid[centerRow][startCol + i] = { char: w0.urdu[i], wordIndex: 0 };
      }

      // Word 1 vertically crossing at center
      if (selected[1]) {
        const w1 = selected[1];
        const startRow = centerRow - Math.floor(w1.urdu.length / 2);
        for (let i = 0; i < w1.urdu.length && startRow + i < size; i++) {
          const existing = grid[startRow + i][centerCol];
          grid[startRow + i][centerCol] = { char: w1.urdu[i], wordIndex: existing ? existing.wordIndex : 1 };
        }
      }

      // Render grid
      const table = document.createElement('table');
      table.className = 'crossword-table';

      for (let r = 0; r < size; r++) {
        const tr = document.createElement('tr');
        for (let c = 0; c < size; c++) {
          const td = document.createElement('td');
          const cell = grid[r][c];
          if (cell) {
            const input = document.createElement('input');
            input.maxLength = 1;
            input.dir = 'rtl';
            input.className = 'crossword-cell';
            td.appendChild(input);
            cells.push({ row: r, col: c, char: cell.char, inputEl: input });
          } else {
            td.className = 'crossword-empty';
          }
          tr.appendChild(td);
        }
        table.appendChild(tr);
      }

      gridRoot.appendChild(table);

      // Clues (simple: word index & English meaning)
      const list = document.createElement('ol');
      selected.forEach((w, idx) => {
        const li = document.createElement('li');
        li.textContent = `${w.english}`;
        list.appendChild(li);
      });
      cluesRoot.appendChild(list);
    }

    btnCheck.addEventListener('click', () => {
      let allCorrect = true;
      cells.forEach(cell => {
        const val = (cell.inputEl.value || '').trim();
        if (val === cell.char) {
          cell.inputEl.classList.remove('crossword-wrong');
          cell.inputEl.classList.add('crossword-correct');
        } else {
          allCorrect = false;
          if (val) cell.inputEl.classList.add('crossword-wrong');
        }
      });

      if (allCorrect) {
        feedback.textContent = '✅ All correct!';
        feedback.className = 'game-feedback success';
      } else {
        feedback.textContent = 'Keep trying! Red cells are incorrect.';
        feedback.className = 'game-feedback error';
      }
    });

    btnNew.addEventListener('click', buildPuzzle);

    buildPuzzle();
  })();

  // ==========================================================
  // Matching Game (Word → Sound / Meaning)
  // ==========================================================
  (function initMatching() {
    const wordsRoot = document.getElementById('matchingWords');
    const meaningsRoot = document.getElementById('matchingMeanings');
    const feedback = document.getElementById('matchingFeedback');
    const btnNew = document.getElementById('matchingNew');

    if (!wordsRoot || !meaningsRoot || !feedback || !btnNew) return;

    let selectedWord = null;
    let selectedMeaning = null;

    function buildSet() {
      wordsRoot.innerHTML = '';
      meaningsRoot.innerHTML = '';
      feedback.textContent = '';
      selectedWord = null;
      selectedMeaning = null;

      const pool = words.length ? words : fallbackWords;
      const sample = shuffleArray(pool).slice(0, 4);

      const wordButtons = shuffleArray(sample.map(w => w));
      const meaningButtons = shuffleArray(sample.map(w => w));

      wordButtons.forEach((w) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'matching-word';
        btn.textContent = w.urdu;
        btn.dataset.key = w.english;
        btn.addEventListener('click', () => {
          if (btn.classList.contains('matched')) return;
          document.querySelectorAll('.matching-word.selected').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          selectedWord = btn;
          tryMatch();
        });
        wordsRoot.appendChild(btn);
      });

      meaningButtons.forEach((w) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'matching-meaning';
        btn.dataset.key = w.english;

        const label = document.createElement('div');
        label.textContent = w.english;
        btn.appendChild(label);

        const hint = document.createElement('div');
        hint.className = 'muted';
        hint.textContent = '🔊 tap to hear';
        btn.appendChild(hint);

        btn.addEventListener('click', async () => {
          if (btn.classList.contains('matched')) return;
          document.querySelectorAll('.matching-meaning.selected').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          selectedMeaning = btn;

          // play Urdu audio for this meaning card
          try {
            const audio = new Audio(`/api/get-tts-audio?text=${encodeURIComponent(w.urdu)}&languageCode=ur-PK`);
            await audio.play();
          } catch (e) {
            console.error('Matching audio error', e);
          }

          tryMatch();
        });
        meaningsRoot.appendChild(btn);
      });
    }

    function tryMatch() {
      if (!selectedWord || !selectedMeaning) return;
      const wKey = selectedWord.dataset.key;
      const mKey = selectedMeaning.dataset.key;
      if (wKey === mKey) {
        selectedWord.classList.remove('selected');
        selectedMeaning.classList.remove('selected');
        selectedWord.classList.add('matched');
        selectedMeaning.classList.add('matched');
        feedback.textContent = '✅ Match!';
        feedback.className = 'game-feedback success';
      } else {
        feedback.textContent = '❌ Not a match';
        feedback.className = 'game-feedback error';
      }
      selectedWord = null;
      selectedMeaning = null;
    }

    btnNew.addEventListener('click', buildSet);

    buildSet();
  })();

  // ==========================================================
  // Hangman (Urdu)
  // ==========================================================
  (function initHangman() {
    const wordRoot = document.getElementById('hangmanWord');
    const statusRoot = document.getElementById('hangmanStatus');
    const lettersRoot = document.getElementById('hangmanLetters');
    const btnRestart = document.getElementById('hangmanRestart');

    if (!wordRoot || !statusRoot || !lettersRoot || !btnRestart) return;

    const MAX_LIVES = 6;
    let currentWord;
    let guessed = new Set();
    let lives;

    function start() {
      currentWord = randomItem(words);
      guessed = new Set();
      lives = MAX_LIVES;
      statusRoot.textContent = `Lives: ${lives}`;
      renderWord();
      renderLetters();
    }

    function renderWord() {
      const chars = Array.from(currentWord.urdu);
      wordRoot.innerHTML = '';
      chars.forEach(ch => {
        const span = document.createElement('span');
        span.className = 'hangman-letter';
        span.textContent = guessed.has(ch) || ch === ' ' ? ch : '_';
        wordRoot.appendChild(span);
      });
    }

    function renderLetters() {
      lettersRoot.innerHTML = '';
      const uniqueChars = Array.from(new Set(Array.from(currentWord.urdu).filter(ch => ch.trim())));
      const extras = shuffleArray(words)
        .slice(0, 5)
        .flatMap(w => Array.from(w.urdu))
        .filter(ch => ch.trim());
      const pool = shuffleArray(Array.from(new Set(uniqueChars.concat(extras)))).slice(0, 20);

      pool.forEach(ch => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'letter-btn';
        btn.textContent = ch;
        btn.disabled = guessed.has(ch);
        btn.addEventListener('click', () => {
          if (guessed.has(ch)) return;
          guessed.add(ch);
          if (currentWord.urdu.includes(ch)) {
            statusRoot.textContent = `Lives: ${lives}`;
          } else {
            lives -= 1;
            statusRoot.textContent = `Lives: ${lives}`;
          }
          btn.disabled = true;
          renderWord();
          checkEnd();
        });
        lettersRoot.appendChild(btn);
      });
    }

    function checkEnd() {
      const chars = Array.from(currentWord.urdu);
      const allRevealed = chars.every(ch => !ch.trim() || guessed.has(ch));
      if (allRevealed) {
        statusRoot.textContent = `✅ درست لفظ: ${currentWord.urdu}`;
        Array.from(lettersRoot.querySelectorAll('button')).forEach(b => (b.disabled = true));
      } else if (lives <= 0) {
        statusRoot.textContent = `❌ درست لفظ تھا: ${currentWord.urdu}`;
        Array.from(lettersRoot.querySelectorAll('button')).forEach(b => (b.disabled = true));
      }
    }
    btnRestart.addEventListener('click', start);

    start();
  })();

  // ==========================================================
  // Bingo (Vocabulary / Audio / Grammar) with room codes
  // ==========================================================
  (function initBingo() {
    const gridEl = document.getElementById('bingoGrid');
    const statusEl = document.getElementById('bingoStatus');
    const currentCallEl = document.getElementById('bingoCurrentCall');
    const nextCallBtn = document.getElementById('bingoNextCall');
    const playAudioBtn = document.getElementById('bingoPlayAudio');
    const roomInput = document.getElementById('bingoRoomInput');
    const joinBtn = document.getElementById('bingoJoinBtn');
    const shareText = document.getElementById('bingoShareText');
    const modeButtons = Array.from(document.querySelectorAll('.bingo-mode-btn'));

    if (!gridEl || !statusEl || !currentCallEl || !nextCallBtn || !playAudioBtn || !roomInput || !joinBtn) return;

    const params = new URLSearchParams(window.location.search || '');
    const initialRoom = params.get('room') || '';
    const initialMode = params.get('bingoMode') || 'vocab';

    let mode = initialMode;
    let roomCode = initialRoom || 'DEFAULT';
    let boardItems = [];
    let callQueue = [];
    let currentCall = null;

    function updateShareText() {
      if (!shareText) return;
      shareText.textContent = `Room code: ${roomCode} — یہی code دوستوں کے ساتھ شیئر کریں`;
    }

    function setMode(newMode) {
      mode = newMode;
      modeButtons.forEach(btn => {
        btn.classList.toggle('btn-primary', btn.getAttribute('data-bingo-mode') === mode);
      });
      buildBoard();
    }

    function setRoom(newRoom) {
      roomCode = newRoom || 'DEFAULT';
      updateShareText();
      buildBoard();
    }

    function getPoolForMode() {
      if (mode === 'grammar' && grammarConcepts.length > 0) {
        return grammarConcepts.map((c, idx) => ({
          key: `G${idx}`,
          label: c,
          type: 'grammar'
        }));
      }

      // vocab or audio: use words (Urdu-only labels)
      const base = (words.length ? words : fallbackWords).map((w, idx) => ({
        key: `W${idx}`,
        label: w.urdu,
        urdu: w.urdu,
        english: w.english,
        type: 'vocab'
      }));
      return base;
    }

    function buildBoard() {
      const pool = getPoolForMode();
      if (!pool.length) {
        gridEl.innerHTML = '<tbody><tr><td>ابھی بنگو کے لئے ڈیٹا موجود نہیں۔</td></tr></tbody>';
        return;
      }

      const seed = hashStringToSeed(`${roomCode}::${mode}`);
      const rng = makeRng(seed);
      const shuffled = shuffleWithRng(pool, rng);
      boardItems = shuffled.slice(0, 25);

      // Calls use another shuffle from same pool to keep order deterministic
      callQueue = shuffleWithRng(pool, makeRng(seed ^ 0x9e3779b9));
      currentCall = null;
      currentCallEl.textContent = '';
      statusEl.textContent = '';

      const tbody = document.createElement('tbody');
      let idx = 0;
      for (let r = 0; r < 5; r++) {
        const tr = document.createElement('tr');
        for (let c = 0; c < 5; c++) {
          const item = boardItems[idx++];
          const td = document.createElement('td');
          td.className = 'bingo-cell';
          td.textContent = item ? item.label : '';
          td.dataset.key = item ? item.key : '';
          td.addEventListener('click', () => {
            td.classList.toggle('bingo-marked');
            checkBingo();
          });
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      gridEl.innerHTML = '';
      gridEl.appendChild(tbody);
    }

    function nextCall() {
      if (!callQueue.length) {
        statusEl.textContent = 'مزید الفاظ باقی نہیں ہیں۔';
        statusEl.className = 'game-feedback muted';
        return;
      }
      currentCall = callQueue.shift();
      currentCallEl.textContent = currentCall.label;
      statusEl.textContent = '';
      statusEl.className = 'game-feedback';

      if (mode === 'audio') {
        playAudio();
      }
    }

    async function playAudio() {
      if (!currentCall || !currentCall.urdu) return;
      try {
        const audio = new Audio(`/api/get-tts-audio?text=${encodeURIComponent(currentCall.urdu)}&languageCode=ur-PK`);
        await audio.play();
      } catch (err) {
        console.error('Bingo audio error', err);
      }
    }

    function checkBingo() {
      const rows = Array.from(gridEl.querySelectorAll('tr')).map(tr => Array.from(tr.querySelectorAll('td')));
      const size = rows.length;
      let hasBingo = false;

      // Rows
      for (let r = 0; r < size; r++) {
        if (rows[r].every(td => td.classList.contains('bingo-marked'))) {
          hasBingo = true;
        }
      }
      // Cols
      for (let c = 0; c < size; c++) {
        let all = true;
        for (let r = 0; r < size; r++) {
          if (!rows[r][c].classList.contains('bingo-marked')) {
            all = false;
            break;
          }
        }
        if (all) hasBingo = true;
      }
      // Diagonals
      let d1 = true;
      let d2 = true;
      for (let i = 0; i < size; i++) {
        if (!rows[i][i].classList.contains('bingo-marked')) d1 = false;
        if (!rows[i][size - 1 - i].classList.contains('bingo-marked')) d2 = false;
      }
      if (d1 || d2) hasBingo = true;

      if (hasBingo) {
        statusEl.textContent = '🎉 BINGO! آپ نے جیت لیا';
        statusEl.className = 'game-feedback success';
        // Fire-and-forget: notify backend for points
        try {
          const body = {
            roomCode,
            mode,
            linesCompleted: 1
          };
          fetch('/api/practice/bingo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }).catch(() => {});
        } catch (e) {
          // ignore
        }
      }
    }

    // Event wiring
    nextCallBtn.addEventListener('click', nextCall);
    playAudioBtn.addEventListener('click', playAudio);

    joinBtn.addEventListener('click', () => {
      const code = (roomInput.value || '').trim().toUpperCase() || 'DEFAULT';
      setRoom(code);
    });

    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        setMode(btn.getAttribute('data-bingo-mode'));
      });
    });

    // Initial setup
    if (initialRoom) roomInput.value = initialRoom;
    setRoom(roomCode);
    setMode(mode);
  })();

})();
