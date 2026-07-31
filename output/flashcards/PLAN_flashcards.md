# Braille-Friendly HSK1 Flashcard App — Plan

## Overview

A keyboard-driven, screen-reader-friendly flashcard app for learning HSK1 Chinese vocabulary. The app is a single static HTML page with embedded CSS and JS (no build step, no server). It loads the HSK1 word list from a JSON file at runtime and stores all progress in `localStorage`.

**Live at:** `flashcards/index.html`  
**Linked from:** `output/index.html`

---

## Design Decisions

### No framework — vanilla HTML/CSS/JS

- Virtual DOM diffing (React, Vue, etc.) can confuse screen readers by destroying and recreating DOM nodes. Vanilla JS gives us full control over what gets announced and when.
- No build step — edit and refresh.
- Single file keeps everything self-contained and easy to audit for accessibility.

### Accessibility strategy

| Concern | Approach |
|---|---|
| **Braille display** | Chinese characters are rendered as text in the DOM; the braille display hardware translates them to Chinese braille automatically. English text renders as uncontracted braille. No special handling needed in code. |
| **Screen reader announcements** | Use an `aria-live="polite"` region for dynamic updates (new card, correct/wrong feedback). Use `role="status"` for less intrusive announcements. |
| **Keyboard only** | All interactions via single-key presses. No mouse required. Keys chosen to be comfortable on a braille keyboard (Perkins-style input): `f` and `j` are on the home row under index fingers. |
| **Focus management** | Focus stays on a hidden "command input" that captures keystrokes. This prevents the screen reader from wandering and ensures braille display stays in the right place. |
| **Help system** | Press `h` to hear current keybindings and stats announced via the live region. |

---

## Key Bindings

These are chosen to work well with a Perkins-style braille keyboard where the input is mapped to standard QWERTY keys:

