// =========================================================================
// HSK1 Flashcard App
// =========================================================================

// --- Word data ---
// URL to the full HSK1 word list JSON (relative to this page).
const WORD_LIST_URL = "data/hsk1-words.json";

// Small embedded set used as a fallback if the fetch fails.
// Structure is the normalized flat form: { "的": { en: "...", pinyin: "de" } }
const EMBEDDED_WORDS = {
  "的":   { "en": "possession particle", "pinyin": "de" },
  "我":   { "en": "I, me",              "pinyin": "wǒ" },
  "你":   { "en": "you (singular)",      "pinyin": "nǐ" },
  "是":   { "en": "to be",              "pinyin": "shì" },
  "好":   { "en": "good, nice",         "pinyin": "hǎo" },
  "中国": { "en": "China",              "pinyin": "Zhōngguó" },
  "谢谢": { "en": "thank you",          "pinyin": "xièxie" },
  "不":   { "en": "no, not",            "pinyin": "bù" },
  "人":   { "en": "person, people",     "pinyin": "rén" },
  "大":   { "en": "large, big",         "pinyin": "dà" },
};

// The active word data — populated at startup, either from the JSON file
// (normalized to the flat structure) or from EMBEDDED_WORDS as a fallback.
let wordData = null;

/**
 * Fetch the full word list and normalize it to the flat { en, pinyin } shape.
 * Falls back to EMBEDDED_WORDS on any failure.
 *
 * @returns {Promise<object>} The normalized word data.
 */
async function loadWordData() {
  try {
    const resp = await fetch(WORD_LIST_URL);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const json = await resp.json();

    // Normalize: { "的": { translations: { en: "…" }, pinyin: "de" } }
    //        → { "的": { en: "…", pinyin: "de" } }
    const normalized = {};
    for (const [ch, entry] of Object.entries(json)) {
      normalized[ch] = {
        en: entry.translations?.en || "",
        pinyin: entry.pinyin || "",
      };
    }
    return normalized;
  } catch (err) {
    console.warn("Could not load word list, using embedded fallback:", err);
    return EMBEDDED_WORDS;
  }
}

// --- Constants ---
const POOL_SIZE = 5;
const GRADUATION_STREAK = 3;
const STORAGE_KEY = "hsk1-flashcards-v1";
const DIRECTIONS = ["cn-en", "en-cn"];

// --- DOM refs ---
const $cmd   = document.getElementById("cmd-input");
const $dir   = document.getElementById("direction-label");
const $qWord = document.getElementById("question-word");
const $aArea = document.getElementById("answer-area");
const $aWord = document.getElementById("answer-word");
const $pinyin = document.getElementById("pinyin-display");
const $fb    = document.getElementById("feedback");
const $stats = document.getElementById("pool-stats");
const $sr    = document.getElementById("sr-announce");
const $help  = document.getElementById("help-overlay");
const $helpStats  = document.getElementById("help-stats");
const $helpReset = document.getElementById("help-reset");

// --- State ---
let state = {
  words: {},   // { id: { status, correctStreak, totalCorrect, totalWrong, lastSeen, graduatedAt } }
  config: {
    direction: "mixed", // "cn-en" | "en-cn" | "mixed"
    poolSize: POOL_SIZE,
  },
  currentCard: null,   // { id, direction, questionWord, answerWord, pinyin }
  cardState: "question", // "question" | "revealed" | "graded"
  bestStreak: 0,       // all-time best correct-answer streak in a session
  currentStreak: 0,    // current consecutive correct answers this session
};

// --- Persistence ---
function saveState() {
  const toSave = {
    words: state.words,
    config: state.config,
    bestStreak: state.bestStreak,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    // localStorage full or unavailable — silently continue
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state.words = saved.words || {};
      state.config = { ...state.config, ...(saved.config || {}) };
      state.bestStreak = saved.bestStreak || 0;
    }
  } catch (e) {
    // Corrupt data — reset
    state.words = {};
    state.bestStreak = 0;
  }
}

// --- Word management ---
function getWordList() {
  return Object.keys(wordData);
}

function getEnglish(chinese) {
  return wordData[chinese]?.en || "";
}

function getPinyin(chinese) {
  return wordData[chinese]?.pinyin || "";
}

