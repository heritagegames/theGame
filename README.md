# American Odyssey — Dynamic Content Engine

A Next.js-powered content framework for physical board games.

## Quick Start

### 1. Install Node.js
Download and install Node.js (v20+) from: https://nodejs.org

### 2. Install dependencies
```bash
cd theGame
npm install
```

### 3. Set up environment (optional, for live weather)
```bash
cp .env.local.example .env.local
# Edit .env.local and add your OpenWeatherMap API key
# Free key at: https://openweathermap.org/api
```

### 4. Run the development server
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## How It Works

### The Lobby (/)
- Choose your **era** (1776–present) — all content becomes contextual to that year
- Set the number of teams (2–4)
- Toggle live weather events on/off
- Hit **Start Game**

### The Game Board (/game/[sessionId])
- Select the active team and region
- Draw cards — questions, tasks, items, and challenges filtered to your era
- Reveal answers and award/deny points
- Refresh weather to pull live conditions and trigger regional events

### Content Cards
Seed content lives in `src/data/content-cards.json`. Each card has:
- **regionIds** — which regions it applies to (empty = all regions)
- **yearRange** — the era it's relevant to (null = timeless)
- **type** — question / task / item / challenge / trivia
- **difficulty** — easy / medium / hard

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/sessions | List all sessions |
| POST | /api/sessions | Create a new game session |
| GET | /api/sessions/:id | Get session state |
| PATCH | /api/sessions/:id | Update session (year, state, settings) |
| POST | /api/content/draw | Draw a card for a team in a region |
| GET | /api/events/weather?sessionId= | Fetch live weather events |

---

## Adding Content
Add new cards to `src/data/content-cards.json` following the existing schema.
The engine automatically picks up new cards — no code changes needed.

## Roadmap
- [ ] Score tracking + persistence (database)
- [ ] AI-generated year-specific questions
- [ ] Multiplayer sync via WebSockets
- [ ] Physical table display mode (fullscreen, projector-optimized)
- [ ] Additional game profiles (Risk, Monopoly, custom)
