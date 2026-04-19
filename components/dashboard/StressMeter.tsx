"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Info,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const MOOD_CONFIG = [
  { emoji: "😄", label: "Great",     weight: 0, color: "#10b981", bg: "bg-emerald-500" },
  { emoji: "🙂", label: "Good",      weight: 1, color: "#6ee7b7", bg: "bg-emerald-300" },
  { emoji: "😐", label: "Okay",      weight: 2, color: "#fbbf24", bg: "bg-amber-400"   },
  { emoji: "😕", label: "Not great", weight: 3, color: "#f97316", bg: "bg-orange-500"  },
  { emoji: "😢", label: "Sad",       weight: 4, color: "#ef4444", bg: "bg-red-500"     },
  { emoji: "😭", label: "Terrible",  weight: 5, color: "#991b1b", bg: "bg-red-900"     },
];

const MAX_WEIGHT = 5;

// Weight lookup
const WEIGHT_MAP: Record<string, number> = Object.fromEntries(
  MOOD_CONFIG.map((m) => [m.emoji, m.weight])
);

// Color lookup
const COLOR_MAP: Record<string, string> = Object.fromEntries(
  MOOD_CONFIG.map((m) => [m.emoji, m.color])
);

const LABEL_MAP: Record<string, string> = Object.fromEntries(
  MOOD_CONFIG.map((m) => [m.emoji, m.label])
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  emoji: string;
  source: "manual" | "ai";
  timestamp: string;
}

interface DayData {
  date: string;           // "YYYY-MM-DD"
  label: string;          // "Mon 14"
  dominantEmoji: string;  // The winning emoji for that day
  stressWeight: number;   // 0–5
  stressIndex: number;    // 0–100
  emojiCounts: Record<string, number>;
  totalEvents: number;
  wellbeingScore: number; // For bar height (inverted)
}

interface StressMeterProps {
  uid: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a Date → "YYYY-MM-DD" in local time */
function toDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Short day label e.g. "Mon 14" */
function toDayLabel(dateKey: string): string {
  const d = new Date(dateKey + "T12:00:00"); // noon avoids TZ edge cases
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

/** Last N days as "YYYY-MM-DD" keys, oldest → newest */
function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toDateKey(d));
  }
  return days;
}

/**
 * Given counts for one day, find the dominant emoji.
 * Dominance = highest (count × weight) — most-felt stress wins.
 * Tie-break: higher weight wins.
 */
function findDominantEmoji(counts: Record<string, number>): string {
  let best = "😐";
  let bestScore = -1;

  for (const [emoji, count] of Object.entries(counts)) {
    if (count === 0) continue;
    const weight = WEIGHT_MAP[emoji] ?? 2;
    const score = count * weight + weight * 0.01; // tiny tie-break for weight
    if (score > bestScore) {
      bestScore = score;
      best = emoji;
    }
  }
  return best;
}

/**
 * Stress index 0–100 for a day.
 * Formula: (weightedSum / totalEvents) / MAX_WEIGHT × 100
 */
function calcStressIndex(counts: Record<string, number>): number {
  let weightedSum = 0;
  let total = 0;
  for (const [emoji, count] of Object.entries(counts)) {
    const w = WEIGHT_MAP[emoji] ?? 2;
    weightedSum += w * count;
    total += count;
  }
  if (total === 0) return 0;
  return Math.round((weightedSum / total / MAX_WEIGHT) * 100);
}

/**
 * Wellbeing score for bar height — higher = happier.
 * Formula from spec: Σ (MAX_WEIGHT - weight) × count
 */
