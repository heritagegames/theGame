// ─────────────────────────────────────────────────────────────────────────────
// GAME FRAMEWORK TYPES
// The engine is designed to power any board game. Each game registers a
// GameProfile that defines its regions, content types, and rules.
// ─────────────────────────────────────────────────────────────────────────────

export type RegionId = "northeast" | "southeast" | "central" | "west";

export interface Region {
  id: RegionId;
  name: string;
  color: string;         // Tailwind color token
  states: string[];      // US states in this region
  weatherCities: string[]; // Cities used for live weather lookups
  description: string;
}

export type GameProfileId = "us-map" | "risk" | "monopoly" | string;

export interface GameProfile {
  id: GameProfileId;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  regions: Region[];
  contentTypes: ContentType[];
  winCondition: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT ENGINE TYPES
// Content cards are the atomic unit of gameplay. They are filtered by region,
// year range, difficulty, and type at draw time.
// ─────────────────────────────────────────────────────────────────────────────

export type ContentType = "question" | "task" | "item" | "challenge" | "trivia";
export type Difficulty = "easy" | "medium" | "hard";

export interface YearRange {
  start: number;
  end: number;
}

export interface ContentCard {
  id: string;
  type: ContentType;
  regionIds: RegionId[];      // [] = applies to all regions
  yearRange: YearRange | null; // null = timeless / all years
  difficulty: Difficulty;
  points: number;
  content: {
    prompt: string;
    answer?: string;
    options?: string[];        // for multiple-choice questions
    hint?: string;
    taskDescription?: string;  // for task/challenge cards
    itemName?: string;         // for item cards
    itemEffect?: string;       // what the item does when played
  };
  tags: string[];
  source?: string;             // e.g. "history", "geography", "culture", "weather"
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC EVENT TYPES
// Events are injected into active sessions and affect gameplay in a region.
// They can come from live weather APIs, historical lookups, or be random.
// ─────────────────────────────────────────────────────────────────────────────

export type EventType = "weather" | "historical" | "random" | "challenge";

export type EffectType =
  | "movement_penalty"
  | "point_loss"
  | "point_bonus"
  | "skip_turn"
  | "draw_extra_card"
  | "region_locked"     // no movement into this region this round
  | "double_points";

export interface EventEffect {
  type: EffectType;
  value?: number;        // e.g. -2 movement, +5 points
  durationRounds?: number; // how many rounds it lasts (null = instant)
  affectedTeamIds?: string[]; // null = affects all teams in region
}

export interface DynamicEvent {
  id: string;
  type: EventType;
  regionId: RegionId;
  name: string;
  description: string;
  flavor?: string;       // narrative flavor text for the table display
  effect: EventEffect;
  triggeredAt: number;   // unix timestamp
  expiresAt?: number;    // unix timestamp, null = manual dismissal
  year?: number;         // for historical events tied to a year
  weatherData?: WeatherSnapshot; // raw weather data if type === "weather"
}

export interface WeatherSnapshot {
  city: string;
  condition: string;     // "Thunderstorm", "Snow", "Clear", etc.
  tempF: number;
  description: string;
  icon: string;
  fetchedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION & TEAM TYPES
// A session is a live game instance. Teams track progress per region.
// ─────────────────────────────────────────────────────────────────────────────

export type SessionState = "lobby" | "active" | "paused" | "ended";

export interface RegionProgress {
  regionId: RegionId;
  visited: boolean;
  questionsAnswered: number;
  tasksCompleted: number;
  itemsCollected: string[];  // item card ids
  proficiencyScore: number;  // 0-100
  proficiencyReached: boolean;
}

export interface Team {
  id: string;
  name: string;
  color: string;          // hex color for the table display
  score: number;
  currentRegionId: RegionId;
  regionProgress: Record<RegionId, RegionProgress>;
  cardsDrawn: string[];   // content card ids drawn this session
  activeEffects: EventEffect[]; // effects currently applied to this team
}

export interface GameSession {
  id: string;
  gameProfileId: GameProfileId;
  year: number;            // THE KEY MECHANIC: all content is filtered to this year
  yearLocked: boolean;     // can players change the year mid-game?
  state: SessionState;
  teams: Team[];
  currentEvents: DynamicEvent[];
  round: number;
  createdAt: number;
  updatedAt: number;
  settings: SessionSettings;
}

export interface SessionSettings {
  weatherEventsEnabled: boolean;
  historicalEventsEnabled: boolean;
  difficultyMix: { easy: number; medium: number; hard: number }; // % of each
  pointsToWin: number;
  proficiencyThreshold: number; // points needed per region to claim proficiency
}

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ContentDrawResult {
  card: ContentCard;
  teamId: string;
  regionId: RegionId;
  sessionYear: number;
  activeEvents: DynamicEvent[]; // events active in this region right now
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
