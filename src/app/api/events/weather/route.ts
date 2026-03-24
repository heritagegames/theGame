import { NextResponse } from "next/server";
import { fetchWeatherForCity, weatherToEvent } from "@/lib/weather";
import { getSession, updateSession } from "@/lib/session-store";
import type { RegionId } from "@/lib/types";
import gameProfilesRaw from "@/data/game-profiles.json";

// GET /api/events/weather?sessionId=xxx
// Fetches live weather for all regions and injects events into the session
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  if (!session.settings.weatherEventsEnabled) {
    return NextResponse.json({ data: { events: [], message: "Weather events disabled" } });
  }

  // Find the game profile to get weather cities
  const profile = (gameProfilesRaw as { id: string; regions: { id: string; weatherCities: string[] }[] }[])
    .find((p) => p.id === session.gameProfileId);

  if (!profile) {
    return NextResponse.json({ error: "Game profile not found" }, { status: 404 });
  }

  const newEvents = [];
  const now = Date.now();

  // Remove expired events first
  const activeEvents = session.currentEvents.filter(
    (e) => !e.expiresAt || e.expiresAt > now
  );

  for (const region of profile.regions) {
    const regionId = region.id as RegionId;

    // Pick one city per region to check weather
    const city = region.weatherCities[Math.floor(Math.random() * region.weatherCities.length)];
    if (!city) continue;

    const snapshot = await fetchWeatherForCity(city);
    if (!snapshot) continue;

    const event = weatherToEvent(snapshot, regionId);
    if (!event) continue;

    // Don't stack same-type events in same region
    const alreadyActive = activeEvents.some(
      (e) => e.regionId === regionId && e.type === "weather"
    );
    if (!alreadyActive) {
      newEvents.push(event);
    }
  }

  const allEvents = [...activeEvents, ...newEvents];
  updateSession(sessionId, { currentEvents: allEvents });

  return NextResponse.json({ data: { events: newEvents, total: allEvents.length } });
}