function calcWellbeingScore(counts: Record<string, number>): number {
  let score = 0;
  for (const [emoji, count] of Object.entries(counts)) {
    const w = WEIGHT_MAP[emoji] ?? 2;
    score += (MAX_WEIGHT - w) * count;
  }
  return score;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated radial stress gauge */
function StressGauge({ index, emoji, label }: { index: number; emoji: string; label: string }) {
  const radius = 80;
  const stroke = 12;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  // Only fill half the circle (180°) for a classic gauge look
  const halfCirc = circumference / 2;
  const offset = halfCirc - (index / 100) * halfCirc;

  // Color interpolation based on index
  const gaugeColor =
    index <= 20 ? "#10b981" :
    index <= 40 ? "#6ee7b7" :
    index <= 60 ? "#fbbf24" :
    index <= 80 ? "#f97316" :
                  "#ef4444";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: radius * 2, height: radius }}>
        <svg
          width={radius * 2}
          height={radius + stroke}
          viewBox={`0 0 ${radius * 2} ${radius + stroke}`}
          className="overflow-visible"
        >
          {/* Background track — half circle */}
          <path
            d={`M ${stroke / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - stroke / 2} ${radius}`}
            fill="none"
            stroke="#e4e4e7"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <path
            d={`M ${stroke / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - stroke / 2} ${radius}`}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${halfCirc} ${halfCirc}`}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s ease" }}
          />
        </svg>

        {/* Emoji in center */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 text-4xl"
          style={{ lineHeight: 1 }}
        >
          {emoji}
        </div>
      </div>

      {/* Numeric index */}
      <div
        className="text-5xl font-black tabular-nums transition-all duration-500"
        style={{ color: gaugeColor }}
      >
        {index}
        <span className="text-xl font-semibold text-zinc-400">/100</span>
      </div>

      <div className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
        {label}
      </div>

      {/* Scale labels */}
      <div className="flex gap-6 text-xs text-zinc-400 mt-1">
        <span className="text-emerald-500 font-medium">0 Calm</span>
        <span className="text-amber-500 font-medium">50 Moderate</span>
        <span className="text-red-500 font-medium">100 Critical</span>
      </div>
    </div>
  );
}

/** Single bar in the 30-day chart */
function DayBar({
  day,
  maxWellbeing,
  isSelected,
  isToday,
  onClick,
}: {
  day: DayData;
  maxWellbeing: number;
  isSelected: boolean;
  isToday: boolean;
  onClick: () => void;
}) {
  const barHeightPct =
    maxWellbeing > 0 ? (day.wellbeingScore / maxWellbeing) * 100 : 0;

  // Days with no data show a faint placeholder bar
  const hasData = day.totalEvents > 0;

  const barColor = hasData ? COLOR_MAP[day.dominantEmoji] : "#e4e4e7";

  return (
    <button
      onClick={onClick}
      title={`${day.label} — ${day.dominantEmoji} ${LABEL_MAP[day.dominantEmoji] ?? "No data"}\nStress: ${day.stressIndex}/100`}
      className={`
        flex flex-col items-center gap-1 flex-1 group transition-all duration-200
        ${isSelected ? "opacity-100" : "opacity-70 hover:opacity-100"}
      `}
    >
      {/* Bar container */}
      <div className="w-full flex flex-col justify-end h-32 relative">
        {/* Selected highlight ring */}
        {isSelected && hasData && (
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-md"
            style={{
              height: `${Math.max(barHeightPct, 6)}%`,
              outline: `2px solid ${barColor}`,
              outlineOffset: "2px",
            }}
          />
        )}

        <div
          className="w-full rounded-t-md transition-all duration-500"
          style={{
            height: hasData ? `${Math.max(barHeightPct, 6)}%` : "6%",
            backgroundColor: barColor,
            opacity: hasData ? 1 : 0.3,
          }}
        />
      </div>

      {/* Emoji below bar */}
      <span className="text-sm leading-none">
        {hasData ? day.dominantEmoji : "—"}
      </span>

      {/* Date label — show every 5 days to avoid crowding */}
      {/* We show label via title tooltip; optionally show short label below */}
      <span
        className={`text-[9px] leading-none font-medium transition-colors
          ${isToday ? "text-[#B21563]" : "text-zinc-400"}
          ${isSelected ? "font-bold" : ""}
        `}
      >
        {day.label.split(" ")[1]} {/* just the day number */}
      </span>
    </button>
  );
}

/** Breakdown of emoji counts for selected day */
function EmojiBreakdown({ day }: { day: DayData }) {
  const total = day.totalEvents;

  return (
    <div className="space-y-2">
      {MOOD_CONFIG.map(({ emoji, label, color }) => {
        const count = day.emojiCounts[emoji] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={emoji} className="flex items-center gap-2">
            <span className="text-base w-6 text-center">{emoji}</span>
            <span className="text-xs text-zinc-500 w-16 shrink-0">{label}</span>
            <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-xs text-zinc-500 w-8 text-right tabular-nums">
              {count}×
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const StressMeter = ({ uid }: StressMeterProps) => {
  const [days, setDays] = useState<DayData[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(toDateKey(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // ── Detect screen size ────────────────────────────────────────────────────
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ── Fetch & process mood history ──────────────────────────────────────────
  const fetchMoodData = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/mood?uid=${uid}`);
      if (!res.ok) throw new Error(`Failed to fetch mood data (${res.status})`);

      const data: { counts: Record<string, number>; history: HistoryEntry[] } =
        await res.json();

      const last30 = getLast30Days();

      // Group history entries by date key
      const grouped: Record<string, HistoryEntry[]> = {};
      for (const entry of data.history ?? []) {
        const dk = toDateKey(new Date(entry.timestamp));
        if (last30.includes(dk)) {
          grouped[dk] = grouped[dk] ?? [];
          grouped[dk].push(entry);
        }
      }

      // Build DayData for every day
      const dayList: DayData[] = last30.map((dk) => {
        const entries = grouped[dk] ?? [];

        // Count emojis for this day
        const emojiCounts: Record<string, number> = {};
        for (const e of entries) {
          emojiCounts[e.emoji] = (emojiCounts[e.emoji] ?? 0) + 1;
        }

        const dominant = entries.length > 0 ? findDominantEmoji(emojiCounts) : "😐";
        const stressIndex = calcStressIndex(emojiCounts);
        const wellbeing = calcWellbeingScore(emojiCounts);

        return {
          date: dk,
          label: toDayLabel(dk),
          dominantEmoji: dominant,
          stressWeight: WEIGHT_MAP[dominant] ?? 2,
          stressIndex,
          emojiCounts,
          totalEvents: entries.length,
          wellbeingScore: wellbeing,
        };
      });

      setDays(dayList);
      setLastFetched(new Date());
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchMoodData();
  }, [fetchMoodData]);

  // ── Derived values ────────────────────────────────────────────────────────
  const selectedDay = days.find((d) => d.date === selectedDateKey) ?? null;
  const todayKey = toDateKey(new Date());

  const maxWellbeing = Math.max(...days.map((d) => d.wellbeingScore), 1);

  // Visible timeframe
  const visibleDays = isMobile ? days.slice(-7) : days;
  const timeframeLabel = isMobile ? "Last 7 Days" : "Last 30 Days";

  // 7-day average stress
  const last7 = days.slice(-7).filter((d) => d.totalEvents > 0);
  const avg7StressIndex =
    last7.length > 0
      ? Math.round(last7.reduce((a, d) => a + d.stressIndex, 0) / last7.length)
      : 0;

  // Trend vs previous 7 days
  const prev7 = days.slice(-14, -7).filter((d) => d.totalEvents > 0);
  const avg7Prev =
    prev7.length > 0
      ? Math.round(prev7.reduce((a, d) => a + d.stressIndex, 0) / prev7.length)
      : null;

  const trendDiff = avg7Prev !== null ? avg7StressIndex - avg7Prev : null;

  // Stress level text for gauge
  function stressLevelLabel(index: number): string {
    if (index <= 20) return "Feeling Great";
    if (index <= 40) return "Doing Well";
    if (index <= 60) return "Moderate Stress";
    if (index <= 80) return "High Stress";
    return "Critical Stress";
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white dark:bg-[#121212] p-6 rounded-2xl shadow-sm border border-zinc-200/60 dark:border-zinc-800 min-h-[500px] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#B21563] border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Loading your stress data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-[#121212] p-6 rounded-2xl shadow-sm border border-zinc-200/60 dark:border-zinc-800 min-h-[200px] flex flex-col items-center justify-center gap-3">
        <p className="text-red-500 text-sm font-medium">⚠️ {error}</p>
        <button
          onClick={fetchMoodData}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-[#B21563] transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#B21563]" />
            Stress Detection
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {timeframeLabel} · Click any bar to inspect
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Last fetched */}
          {lastFetched && (
            <span className="text-xs text-zinc-400 hidden sm:block">
              Updated {lastFetched.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchMoodData}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 7-day avg */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">
            7-Day Avg Stress
          </p>
          <p
            className="text-3xl font-black tabular-nums"
            style={{
              color:
                avg7StressIndex <= 40 ? "#10b981" :
                avg7StressIndex <= 70 ? "#f97316" : "#ef4444",
            }}
          >
            {avg7StressIndex}
            <span className="text-base font-semibold text-zinc-400">/100</span>
          </p>
          {trendDiff !== null && (
            <div className="flex items-center gap-1 mt-1">
              {trendDiff < 0 ? (
                <TrendingDown className="w-3 h-3 text-emerald-500" />
              ) : trendDiff > 0 ? (
                <TrendingUp className="w-3 h-3 text-red-500" />
              ) : (
                <Minus className="w-3 h-3 text-zinc-400" />
              )}
              <span
                className={`text-xs font-medium ${
                  trendDiff < 0 ? "text-emerald-500" :
                  trendDiff > 0 ? "text-red-500" : "text-zinc-400"
                }`}
              >
                {trendDiff > 0 ? "+" : ""}{trendDiff} vs prev week
              </span>
            </div>
          )}
        </div>

        {/* Today */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">
            Today&apos;s Mood
          </p>
          {(() => {
            const today = days.find((d) => d.date === todayKey);
            return today && today.totalEvents > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-3xl">{today.dominantEmoji}</span>
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {LABEL_MAP[today.dominantEmoji]}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {today.totalEvents} event{today.totalEvents !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400 mt-2">No data yet today</p>
            );
          })()}
        </div>

        {/* Streak of good days */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">
            Good Days Streak
          </p>
          {(() => {
            // Count consecutive days from today backwards with stressIndex ≤ 40
            const reversed = [...days].reverse();
            let streak = 0;
            for (const d of reversed) {
              if (d.totalEvents === 0) break;
              if (d.stressIndex <= 40) streak++;
              else break;
            }
            return (
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-emerald-500">{streak}</span>
                <span className="text-sm text-zinc-500">day{streak !== 1 ? "s" : ""} in a row</span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── 30-Day Bar Chart ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#B21563]" />
            {timeframeLabel} Wellbeing Overview
          </h3>
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <Info className="w-3 h-3" />
            Taller bar = better day
          </div>
        </div>

        {/* Month label bands */}
        <div className="flex gap-0.5 mb-2 px-1">
          {visibleDays.map((day) => (
            <div
              key={day.date}
              className={`flex-1 text-center text-[8px] font-medium
                ${day.date === todayKey ? "text-[#B21563]" : "text-transparent"}
              `}
            >
              •
            </div>
          ))}
        </div>

        {/* Bars */}
        <div className="flex gap-1 md:gap-0.5 items-end w-full px-1">
          {visibleDays.map((day) => (
            <DayBar
              key={day.date}
              day={day}
              maxWellbeing={maxWellbeing}
              isSelected={day.date === selectedDateKey}
              isToday={day.date === todayKey}
              onClick={() => setSelectedDateKey(day.date)}
            />
          ))}
        </div>

        {/* X-axis labels */}
        <div className="flex mt-3 text-[10px] text-zinc-400">
          {isMobile ? (
             visibleDays.map((day) => (
               <div key={day.date} className="flex-1 text-center font-medium">
                 {day.label.split(" ")[0]}
               </div>
             ))
          ) : (
            [0, 7, 14, 21, 29].map((i) => (
              <div
                key={i}
                className="flex-1 text-left pl-0.5 border-l border-zinc-200 dark:border-zinc-700"
              >
                {days[i]?.label.split(" ")[0]}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Selected Day Detail ── */}
      {selectedDay && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Stress Gauge */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col items-center gap-4">
            <div className="w-full flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Stress Level
              </h3>
              <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                {selectedDay.date === todayKey ? "Today" : selectedDay.label}
              </span>
            </div>

            {selectedDay.totalEvents > 0 ? (
              <StressGauge
                index={selectedDay.stressIndex}
                emoji={selectedDay.dominantEmoji}
                label={stressLevelLabel(selectedDay.stressIndex)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
                <span className="text-4xl">📭</span>
                <p className="text-sm text-zinc-400">No mood data for this day</p>
                <p className="text-xs text-zinc-400">
                  Open the chatbot to log your mood
                </p>
              </div>
            )}
          </div>

          {/* Emoji Breakdown */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Mood Breakdown
              </h3>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>
                  {selectedDay.totalEvents} event{selectedDay.totalEvents !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {selectedDay.totalEvents > 0 ? (
              <>
                <EmojiBreakdown day={selectedDay} />

                {/* Sources note */}
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#B21563] inline-block" />
                    Manual check-ins
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-zinc-400 inline-block" />
                    AI detected
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <p className="text-sm text-zinc-400">No events recorded</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          Mood Scale
        </p>
        <div className="flex flex-wrap gap-3">
          {MOOD_CONFIG.map(({ emoji, label, color }) => (
            <div key={emoji} className="flex items-center gap-1.5">
              <span className="text-base">{emoji}</span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">{label}</span>
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: color }}
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default StressMeter;