"use client";

import { useEffect, useState, useCallback, use } from "react";
import type { GameSession, ContentDrawResult, RegionId } from "@/lib/types";

const REGION_CONFIG: Record<RegionId, { label: string; emoji: string; colorClass: string; bgClass: string }> = {
  northeast: { label: "Northeast", emoji: "🏙", colorClass: "text-northeast", bgClass: "bg-northeast/10 border-northeast/30" },
  southeast: { label: "Southeast", emoji: "🌴", colorClass: "text-southeast", bgClass: "bg-southeast/10 border-southeast/30" },
  central:   { label: "Central",   emoji: "🌾", colorClass: "text-central",   bgClass: "bg-central/10 border-central/30"   },
  west:      { label: "West",      emoji: "🏔", colorClass: "text-west",       bgClass: "bg-west/10 border-west/30"         },
};
const REGIONS: RegionId[] = ["northeast", "southeast", "central", "west"];

export default function GamePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const [session, setSession] = useState<GameSession | null>(null);
  const [drawResult, setDrawResult] = useState<ContentDrawResult | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionId>("northeast");
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherMsg, setWeatherMsg] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    const json = await res.json();
    if (json.data) {
      setSession(json.data);
      if (!selectedTeam && json.data.teams[0]) {
        setSelectedTeam(json.data.teams[0].id);
      }
    }
    setLoading(false);
  }, [sessionId, selectedTeam]);

  useEffect(() => {
    loadSession();
    const interval = setInterval(loadSession, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [loadSession]);

  async function drawCardForTeam() {
    if (!selectedTeam) return;
    setDrawing(true);
    setShowAnswer(false);
    setDrawResult(null);
    try {
      const res = await fetch("/api/content/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, teamId: selectedTeam, regionId: selectedRegion }),
      });
      const json = await res.json();
      if (json.data) setDrawResult(json.data);
    } finally {
      setDrawing(false);
    }
  }

  async function awardPoints(points: number) {
    if (!selectedTeam || !drawResult) return;
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ /* score update handled by a dedicated endpoint in future */ }),
    });
    await loadSession();
    setDrawResult(null);
    setShowAnswer(false);
  }

  async function fetchWeather() {
    setWeatherLoading(true);
    setWeatherMsg(null);
    const res = await fetch(`/api/events/weather?sessionId=${sessionId}`);
    const json = await res.json();
    if (json.data) {
      const count = json.data.events.length;
      setWeatherMsg(
        count > 0
          ? `${count} new weather event${count > 1 ? "s" : ""} triggered!`
          : "No significant weather events right now."
      );
      await loadSession();
    }
    setWeatherLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Loading game…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">Session not found.</div>
      </div>
    );
  }

  const currentTeam = session.teams.find((t) => t.id === selectedTeam);

  return (
    <main className="min-h-screen p-4 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🗺️ American Odyssey</h1>
          <p className="text-gray-400 text-sm">
            Era: <span className="text-indigo-400 font-semibold">{session.year}</span>
            {" · "}Round <span className="text-indigo-400 font-semibold">{session.round}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchWeather}
            disabled={weatherLoading}
            className="btn-ghost text-xs"
          >
            {weatherLoading ? "Checking…" : "⛅ Refresh Weather"}
          </button>
        </div>
      </div>

      {weatherMsg && (
        <div className="card text-sm text-yellow-300 bg-yellow-900/20 border-yellow-700/30 animate-slide-up">
          ⛅ {weatherMsg}
        </div>
      )}

      {/* Active Events */}
      {session.currentEvents.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Events</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {session.currentEvents.map((ev) => (
              <div key={ev.id} className="card border-yellow-700/30 bg-yellow-900/10 text-sm">
                <div className="font-semibold text-yellow-300 text-xs">{ev.name}</div>
                <div className="text-gray-400 text-xs mt-1">{REGION_CONFIG[ev.regionId]?.label}</div>
                <div className="text-gray-300 text-xs mt-1">{ev.flavor ?? ev.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scoreboard */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Scoreboard</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {session.teams.map((team) => (
            <button
              key={team.id}
              onClick={() => setSelectedTeam(team.id)}
              className={`card border transition-all text-left ${
                selectedTeam === team.id
                  ? "border-indigo-500 bg-indigo-900/20"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                <span className="font-semibold text-sm">{team.name}</span>
              </div>
              <div className="text-2xl font-bold">{team.score}</div>
              <div className="text-xs text-gray-500">points</div>
              <div className="mt-2 flex gap-1">
                {REGIONS.map((rid) => (
                  <div
                    key={rid}
                    title={REGION_CONFIG[rid].label}
                    className={`w-3 h-3 rounded-sm ${
                      team.regionProgress[rid]?.proficiencyReached
                        ? "bg-green-500"
                        : "bg-gray-700"
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs text-gray-600 mt-1">region proficiency</div>
            </button>
          ))}
        </div>
      </div>

      {/* Draw panel */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Controls */}
        <div className="card space-y-4">
          <h2 className="font-semibold">Draw a Card</h2>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Active Team</label>
            <div className="flex flex-wrap gap-2">
              {session.teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeam(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    selectedTeam === t.id
                      ? "border-indigo-400 text-white"
                      : "border-white/10 text-gray-400 hover:border-white/30"
                  }`}
                  style={selectedTeam === t.id ? { backgroundColor: `${t.color}33`, borderColor: t.color } : {}}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Region</label>
            <div className="grid grid-cols-2 gap-2">
              {REGIONS.map((rid) => {
                const cfg = REGION_CONFIG[rid];
                return (
                  <button
                    key={rid}
                    onClick={() => setSelectedRegion(rid)}
                    className={`rounded-lg p-2.5 text-sm font-medium border transition-all text-left ${
                      selectedRegion === rid
                        ? `${cfg.bgClass} border-current ${cfg.colorClass}`
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                  >
                    <span className="mr-1">{cfg.emoji}</span> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={drawCardForTeam}
            disabled={drawing || !selectedTeam}
            className="btn-primary w-full"
          >
            {drawing ? "Drawing…" : `Draw Card for ${session.year}`}
          </button>
        </div>

        {/* Card display */}
        <div className="card min-h-[280px] flex flex-col">
          {!drawResult && (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
              Draw a card to begin
            </div>
          )}

          {drawResult && (
            <div className="flex-1 flex flex-col animate-slide-up">
              {/* Card meta */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  REGION_CONFIG[drawResult.regionId].bgClass
                } ${REGION_CONFIG[drawResult.regionId].colorClass}`}>
                  {REGION_CONFIG[drawResult.regionId].label}
                </span>
                <span className="text-xs text-gray-500 capitalize">{drawResult.card.type}</span>
                <span className={`text-xs ml-auto font-semibold ${
                  drawResult.card.difficulty === "hard" ? "text-red-400" :
                  drawResult.card.difficulty === "medium" ? "text-yellow-400" : "text-green-400"
                }`}>
                  {drawResult.card.difficulty} · {drawResult.card.points} pts
                </span>
              </div>

              {/* Active events warning */}
              {drawResult.activeEvents.length > 0 && (
                <div className="mb-3 text-xs bg-yellow-900/20 border border-yellow-700/30 rounded-lg px-3 py-2 text-yellow-300">
                  ⚠️ {drawResult.activeEvents[0].name} is active in this region
                </div>
              )}

              {/* Question prompt */}
              <div className="flex-1">
                <p className="text-base font-medium leading-relaxed mb-4">
                  {drawResult.card.content.prompt}
                </p>

                {/* Multiple choice */}
                {drawResult.card.content.options && !showAnswer && (
                  <div className="space-y-1.5 mb-4">
                    {drawResult.card.content.options.map((opt, i) => (
                      <div key={i} className="text-sm bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                        {String.fromCharCode(65 + i)}) {opt}
                      </div>
                    ))}
                  </div>
                )}

                {/* Hint */}
                {drawResult.card.content.hint && !showAnswer && (
                  <p className="text-xs text-gray-500 italic">💡 {drawResult.card.content.hint}</p>
                )}
              </div>

              {/* Answer reveal */}
              {showAnswer && drawResult.card.content.answer && (
                <div className="mb-3 bg-green-900/20 border border-green-700/30 rounded-lg px-3 py-2 animate-slide-up">
                  <div className="text-xs text-green-400 font-semibold mb-1">ANSWER</div>
                  <div className="text-sm text-green-300">{drawResult.card.content.answer}</div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                {!showAnswer ? (
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="btn-primary flex-1"
                  >
                    Reveal Answer
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => awardPoints(drawResult.card.points)}
                      className="flex-1 rounded-lg py-2 bg-green-700 hover:bg-green-600 font-semibold text-sm transition-colors"
                    >
                      ✓ Correct (+{drawResult.card.points})
                    </button>
                    <button
                      onClick={() => { setDrawResult(null); setShowAnswer(false); }}
                      className="flex-1 rounded-lg py-2 bg-red-900/40 hover:bg-red-800/60 font-semibold text-sm border border-red-700/30 transition-colors"
                    >
                      ✗ Incorrect
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Region progress per current team */}
      {currentTeam && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {currentTeam.name} — Region Progress
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {REGIONS.map((rid) => {
              const progress = currentTeam.regionProgress[rid];
              const cfg = REGION_CONFIG[rid];
              return (
                <div key={rid} className={`card border ${cfg.bgClass}`}>
                  <div className={`text-sm font-semibold ${cfg.colorClass} mb-2`}>
                    {cfg.emoji} {cfg.label}
                  </div>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div>❓ {progress.questionsAnswered} questions</div>
                    <div>✅ {progress.tasksCompleted} tasks</div>
                    <div>🎒 {progress.itemsCollected.length} items</div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Proficiency</span>
                      <span className={progress.proficiencyReached ? "text-green-400 font-bold" : "text-gray-500"}>
                        {progress.proficiencyReached ? "✓ Reached!" : `${progress.proficiencyScore} pts`}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          progress.proficiencyReached ? "bg-green-500" : "bg-indigo-500"
                        }`}
                        style={{ width: `${Math.min(100, (progress.proficiencyScore / 30) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
