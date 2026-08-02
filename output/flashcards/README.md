# HSK1 Flashcards

A keyboard-driven, screen-reader-friendly flashcard app for learning HSK1 Chinese vocabulary. No frameworks, no build step — just vanilla HTML, CSS, and JS served over HTTP.

## Quick Start

Serve this directory with any HTTP server, then open `index.html`. For example:

```bash
cd output/flashcards
python3 -m http.server 8080
# → open http://localhost:8080
```

The app loads word data from `data/hsk1-words.json` via `fetch()`, so it must be served over HTTP (not `file://`). If the fetch fails, a small embedded word list is used as a fallback.

## Key Bindings

Chosen for a Perkins-style braille keyboard where `f` and `j` sit under the index fingers on the home row.

| Key | Action |
|---|---|
| `j` | **Correct** — I knew this word |
| `f` | **Wrong** — I didn't know it |
| `n` / `Space` | **Next card** — skip without grading |
| `r` | **Reveal** — show the answer before grading |
| `d` | **Toggle direction** — CN→EN / EN→CN / Mixed |
| `s` | **Speak** — re-announce the current word |
| `h` / `?` | **Help** — keyboard shortcuts, live stats, reset |

## How It Works

### Pool algorithm (Leitner-inspired)

Words move through three stages:

```
unseen → active → learned
```

- **Initialization:** The first 5 unseen words are moved into the active pool.
- **Each card:** A random word is picked from the active pool. Direction (CN→EN or EN→CN) is chosen randomly or set by the toggle.
- **Correct answer (`j`):** `correctStreak` increments. After 3 consecutive correct answers, the word graduates to `learned` and a new unseen word enters the active pool.
- **Wrong answer (`f`):** `correctStreak` resets to 0. The word stays in the active pool.
- **Skip (`n` / `Space`):** Advances to the next card without grading.
- **Completion:** When all words reach `learned`, a celebration screen appears. You can reset progress from the help overlay.

### Session streaks

A running streak of consecutive correct answers is tracked each session. Your all-time best streak is persisted in `localStorage`.

### Stats

Press `h` to see live stats including accuracy percentage, words learned today, current and best streaks, and the pool breakdown. The stats panel also includes a **Reset All Progress** button (with confirmation).

## File Structure

```
flashcards/
├── index.html          # HTML structure
├── css/
│   └── style.css       # All styles (dark theme, high contrast)
├── js/
│   └── app.js          # Application logic
├── data/
│   └── hsk1-words.json # HSK1 word list (301 words, fetched at runtime)
└── README.md
```

## Accessibility

This app is designed for braille display and screen reader users.

| Concern | Approach |
|---|---|
| **Braille display** | Chinese characters render as text; the hardware translates to Chinese braille automatically. |
| **Screen reader** | An `aria-live="polite"` region announces new cards, feedback, and help text. |
| **Keyboard only** | All interactions are single-key. No mouse required. |
| **Focus management** | A hidden `<input>` captures all keystrokes, preventing the screen reader from wandering. |
| **Reduced motion** | The card fade-in animation is disabled when `prefers-reduced-motion` is set. |

## Data

- **Word list:** HSK1 (2026 revision), 301 words with English translations and pinyin.
- **Progress:** Stored in `localStorage` under the key `hsk1-flashcards-v1`. Clearing your browser data will reset progress.
- **Privacy:** No data is ever sent anywhere — everything stays in your browser.
