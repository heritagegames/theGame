import type { DynamicEvent, RegionId, WeatherSnapshot, EffectType } from "./types";
import { v4 as uuid } from "uuid";

const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = "https://api.openweathermap.org/data/2.5";

interface OWMResponse {
  weather: { main: string; description: string; icon: string }[];
  main: { temp: number };
  name: string;
}

export async function fetchWeatherForCity(city: string): Promise<WeatherSnapshot | null> {
  if (!API_KEY || API_KEY === "your_key_here") return null;

  try {
    const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=imperial`;
    const res = await fetch(url, { next: { revalidate: 600 } }); // cache 10 min
    if (!res.ok) return null;

    const data: OWMResponse = await res.json();
    return {
      city: data.name,
      condition: data.weather[0]?.main ?? "Unknown",
      tempF: Math.round(data.main.temp),
      description: data.weather[0]?.description ?? "",
      icon: data.weather[0]?.icon ?? "",
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Translate a weather condition into a gameplay event for a region.
 * Severe weather = penalties; nice weather = bonuses.
 */
export function weatherToEvent(
  snapshot: WeatherSnapshot,
  regionId: RegionId
): DynamicEvent | null {
  const mapping = getWeatherMapping(snapshot.condition, snapshot.tempF);
  if (!mapping) return null;

  return {
    id: uuid(),
    type: "weather",
    regionId,
    name: mapping.name,
    description: `Live weather in ${snapshot.city}: ${snapshot.description} (${snapshot.tempF}°F). ${mapping.description}`,
    flavor: mapping.flavor,
    effect: {
      type: mapping.effectType,
      value: mapping.value,
      durationRounds: mapping.durationRounds,
    },
    triggeredAt: Date.now(),
    expiresAt: Date.now() + 30 * 60 * 1000, // expire after 30 min
    weatherData: snapshot,
  };
}

interface WeatherMapping {
  name: string;
  description: string;
  flavor: string;
  effectType: EffectType;
  value: number;
  durationRounds: number;
}

function getWeatherMapping(condition: string, tempF: number): WeatherMapping | null {
  const c = condition.toLowerCase();

  if (c.includes("thunderstorm")) {
    return {
      name: "⛈ Thunderstorm Warning",
      description: "Severe thunderstorms are disrupting travel in this region.",
      flavor: "Lightning crackles across the sky. Your team hunkers down and loses a turn.",
      effectType: "skip_turn",
      value: 1,
      durationRounds: 1,
    };
  }
  if (c.includes("tornado") || c === "squall") {
    return {
      name: "🌪 Tornado Alert",
      description: "Dangerous conditions in this region.",
      flavor: "A funnel cloud touches down nearby. All teams in the region lose 5 points.",
      effectType: "point_loss",
      value: 5,
      durationRounds: 2,
    };
  }
  if (c.includes("snow") || c.includes("blizzard")) {
    return {
      name: "❄️ Blizzard Conditions",
      description: "Heavy snow is slowing all movement in this region.",
      flavor: "Whiteout conditions. Movement is cut in half this round.",
      effectType: "movement_penalty",
      value: 2,
      durationRounds: 2,
    };
  }
  if (c.includes("rain") || c.includes("drizzle")) {
    return {
      name: "🌧 Heavy Rain",
      description: "Persistent rain is making travel difficult.",
      flavor: "Mud and flooding slow your progress. Lose 1 movement this round.",
      effectType: "movement_penalty",
      value: 1,
      durationRounds: 1,
    };
  }
  if (c.includes("fog") || c.includes("mist") || c.includes("haze")) {
    return {
      name: "🌫 Dense Fog",
      description: "Low visibility is affecting navigation.",
      flavor: "You can barely see the road ahead. Draw 1 fewer card this round.",
      effectType: "movement_penalty",
      value: 1,
      durationRounds: 1,
    };
  }
  if (tempF >= 100) {
    return {
      name: "🌡 Extreme Heat",
      description: "Dangerous heat wave in this region.",
      flavor: "The heat is oppressive. Teams moving here lose 3 points from exhaustion.",
      effectType: "point_loss",
      value: 3,
      durationRounds: 2,
    };
  }
  if (tempF <= 10) {
    return {
      name: "🥶 Arctic Freeze",
      description: "Dangerously cold temperatures are affecting the region.",
      flavor: "Frostbite risk is high. Movement penalty of 2 this round.",
      effectType: "movement_penalty",
      value: 2,
      durationRounds: 1,
    };
  }
  if (c.includes("clear") && tempF >= 65 && tempF <= 80) {
    return {
      name: "☀️ Perfect Conditions",
      description: "Ideal travel weather in this region.",
      flavor: "Blue skies and a gentle breeze. Gain 3 bonus points for traveling through this region!",
      effectType: "point_bonus",
      value: 3,
      durationRounds: 1,
    };
  }

  // Neutral weather — no gameplay effect
  return null;
}
