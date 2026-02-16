"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Thermometer, Waves, Wind, Sun, CloudRain, Activity } from "lucide-react";
import { scoreHex, scoreGradient, scoreGlow, formatHour } from "@/lib/score-utils";
import type { ScoredHour, ActivityMode } from "@/lib/types";

interface DayDetailSheetProps {
  day: string;
  hours: ScoredHour[];
  mode: ActivityMode;
  onClose: () => void;
}

type MetricKey = "score" | "temp" | "uv" | "wind" | "waves" | "rain" | "aqi";

const METRICS: { key: MetricKey; label: string; icon: typeof Thermometer; unit: string; color: string }[] = [
  { key: "score", label: "Score", icon: Activity, unit: "", color: "#60A5FA" },
  { key: "temp", label: "Temp", icon: Thermometer, unit: "°", color: "#FB923C" },
  { key: "uv", label: "UV", icon: Sun, unit: "", color: "#FBBF24" },
  { key: "wind", label: "Wind", icon: Wind, unit: "m/s", color: "#34D399" },
  { key: "waves", label: "Waves", icon: Waves, unit: "m", color: "#60A5FA" },
  { key: "rain", label: "Rain", icon: CloudRain, unit: "%", color: "#A78BFA" },
  { key: "aqi", label: "AQI", icon: Activity, unit: "", color: "#F87171" },
];

function getValue(hour: ScoredHour, metric: MetricKey, mode: ActivityMode): number | null {
  switch (metric) {
    case "score": return hour.scores[mode].score;
    case "temp": return hour.feelslike_c;
    case "uv": return hour.uv_index;
    case "wind": return hour.wind_ms;
    case "waves": return hour.wave_height_m;
    case "rain": return hour.precip_prob_pct;
    case "aqi": return hour.eu_aqi;
  }
}

function scoreToLabel(score: number): string {
  if (score >= 85) return "Perfect";
  if (score >= 70) return "Good";
  if (score >= 45) return "Meh";
  if (score >= 20) return "Bad";
  return "Nope";
}

function Graph({ hours, metric, mode }: { hours: ScoredHour[]; metric: MetricKey; mode: ActivityMode }) {
  const metricDef = METRICS.find((m) => m.key === metric)!;
  const values = hours.map((h) => getValue(h, metric, mode));
  const numericValues = values.filter((v): v is number => v !== null);

  if (numericValues.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">
        No data available
      </div>
    );
  }

  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const range = max - min || 1;
  const padTop = 20;
  const padBot = 30;
  const padLeft = 2;
  const padRight = 2;
  const w = 400;
  const h = 180;
  const graphH = h - padTop - padBot;
  const graphW = w - padLeft - padRight;

  // Build path
  const points: { x: number; y: number; val: number | null; hour: ScoredHour }[] = hours.map((hr, i) => {
    const val = values[i];
    const x = padLeft + (i / (hours.length - 1)) * graphW;
    const y = val !== null
      ? padTop + graphH - ((val - min) / range) * graphH
      : padTop + graphH;
    return { x, y, val, hour: hr };
  });

  const validPoints = points.filter((p) => p.val !== null);
  const pathD = validPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  // Filled area
  const areaD = validPoints.length > 0
    ? `${pathD} L ${validPoints[validPoints.length - 1].x.toFixed(1)} ${h - padBot} L ${validPoints[0].x.toFixed(1)} ${h - padBot} Z`
    : "";

  // X-axis labels (every 3rd hour)
  const xLabels = hours
    .map((hr, i) => ({ label: formatHour(hr.hour_utc), x: points[i].x }))
    .filter((_, i) => i % 3 === 0);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[180px]">
      <defs>
        <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={metricDef.color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={metricDef.color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = padTop + graphH * (1 - pct);
        const val = (min + range * pct).toFixed(metric === "waves" ? 1 : 0);
        return (
          <g key={pct}>
            <line x1={padLeft} y1={y} x2={w - padRight} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <text x={w - padRight - 2} y={y - 3} textAnchor="end" fill="#475569" fontSize="8" fontFamily="monospace">
              {val}{metricDef.unit}
            </text>
          </g>
        );
      })}

      {/* Filled area */}
      {areaD && <path d={areaD} fill={`url(#fill-${metric})`} />}

      {/* Line */}
      <path d={pathD} fill="none" stroke={metricDef.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Score dots - colored by score label for the score metric */}
      {validPoints.map((p, i) => {
        const dotColor = metric === "score" ? scoreHex(scoreToLabel(p.val!)) : metricDef.color;
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i % 3 === 0 ? 3 : 1.5}
            fill={dotColor}
            opacity={i % 3 === 0 ? 1 : 0.5}
          />
        );
      })}

      {/* X axis labels */}
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={h - 8} textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">
          {l.label}
        </text>
      ))}
    </svg>
  );
}

export default function DayDetailSheet({ day, hours, mode, onClose }: DayDetailSheetProps) {
  const [metric, setMetric] = useState<MetricKey>("score");
  const scores = hours.map((h) => h.scores[mode].score);
  const bestScore = Math.max(...scores);
  const bestLabel = scoreToLabel(bestScore);
  const bestHour = hours.find((h) => h.scores[mode].score === bestScore);

  return (
    <motion.div
      className="fixed inset-0 z-[100]"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto bg-[#0F1724] border-t border-white/[0.08] rounded-t-3xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
      >
        {/* Drag handle */}
        <div className="sticky top-0 z-10 bg-[#0F1724] pt-3 pb-2 flex justify-center rounded-t-3xl">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[18px] font-semibold text-white">{day}</h2>
              {bestHour && (
                <span className="text-[12px] text-slate-400">
                  Best: <span style={{ color: scoreHex(bestLabel) }} className="font-medium">{bestScore}</span> at {formatHour(bestHour.hour_utc)}
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          {/* Metric pills */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
            {METRICS.map((m) => {
              const Icon = m.icon;
              const isActive = metric === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? "bg-white/[0.12] text-white"
                      : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]"
                  }`}
                >
                  <Icon size={12} />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Graph */}
          <div className="glass-card rounded-2xl p-3 mb-4">
            <Graph hours={hours} metric={metric} mode={mode} />
          </div>

          {/* Hourly score strip */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-white/[0.06]">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                Hourly Scores
              </span>
            </div>
            <div className="flex overflow-x-auto scrollbar-hide py-3 px-1">
              {hours.map((hour, i) => {
                const ms = hour.scores[mode];
                return (
                  <div
                    key={hour.hour_utc}
                    className={`flex flex-col items-center gap-1.5 px-2.5 min-w-[52px] ${
                      i < hours.length - 1 ? "border-r border-white/[0.04]" : ""
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatHour(hour.hour_utc)}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${scoreGradient(ms.label)} flex items-center justify-center text-white text-[10px] font-semibold`}
                    >
                      {ms.score}
                    </div>
                    <span className="text-[9px] font-medium" style={{ color: scoreHex(ms.label) }}>
                      {ms.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
