/**
 * In-memory session store.
 * In production this would be backed by Redis or a database.
 * For local development, sessions persist as long as the Next.js server is running.
 */

import { v4 as uuid } from "uuid";
import type {
  GameSession, Team, RegionId, RegionProgress, SessionSettings, GameProfileId,
} from "./types";
import gameProfilesRaw from "@/data/game-profiles.json";

// Singleton store (survives hot reloads in dev via globalThis)
const g = globalThis as typeof globalThis & { _sessions?: Map<string, GameSession> };
if (!g._sessions) g._sessions = new Map();
const sessions = g._sessions;

const DEFAULT_SETTINGS: SessionSettings = {
  weatherEventsEnabled: true,
  historicalEventsEnabled: true,
  difficultyMix: { easy: 30, medium: 50, hard: 20 },
  pointsToWin: 100,
  proficiencyThreshold: 30,
};

const REGION_IDS: RegionId[] = ["northeast", "southeast", "central", "west"];

const TEAM_COLORS = ["#1a56db", "#e3a008", "#0e9f6e", "#9333ea"];
const TEAM_NAMES  = ["Team Blue", "Team Gold", "Team Green", "Team Purple"];

export function createSession(
  gameProfileId: GameProfileId = "us-map",
  year: number = new Date().getFullYear(),
  teamCount: number = 4,
  settings: Partial<SessionSettings> = {}
): GameSession {
  const id = uuid();
  const now = Date.now();

  const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
    id: uuid(),
    name: TEAM_NAMES[i] ?? `Team ${i + 1}`,
    color: TEAM_COLORS[i] ?? "#888888",
    score: 0,
    currentRegionId: REGION_IDS[i % REGION_IDS.length],
    regionProgress: Object.fromEntries(
      REGION_IDS.map((rid) => [
        rid,
        {
          regionId: rid,
          visited: false,
          questionsAnswered: 0,
          tasksCompleted: 0,
          itemsCollected: [],
          proficiencyScore: 0,
          proficiencyReached: false,
        } satisfies RegionProgress,
      ])
    ) as Record<RegionId, RegionProgress>,
    cardsDrawn: [],
    activeEffects: [],
  }));

  const session: GameSession = {
    id,
    gameProfileId,
    year,
    yearLocked: false,
    state: "lobby",
    teams,
    currentEvents: [],
    round: 0,
    createdAt: now,
    updatedAt: now,
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };

  sessions.set(id, session);
  return session;
}

export function getSession(id: string): GameSession | undefined {
  return sessions.get(id);
}

export function updateSession(id: string, updates: Partial<GameSession>): GameSession | null {
  const existing = sessions.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates, updatedAt: Date.now() };
  sessions.set(id, updated);
  return updated;
}

export function listSessions(): GameSession[] {
  return Array.from(sessions.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function addCardDrawn(sessionId: string, teamId: string, cardId: string): GameSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const teams = session.teams.map((t) =>
    t.id === teamId ? { ...t, cardsDrawn: [...t.cardsDrawn, cardId] } : t
  );
  return updateSession(sessionId, { teams });
}

export function updateTeamScore(
  sessionId: string,
  teamId: string,
  points: number,
  regionId?: RegionId
): GameSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const teams = session.teams.map((t) => {
    if (t.id !== teamId) return t;
    const newScore = Math.max(0, t.score + points);

    let regionProgress = { ...t.regionProgress };
    if (regionId) {
      const rp = regionProgress[regionId];
      const newProfScore = rp.proficiencyScore + Math.max(0, points);
      regionProgress[regionId] = {
        ...rp,
        proficiencyScore: newProfScore,
        proficiencyReached:
          newProfScore >= session.settings.proficiencyThreshold,
      };
    }
    return { ...t, score: newScore, regionProgress };
  });

  return updateSession(sessionId, { teams });
}
