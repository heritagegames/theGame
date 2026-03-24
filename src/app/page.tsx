"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const YEAR_PRESETS = [
  { label: "Colonial Era",    year: 1776 },
  { label: "Civil War",       year: 1863 },
  { label: "Roaring Twenties",year: 1925 },
  { label: "WWII Era",        year: 1944 },
  { label: "Space Age",       year: 1969 },
  { label: "Cold War",        year: 1980 },
  { label: "Digital Age",     year: 2000 },
  { label: "Modern Day",      year: new Date().getFullYear() },
];

const REGION_INFO = [
  { id: "northeast", label: "Northeast", color: "text-northeast",   emoji: "🏙" },
  { id: "southeast", label: "Southeast", color: "text-southeast",   emoji: "🌴" },
  { id: "central",   label: "Central",   color: "text-central",     emoji: "🌾" },
  { id: "west",      label: "West",      color: "text-west",        emoji: "🏔" },
];

export default function LobbyPage() {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear());
  const [teamCount, setTeamCount] = useState(4);
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startGame() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameProfileId: "us-map",
          year,
          teamCount,
          settings: { weatherEventsEnabled: weatherEnabled },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create session");

      // Start the session
      await fetch(`/api/sessions/${json.data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "active" }),
      });

      router.push(`/game/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-10 animate-fade-in">
        <div className="text-5xl mb-3">🗺️</div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">American Odyssey</h1>
        <p className="text-gray-400 text-lg">
          Traverse the nation. Claim your era. Prove you know America.
        </p>
      </div>

      {/* Setup card */}
      <div className="w-full max-w-xl card space-y-8 animate-slide-up">

        {/* Year selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-3">
            🕰 Choose Your Era
          </label>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {YEAR_PRESETS.map((p) => (
              <button
                key={p.year}
                onClick={() => setYear(p.year)}
                className={`rounded-lg p-2 text-xs font-medium border transition-all ${
                  year === p.year
                    ? "bg-indigo-600 border-indigo-400 text-white"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-gray-200"
                }`}
              >
                <div className="font-bold text-sm">{p.year}</div>
                <div className="opacity-80">{p.label}</div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1776}
              max={new Date().getFullYear()}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-2xl font-bold text-indigo-400 w-16 text-right">{year}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            All questions, tasks, and events will be contextual to this year.
          </p>
        </div>

        {/* Team count */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-3">
            👥 Number of Teams
          </label>
          <div className="flex gap-2">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setTeamCount(n)}
                className={`flex-1 rounded-lg py-3 font-bold border transition-all ${
                  teamCount === n
                    ? "bg-indigo-600 border-indigo-400 text-white"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                }`}
              >
                {n} Teams
              </button>
            ))}
          </div>
        </div>

        {/* Regions preview */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-3">
            🧭 Regions
          </label>
          <div className="grid grid-cols-2 gap-2">
            {REGION_INFO.map((r) => (
              <div key={r.id} className={`card region-card-${r.id} border`}>
                <span className="text-lg mr-2">{r.emoji}</span>
                <span className={`font-semibold ${r.color}`}>{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-300">⛅ Live Weather Events</div>
            <div className="text-xs text-gray-500">Real weather affects gameplay in each region</div>
          </div>
          <button
            onClick={() => setWeatherEnabled(!weatherEnabled)}
            className={`w-12 h-6 rounded-full transition-all ${
              weatherEnabled ? "bg-indigo-600" : "bg-white/20"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${
                weatherEnabled ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Start button */}
        <button
          onClick={startGame}
          disabled={loading}
          className="btn-primary w-full py-4 text-base"
        >
          {loading ? "Setting up your game..." : `Start Game — ${year}`}
        </button>
      </div>

      <p className="text-gray-600 text-xs mt-8">
        A dynamic content framework for physical board games
      </p>
    </main>
  );
}
