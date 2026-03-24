import { NextResponse } from "next/server";
import { createSession, listSessions } from "@/lib/session-store";
import type { SessionSettings, GameProfileId } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ data: listSessions() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      gameProfileId = "us-map",
      year = new Date().getFullYear(),
      teamCount = 4,
      settings = {},
    } = body as {
      gameProfileId?: GameProfileId;
      year?: number;
      teamCount?: number;
      settings?: Partial<SessionSettings>;
    };

    if (year < 1776 || year > new Date().getFullYear()) {
      return NextResponse.json(
        { error: `Year must be between 1776 and ${new Date().getFullYear()}` },
        { status: 400 }
      );
    }

    const session = createSession(gameProfileId, year, teamCount, settings);
    return NextResponse.json({ data: session }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
