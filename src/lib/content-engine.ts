import type { ContentCard, RegionId, Difficulty, ContentType, GameSession } from "./types";
import rawCards from "@/data/content-cards.json";

const ALL_CARDS = rawCards as ContentCard[];

export interface DrawOptions {
  regionId: RegionId;
  year: number;
  difficulty?: Difficulty;
  type?: ContentType;
  excludeIds?: string[]; // cards already drawn this session
  count?: number;
}

/**
 * Core content filtering function.
 * Given a region and year, returns matching cards ordered by relevance.
 * Year-specific cards are weighted higher than timeless cards.
 */
export function filterCards(options: DrawOptions): ContentCard[] {
  const { regionId, year, difficulty, type, excludeIds = [] } = options;

  return ALL_CARDS.filter((card) => {
    // Skip already-drawn cards
    if (excludeIds.includes(card.id)) return false;

    // Match region: card must be for this region OR apply to all regions (empty array)
    const regionMatch =
      card.regionIds.length === 0 || card.regionIds.includes(regionId);
    if (!regionMatch) return false;

    // Match year: card must be timeless OR the year falls within its range
    if (card.yearRange !== null) {
      if (year < card.yearRange.start || year > card.yearRange.end) return false;
    }

    // Optional difficulty filter
    if (difficulty && card.difficulty !== difficulty) return false;

    // Optional type filter
    if (type && card.type !== type) return false;

    return true;
  }).sort((a, b) => {
    // Year-specific cards rank higher than timeless ones
    const aSpecific = a.yearRange !== null ? 1 : 0;
    const bSpecific = b.yearRange !== null ? 1 : 0;
    return bSpecific - aSpecific;
  });
}

/**
 * Draw a single card for a team's turn.
 * Respects session difficulty mix settings.
 */
export function drawCard(
  session: GameSession,
  teamId: string,
  regionId: RegionId,
  options?: Partial<DrawOptions>
): ContentCard | null {
  const team = session.teams.find((t) => t.id === teamId);
  const drawnIds = team?.cardsDrawn ?? [];

  // Determine difficulty based on session settings mix
  const difficulty = options?.difficulty ?? pickDifficulty(session.settings.difficultyMix);

  const candidates = filterCards({
    regionId,
    year: session.year,
    difficulty,
    type: options?.type,
    excludeIds: drawnIds,
    count: 1,
  });

  if (candidates.length === 0) {
    // Fall back: try without difficulty constraint
    const fallback = filterCards({
      regionId,
      year: session.year,
      excludeIds: drawnIds,
    });
    return fallback[Math.floor(Math.random() * fallback.length)] ?? null;
  }

  // Pick randomly among candidates (weighted toward year-specific at top)
  const topTier = candidates.slice(0, Math.min(5, candidates.length));
  return topTier[Math.floor(Math.random() * topTier.length)];
}

/**
 * Get a summary of available content for a given region + year.
 * Useful for the lobby screen to show players what era they're playing in.
 */
export function getContentSummary(regionId: RegionId, year: number) {
  const available = filterCards({ regionId, year });
  return {
    total: available.length,
    byDifficulty: {
      easy:   available.filter((c) => c.difficulty === "easy").length,
      medium: available.filter((c) => c.difficulty === "medium").length,
      hard:   available.filter((c) => c.difficulty === "hard").length,
    },
    byType: {
      question:  available.filter((c) => c.type === "question").length,
      task:      available.filter((c) => c.type === "task").length,
      item:      available.filter((c) => c.type === "item").length,
      challenge: available.filter((c) => c.type === "challenge").length,
      trivia:    available.filter((c) => c.type === "trivia").length,
    },
    yearSpecificCount: available.filter((c) => c.yearRange !== null).length,
  };
}

function pickDifficulty(mix: { easy: number; medium: number; hard: number }): Difficulty {
  const rand = Math.random() * 100;
  if (rand < mix.easy) return "easy";
  if (rand < mix.easy + mix.medium) return "medium";
  return "hard";
}
