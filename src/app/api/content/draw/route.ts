import { NextResponse } from "next/server";
import { drawCard } from "@/lib/content-engine";
import { getSession, addCardDrawn } from "@/lib/session-store";
import type { RegionId, ContentType, Difficulty, ContentDrawResult } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json();
  const { sessionId, teamId, regionId, type, difficulty } = body as {
    sessionId: string;
    teamId: string;
    regionId: RegionId;
    type?: ContentType;
    difficulty?: Difficulty;
  };

  if (!sessionId || !teamId || !regionId) {
    return NextResponse.json(
      { error: "sessionId, teamId, and regionId are required" },
      { status: 400 }
    );
  }

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.state !== "active") {
    return NextResponse.json({ error: "Session is not active" }, { status: 409 });
  }

  const card = drawCard(session, teamId, regionId, { type, difficulty });
  if (!card) {
    return NextResponse.json({ error: "No cards available for this region and year" }, { status: 404 });
  }

  // Record the draw so this card won't be drawn again this session
  addCardDrawn(sessionId, teamId, card.id);

  // Get active events for this region
  const activeEvents = session.currentEvents.filter(
    (e) => e.regionId === regionId && (!e.expiresAt || e.expiresAt > Date.now())
  );

  const result: ContentDrawResult = {
    card,
    teamId,
    regionId,
    sessionYear: session.year,
    activeEvents,
  };

  return NextResponse.json({ data: result });
}