function ensureWord(id) {
  if (!state.words[id]) {
    state.words[id] = {
      status: "unseen",
      correctStreak: 0,
      totalCorrect: 0,
      totalWrong: 0,
      lastSeen: null,
      graduatedAt: null,
    };
  }
  return state.words[id];
}

// --- Pool logic ---
function initPool() {
  const allWords = getWordList();
  // Ensure all words have state entries
  allWords.forEach((id) => ensureWord(id));

  // Count active words
  const activeCount = allWords.filter(
    (id) => state.words[id].status === "active"
  ).length;

  // Fill active pool up to POOL_SIZE
  if (activeCount < state.config.poolSize) {
    const unseen = allWords.filter(
      (id) => state.words[id].status === "unseen"
    );
    // Shuffle unseen to avoid always picking the same order
    shuffle(unseen);
    const needed = state.config.poolSize - activeCount;
    for (let i = 0; i < needed && i < unseen.length; i++) {
      state.words[unseen[i]].status = "active";
    }
  }

  saveState();
}

function getActiveWords() {
  return Object.keys(state.words).filter(
    (id) => state.words[id].status === "active"
  );
}

function getPoolStats() {
  const all = Object.keys(state.words);
  const active = all.filter(
    (id) => state.words[id].status === "active"
  ).length;
  const learned = all.filter(
    (id) => state.words[id].status === "learned"
  ).length;
  const unseen = all.filter(
    (id) => state.words[id].status === "unseen"
  ).length;
  return { active, learned, unseen, total: all.length };
}

/**
 * Compute detailed stats for the stats panel.
 * Returns accuracy %, words learned today, current/best streak, and pool breakdown.
 */
function getDetailedStats() {
  const pool = getPoolStats();
  const entries = Object.values(state.words);

  // Overall accuracy
  const totalCorrect = entries.reduce((s, w) => s + (w.totalCorrect || 0), 0);
  const totalWrong   = entries.reduce((s, w) => s + (w.totalWrong || 0), 0);
  const totalAttempts = totalCorrect + totalWrong;
  const accuracy = totalAttempts > 0
    ? Math.round((totalCorrect / totalAttempts) * 100)
    : 0;

  // Words learned today (local time)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;
  const learnedToday = entries.filter((w) => {
    return w.graduatedAt && w.graduatedAt >= todayStart && w.graduatedAt < todayEnd;
  }).length;

  return {
    ...pool,
    accuracy,
    totalAttempts,
    learnedToday,
    currentStreak: state.currentStreak,
    bestStreak: state.bestStreak,
  };
}

/**
 * Reset all progress after confirmation.
 * Clears localStorage and re-initializes the app fresh.
 */
function resetProgress() {
  // Double confirmation to prevent accidental reset
  const msg = "Reset all progress? This cannot be undone.\n\n" +
    "Press J to confirm, any other key to cancel.";
  announce(msg);
  $qWord.textContent = "Reset?";
  $fb.textContent = "Press J to confirm reset, or Escape to cancel.";
  $fb.className = "info";

  function onResetKey(e) {
    const key = e.key.toLowerCase();
    if (key === "j") {
      // Confirmed — wipe everything
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (_) { /* ignore */ }
      cleanupReset();
      // Re-init from scratch: reset state, reload word data
      state.words = {};
      state.config.direction = "mixed";
      state.bestStreak = 0;
      state.currentStreak = 0;
      state.currentCard = null;
      state.cardState = "question";
      initPool();
      updateStats();
      nextCard();
      announce("Progress has been reset.");
    } else if (key === "escape") {
      cleanupReset();
      announce("Reset cancelled.");
      // Restore the current card display
      if (state.currentCard) {
        renderCard();
      } else {
        nextCard();
      }
    }
    // Ignore all other keys during confirmation
  }

  function cleanupReset() {
    $cmd.removeEventListener("keydown", onResetKey);
    $cmd.focus();
  }

  $cmd.addEventListener("keydown", onResetKey);
}

function graduateWord(id) {
  state.words[id].status = "learned";
  state.words[id].graduatedAt = Date.now();
  // Pull a new word from unseen
  const unseen = Object.keys(state.words).filter(
    (k) => state.words[k].status === "unseen"
  );
  if (unseen.length > 0) {
    const pick = unseen[Math.floor(Math.random() * unseen.length)];
    state.words[pick].status = "active";
  }
  saveState();
}