| Key | Action |
|---|---|
| `f` | **Wrong** — I didn't know this word |
| `j` | **Correct** — I knew this word |
| `n` / `Space` | **Next card** — show a new card (skip without grading) |
| `h` | **Help** — announce keybindings and current stats via live region |
| `r` | **Reveal** — show the answer before grading (for when you're unsure) |
| `d` | **Toggle direction** — switch between CN→EN, EN→CN, or mixed mode |
| `s` | **Speak** — read the current card content aloud (triggers screen reader to re-announce) |

---

## Vocabulary Pool Algorithm (Simple Leitner-inspired)

### State (per word, stored in localStorage)

```
{
  id: "的",
  status: "unseen" | "active" | "learned",
  correctStreak: 0,        // consecutive correct answers
  totalCorrect: 0,
  totalWrong: 0,
  lastSeen: null,          // timestamp
  direction: null,         // last direction shown ("cn-en" | "en-cn")
}
```

### Algorithm

1. **Initialization:** Pick the first `POOL_SIZE` (default 5) words from the unseen list and set them to `active`. All others remain `unseen`.

2. **Each card:**
   - Pick a random word from the `active` pool.
   - Randomly choose direction (CN→EN or EN→CN) based on the toggle setting.
   - Display the question; wait for keypress.

3. **On Correct (`j`):**
   - `correctStreak += 1`, `totalCorrect += 1`
   - If `correctStreak >= 3`: graduate the word → `status = "learned"`, pull a new word from `unseen` into `active`.
   - Announce "Correct!" via live region.

4. **On Wrong (`f`):**
   - `correctStreak = 0`, `totalWrong += 1`
   - Word stays in active pool.
   - Announce "Wrong — the answer was: [answer]" via live region.

5. **On Skip/Next (`n` or `Space`):**
   - No grading. Just move to next card.

6. **Pool refill:** When `unseen` is empty but `active` still has words, continue with active pool. When all words are `learned`, show a completion message and offer to reset or review learned words.

### Graduation threshold tuning

The threshold of 3 consecutive correct answers is deliberately low for HSK1 (300+ words). We'll make this configurable. The goal is to keep the active pool small enough to build confidence while steadily introducing new words.

---

## File Structure

```
flashcards/
├── index.html          # The app (single file: HTML + inline CSS + inline JS)
└── PLAN_flashcards.md  # This plan
```

The app loads the word data from:
```
vendor/hsk-words/2026/hsk1-words.json
```

Note: Since this is loaded via `fetch()`, the app needs to be served over HTTP (not `file://`). The existing `output/` pages suggest there's already a local server or the user opens them via a server. If needed, we can embed the JSON directly into the HTML to avoid the fetch requirement.

---

## Implementation Phases

### Phase 1: Skeleton (delivers a testable baseline)

**Goal:** A working single-card loop with all the keyboard interaction and screen reader plumbing.

- [x] Create `flashcards/index.html` with:
  - Semantic HTML structure with `aria-live` region
  - Hidden command input for focus management
  - Card display area showing the question word
  - Status bar showing pool stats
  - Help dialog (hidden, triggered by `h`)
- [x] Embed a small subset of words (5-10) directly in the HTML for Phase 1 (no fetch needed yet).
- [x] Implement keyboard handler for all bindings.
- [x] Implement basic card flow: show question → wait → grade → feedback → next.
- [x] Screen reader announcements via live region.
- [x] Link from `output/index.html`.

**What you can test:**
- Press `n` to see a card. Read it on the braille display.
- Press `j` for correct, `f` for wrong.
- Press `h` for help announcement.
- Verify the screen reader announces feedback.

### Phase 2: Full word list + pool algorithm

- [ ] Load `hsk1-words.json` via `fetch()` at startup (or embed it).
- [ ] Implement the pool algorithm with localStorage persistence.
- [ ] Show pool stats: "5 active, 12 learned, 295 unseen".
- [ ] Handle edge cases: all words learned, localStorage corruption, etc.

### Phase 3: Direction toggle + reveal

- [ ] Implement CN→EN / EN→CN / Mixed modes.
- [ ] `r` key to reveal answer before grading.
- [ ] Pinyin display (optionally shown below the Chinese character).

### Phase 4: Polish

- [ ] Visual polish (minimal, high-contrast, large text).
- [ ] Stats screen: accuracy %, words learned today, streak.
- [ ] Reset/restart functionality.
- [ ] Keyboard shortcut overlay (toggle with `?` or `h`).

---

## HTML Structure (Phase 1 target)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>HSK1 Flashcards</title>
  <style>/* minimal, high-contrast styles */</style>
</head>
<body>
  <!-- Hidden command input: always focused, captures all keystrokes -->
  <input type="text" id="cmd-input" autofocus
         aria-label="Flashcard command input. Press H for help.">

  <!-- Main card display -->
  <main id="card-area">
    <div id="direction-label" aria-live="polite"></div>
    <div id="question-word" class="headword"></div>
    <div id="answer-area" hidden>
      <div id="answer-word"></div>
      <div id="pinyin"></div>
    </div>
  </main>

  <!-- Status bar -->
  <footer id="status-bar" aria-live="polite">
    <span id="pool-stats"></span>
  </footer>

  <!-- Screen reader announcement region (polite = doesn't interrupt) -->
  <div id="sr-announce" class="sr-only" aria-live="polite" role="status"></div>

  <!-- Help overlay (hidden by default) -->
  <div id="help-overlay" hidden role="dialog" aria-label="Keyboard help">
    <!-- keybinding table -->
  </div>

  <script>/* app logic */</script>
</body>
</html>
```

### Key ARIA/accessibility patterns

1. **`#cmd-input`**: A real `<input>` that stays focused. All keystrokes are captured here. This prevents the screen reader from intercepting keys. The input is visually hidden but present in the accessibility tree so the braille display cursor has a place to land.

2. **`#sr-announce`**: An `aria-live="polite"` region. We update its text content to trigger screen reader announcements. Using `role="status"` makes it a live region implicitly. We clear and repopulate it for each announcement.

3. **`#card-area`**: The visual center. Large text, high contrast. The `headword` class uses a large font size for readability (both visual and tactile via braille display's character-by-character reading).

4. **Help overlay**: A `role="dialog"` that traps focus when open. Dismissed with `Escape` or `h` again.

---

## Data Flow

```
                     ┌──────────────────┐
                     │  hsk1-words.json │  (static, loaded once)
                     └────────┬─────────┘
                              │ fetch() or embedded
                              ▼
┌──────────┐   load/save   ┌─────────────────┐
│localStorage│◄────────────►│  App State       │
│  key:      │              │  - words[]       │
│  "hsk1-flashcards-v1" │  │  - config        │
└──────────┘              │  - pool stats     │
                          └────────┬─────────┘
                                   │ render
                                   ▼
                          ┌─────────────────┐
                          │  DOM             │
                          │  - question word │
                          │  - feedback      │
                          │  - status bar    │
                          │  - aria-live     │
                          └─────────────────┘
```

---

## Open Questions

1. **Embed JSON or fetch it?** Fetching is cleaner but requires HTTP serving. Embedding makes the file large (~50KB) but works from `file://`. _Decision: start with embedding a small subset for Phase 1; Phase 2 can use fetch._

2. **Pinyin display?** Showing pinyin alongside the Chinese character could help or could be a crutch. _Decision: hide by default, toggle with a key._

3. **Graduation threshold?** 3 consecutive correct is a starting point. We can make it configurable later.

4. **Multiple HSK levels?** The JSON file structure supports it (`hsk1-words.json`). The app can be parameterized for future levels.

---

## Next Steps

1. Build Phase 1 skeleton (`flashcards/index.html`).
2. Link it from `output/index.html`.
3. Test with braille display and screen reader.
4. Gather feedback on:
   - Are the keybindings comfortable on the braille keyboard?
   - Does the aria-live region announce at the right times?
   - Is the text size readable on the braille display?
   - Does focus management work or does the screen reader wander?
5. Iterate into Phase 2 based on feedback.
