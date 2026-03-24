import { NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/session-store";
import type { SessionState } from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({ data: session });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const body = await req.json();
  const allowedUpdates: string[] = ["year", "state", "yearLocked", "settings"];
  const updates: Record<string, unknown> = {};

  for (const key of allowedUpdates) {
    if (key in body) updates[key] = body[key];
  }

  // Validate state transitions
  if (updates.state) {
    const validTransitions: Record<SessionState, SessionState[]> = {
      lobby:   ["active"],
      active:  ["paused", "ended"],
      paused:  ["active", "ended"],
      ended:   [],
    };
    const nextState = updates.state as SessionState;
    if (!validTransitions[session.state].includes(nextState)) {
      return NextResponse.json(
        { error: `Cannot transition from '${session.state}' to '${nextState}'` },
        { status: 400 }
      );
    }
    if (nextState === "active" && session.state === "lobby") {
      updates.round = 1;
    }
  }

  const updated = updateSession(sessionId, updates);
  return NextResponse.json({ data: updated });
}