// --- Card generation ---
function pickDirection() {
  if (state.config.direction === "mixed") {
    return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
  }
  return state.config.direction;
}

function generateCard() {
  const active = getActiveWords();
  if (active.length === 0) {
    // All words learned or no words at all
    return null;
  }

  const id = active[Math.floor(Math.random() * active.length)];
  const dir = pickDirection();
  const english = getEnglish(id);
  const pinyin = getPinyin(id);

  let questionWord, answerWord;
  if (dir === "cn-en") {
    questionWord = id;      // Show Chinese
    answerWord = english;   // Answer is English
  } else {
    questionWord = english; // Show English
    answerWord = id;        // Answer is Chinese
  }

  return { id, direction: dir, questionWord, answerWord, pinyin };
}

// --- Rendering ---
function renderCard() {
  const card = state.currentCard;
  state.cardState = "question";

  // Hide answer area
  $aArea.hidden = true;

  // Direction label
  if (card.direction === "cn-en") {
    $dir.textContent = "Chinese → English";
  } else {
    $dir.textContent = "English → Chinese";
  }

  // Question word
  $qWord.textContent = card.questionWord;
  $qWord.classList.remove("new-card");
  void $qWord.offsetWidth; // force reflow
  $qWord.classList.add("new-card");

  // Clear feedback
  $fb.textContent = "";
  $fb.className = "";

  // Pre-fill answer (hidden)
  $aWord.textContent = card.answerWord;
  $pinyin.textContent = card.pinyin || "";

  // Update stats
  updateStats();

  // Announce to screen reader
  announce(`New card. ${card.questionWord}`);
}

function revealAnswer() {
  if (state.cardState === "revealed" || state.cardState === "graded") return;
  state.cardState = "revealed";
  $aArea.hidden = false;
  announce(`Answer: ${state.currentCard.answerWord}`);
}

function showFeedback(correct) {
  state.cardState = "graded";
  $aArea.hidden = false;

  const card = state.currentCard;
  if (correct) {
    $fb.textContent = "✓ Correct!";
    $fb.className = "correct";
    announce("Correct!");
  } else {
    $fb.textContent = `✗ Wrong — it was: ${card.answerWord}`;
    $fb.className = "wrong";
    announce(`Wrong. The answer is: ${card.answerWord}`);
  }
}

function updateStats() {
  const stats = getPoolStats();
  $stats.textContent =
    `Active: ${stats.active} · Learned: ${stats.learned} · Unseen: ${stats.unseen}`;
}

// --- Screen reader announcements ---
let _announceToggle = false;

function announce(message) {
  // Force the live-region text to differ on every call — even for the same
  // logical message — so screen readers re-announce it. The zero-width space
  // is invisible and not spoken, but makes the DOM text unique.
  _announceToggle = !_announceToggle;
  const unique = _announceToggle ? message + "​" : message;

  $sr.textContent = "";
  requestAnimationFrame(() => {
    $sr.textContent = unique;
  });
}

// --- Actions ---
function nextCard() {
  // Ensure pool is filled
  initPool();

  const card = generateCard();
  if (!card) {
    // All learned!
    $qWord.textContent = "🎉";
    $dir.textContent = "All words learned!";
    $fb.textContent = "You've mastered this set. Reset to start over.";
    $fb.className = "info";
    $aArea.hidden = true;
    $stats.textContent = "";
    announce(
      "Congratulations! You have learned all the words in this set."
    );
    state.currentCard = null;
    return;
  }

  state.currentCard = card;
  renderCard();
}

function gradeCard(correct) {
  if (!state.currentCard) return;
  if (state.cardState === "graded") return; // Already graded

  const card = state.currentCard;
  const word = ensureWord(card.id);
  word.lastSeen = Date.now();

  if (correct) {
    word.correctStreak += 1;
    word.totalCorrect += 1;
    state.currentStreak += 1;
    if (state.currentStreak > state.bestStreak) {
      state.bestStreak = state.currentStreak;
    }
    if (word.correctStreak >= GRADUATION_STREAK) {
      graduateWord(card.id);
      announce(`Correct! "${card.id}" has been learned.`);
    }
  } else {
    word.correctStreak = 0;
    word.totalWrong += 1;
    state.currentStreak = 0;
  }

  saveState();
  showFeedback(correct);
}

function toggleDirection() {
  const order = ["mixed", "cn-en", "en-cn"];
  const idx = order.indexOf(state.config.direction);
  state.config.direction = order[(idx + 1) % order.length];
  saveState();
  const labels = {
    "mixed": "Mixed direction",
    "cn-en": "Chinese to English",
    "en-cn": "English to Chinese",
  };
  announce(`Direction: ${labels[state.config.direction]}`);
  $dir.textContent = labels[state.config.direction];
}

function speakCard() {
  if (!state.currentCard) return;
  announce(state.currentCard.questionWord);
}

function showHelp() {
  // Populate live stats before showing
  const s = getDetailedStats();
  if ($helpStats) {
    $helpStats.innerHTML =
      `<span>Total words: <strong>${s.total}</strong></span>` +
      `<span>Active: <strong>${s.active}</strong></span>` +
      `<span>Learned: <strong>${s.learned}</strong></span>` +
      `<span>Unseen: <strong>${s.unseen}</strong></span>` +
      `<span>Accuracy: <strong>${s.accuracy}%</strong> (${s.totalAttempts} graded)</span>` +
      `<span>Learned today: <strong>${s.learnedToday}</strong></span>` +
      `<span>Current streak: <strong>${s.currentStreak}</strong></span>` +
      `<span>Best streak: <strong>${s.bestStreak}</strong></span>`;
  }

  $help.hidden = false;
  announce("Help shown. Press Escape to close.");
}

function hideHelp() {
  $help.hidden = true;
  $cmd.focus();
  announce("Help closed.");
}

function announceHelp() {
  announce(
    "Keys: J for correct, F for wrong, N for next card, R to reveal, D to toggle direction, S to repeat card, H for this help."
  );
}

// --- Keyboard handler ---
$cmd.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  // Help overlay is open — only handle close keys
  if (!$help.hidden) {
    if (key === "escape" || key === "h" || key === "?") {
      e.preventDefault();
      hideHelp();
    }
    return;
  }

  // Prevent default for all our handled keys
  const handledKeys = [
    "j", "f", "n", " ", "h", "?", "r", "d", "s", "escape",
  ];
  if (handledKeys.includes(key)) {
    e.preventDefault();
  }

  switch (key) {
    case "j":
      if (state.currentCard && state.cardState !== "graded") {
        gradeCard(true);
      }
      break;

    case "f":
      if (state.currentCard && state.cardState !== "graded") {
        gradeCard(false);
      }
      break;

    case "n":
    case " ":
      nextCard();
      break;

    case "r":
      if (state.currentCard && state.cardState === "question") {
        revealAnswer();
      }
      break;

    case "d":
      toggleDirection();
      break;

    case "s":
      speakCard();
      break;

    case "h":
    case "?":
      showHelp();
      break;

    case "escape":
      // If answer is revealed, hide it
      if (state.cardState === "revealed") {
        $aArea.hidden = true;
        state.cardState = "question";
      }
      break;
  }
});

// Reset button inside help overlay
if ($helpReset) {
  $helpReset.addEventListener("click", () => {
    hideHelp();
    // Brief delay so the overlay close is processed before we hijack keys
    setTimeout(() => resetProgress(), 100);
  });
}

// Keep focus on the command input at all times
document.addEventListener("click", (e) => {
  // Don't refocus if the click was on a button inside the help overlay
  if (e.target.closest("#help-overlay button")) return;
  $cmd.focus();
});

// Refocus if it ever loses focus
$cmd.addEventListener("blur", () => {
  setTimeout(() => {
    if (document.activeElement !== $cmd && $help.hidden) {
      $cmd.focus();
    }
  }, 50);
});

// --- Utilities ---
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// --- Initialization ---
async function init() {
  // Show loading state while fetching the word list
  $qWord.textContent = "Loading words…";
  $dir.textContent = "";
  announce("Loading HSK1 word list. Please wait.");

  wordData = await loadWordData();

  loadState();
  initPool();
  updateStats();

  const stats = getPoolStats();
  const source = wordData === EMBEDDED_WORDS ? " (fallback set)" : "";
  announce(
    `HSK1 Flashcards ready. ${stats.total} words loaded${source}. ` +
    `${stats.active} active, ${stats.learned} learned. Press H for help.`
  );

  // Always show a first card
  nextCard();

  // Ensure focus
  $cmd.focus();
}

// --- Start ---
init();
