"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, Sunrise, Sunset } from "lucide-react";
import { scoreHex, scoreGradient, scoreGlow, formatHour, formatDayLong } from "@/lib/score-utils";
import { getSunTimes, getSunEvent, type SunTimes } from "@/lib/sun";
import { METRICS, getValue, formatValue, type MetricKey } from "@/lib/metrics";
import type { ScoredHour, ActivityMode } from "@/lib/types";

function scoreToLabel(score: number): string {
  if (score >= 85) return "Perfect";
  if (score >= 70) return "Good";
  if (score >= 45) return "Meh";
  if (score >= 20) return "Bad";
  return "Nope";
}

interface GraphProps {
  hours: ScoredHour[];
  metric: MetricKey;
  mode: ActivityMode;
  highlightIndex: number | null;
  sunTimes: SunTimes;
}

function Graph({ hours, metric, mode, highlightIndex, sunTimes }: GraphProps) {
  const metricDef = METRICS.find((m) => m.key === metric)!;
  const values = hours.map((h) => getValue(h, metric, mode));
  const numericValues = values.filter((v): v is number => v !== null);

  if (numericValues.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
        No data available
      </div>
    );
  }

  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const range = max - min || 1;
  const padTop = 24;
  const padBot = 40;
  const padLeft = 4;
  const padRight = 40;
  const w = 400;
  const h = 200;
  const graphH = h - padTop - padBot;
  const graphW = w - padLeft - padRight;

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

  const areaD = validPoints.length > 0
    ? `${pathD} L ${validPoints[validPoints.length - 1].x.toFixed(1)} ${h - padBot} L ${validPoints[0].x.toFixed(1)} ${h - padBot} Z`
    : "";

  const xLabels = hours
    .map((hr, i) => ({ label: formatHour(hr.hour_utc), x: points[i].x }))
    .filter((_, i) => i % 3 === 0);

  return (
    <svg viewBox={`0 -12 ${w} ${h + 12}`} className="w-full h-[212px]">
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
            <text x={w - padRight + 4} y={y + 4} textAnchor="start" fill="#64748B" fontSize="11" fontFamily="system-ui, sans-serif">
              {val}{metricDef.unit}
            </text>
          </g>
        );
      })}

      {/* Filled area */}
      {areaD && <path d={areaD} fill={`url(#fill-${metric})`} />}

      {/* Sunrise / Sunset vertical markers with icons above */}
      {[
        { time: sunTimes.sunrise, label: sunTimes.sunriseLabel, color: "#FBBF24", isSunrise: true },
        { time: sunTimes.sunset, label: sunTimes.sunsetLabel, color: "#FB923C", isSunrise: false },
      ].map((sun) => {
        const sunMs = sun.time.getTime();
        const firstMs = new Date(hours[0].hour_utc).getTime();
        const lastMs = new Date(hours[hours.length - 1].hour_utc).getTime();
        const totalRange = lastMs - firstMs;
        if (totalRange <= 0 || sunMs < firstMs || sunMs > lastMs) return null;
        const xPos = padLeft + ((sunMs - firstMs) / totalRange) * graphW;
        return (
          <g key={sun.label} opacity="0.8">
            <line x1={xPos} y1={padTop} x2={xPos} y2={h - padBot} stroke={sun.color} strokeWidth="1" opacity="0.35" strokeDasharray="4 3" />
            {/* Sun icon above the graph */}
            <g transform={`translate(${xPos - 6}, -6)`} fill="none" stroke={sun.color} strokeWidth="1.5" strokeLinecap="round">
              <path d={sun.isSunrise ? "M1 10 A5 5 0 0 1 11 10" : "M1 6 A5 5 0 0 0 11 6"} />
              <line x1="0" y1={sun.isSunrise ? 10 : 6} x2="12" y2={sun.isSunrise ? 10 : 6} />
              <line x1="6" y1={sun.isSunrise ? 2 : 0} x2="6" y2={sun.isSunrise ? 0 : 2} />
              <line x1="2.5" y1={sun.isSunrise ? 4 : 2} x2="1.5" y2={sun.isSunrise ? 2.5 : 0.5} />
              <line x1="9.5" y1={sun.isSunrise ? 4 : 2} x2="10.5" y2={sun.isSunrise ? 2.5 : 0.5} />
            </g>
            {/* Time label between icon and graph */}
            <text x={xPos} y={padTop - 6} textAnchor="middle" fill={sun.color} fontSize="11" fontWeight="500" fontFamily="system-ui, sans-serif">
              {sun.label}
            </text>
          </g>
        );
      })}

      {/* Line */}
      <path d={pathD} fill="none" stroke={metricDef.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {validPoints.map((p, i) => {
        const isHighlighted = highlightIndex !== null && hours.indexOf(p.hour) === highlightIndex;
        const dotColor = metric === "score" ? scoreHex(scoreToLabel(p.val!)) : metricDef.color;
        return (
          <g key={i}>
            {isHighlighted && (
              <>
                <circle cx={p.x} cy={p.y} r={10} fill={dotColor} opacity={0.2}>
                  <animate attributeName="r" values="6;12;6" dur="1s" repeatCount="3" />
                  <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1s" repeatCount="3" />
                </circle>
                <line x1={p.x} y1={padTop} x2={p.x} y2={h - padBot} stroke={dotColor} strokeWidth="1" opacity="0.3" strokeDasharray="3 3" />
                <text x={p.x} y={padTop - 6} textAnchor="middle" fill={dotColor} fontSize="11" fontWeight="600" fontFamily="system-ui, sans-serif">
                  {metric === "waves" ? p.val!.toFixed(1) : Math.round(p.val!)}{metricDef.unit}
                </text>
              </>
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={isHighlighted ? 5 : (i % 3 === 0 ? 3 : 1.5)}
              fill={dotColor}
              opacity={isHighlighted ? 1 : (i % 3 === 0 ? 1 : 0.5)}
            />
          </g>
        );
      })}

      {/* X axis labels */}
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={h - 12} textAnchor="middle" fill="#64748B" fontSize="11" fontFamily="system-ui, sans-serif">
          {l.label}
        </text>
      ))}
    </svg>
  );
}

function SunStripMarker({ type, label }: { type: "sunrise" | "sunset"; label: string }) {
  const Icon = type === "sunrise" ? Sunrise : Sunset;
  const color = type === "sunrise" ? "text-amber-400" : "text-orange-400";
  return (
    <div className="flex flex-col items-center gap-1 px-1 min-w-[40px]">
      <Icon size={12} className={color} />
      <div className={`w-[1px] h-8 ${type === "sunrise" ? "bg-amber-400/30" : "bg-orange-400/30"}`} />
      <span className={`text-[8px] font-medium ${color}`}>{label}</span>
    </div>
  );
}

interface DayDetailSheetProps {
  hours: ScoredHour[];
  mode: ActivityMode;
  initialMetric?: MetricKey;
  onClose: () => void;
}

export default function DayDetailSheet({ hours, mode, initialMetric = "score", onClose }: DayDetailSheetProps) {
  const [metric, setMetric] = useState<MetricKey>(initialMetric);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);
  const scores = hours.map((h) => h.scores[mode].score);
  const bestScore = Math.max(...scores);
  const bestLabel = scoreToLabel(bestScore);
  const bestHour = hours.find((h) => h.scores[mode].score === bestScore);
  const metricDef = METRICS.find((m) => m.key === metric)!;

  const sunTimes = useMemo(() => getSunTimes(new Date(hours[0].hour_utc)), [hours]);

  const sunEventsMap = useMemo(() => {
    const map = new Map<string, { type: "sunrise" | "sunset"; label: string }>();
    for (const hour of hours) {
      const event = getSunEvent(hour.hour_utc, sunTimes);
      if (event) map.set(hour.hour_utc, event);
    }
    return map;
  }, [hours, sunTimes]);

  const handleHourClick = useCallback((index: number) => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    setHighlightIndex(index);
    highlightTimer.current = setTimeout(() => setHighlightIndex(null), 3000);
  }, []);

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
              <h2 className="text-[18px] font-semibold text-white">{formatDayLong(hours[0].hour_utc)}</h2>
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

          {/* Metric dropdown */}
          <div className="relative mb-4" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-full flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-2.5 text-left cursor-pointer hover:bg-white/[0.08] transition-colors"
              aria-label={`Showing ${metricDef.label}. Click to change metric.`}
              aria-expanded={menuOpen}
              aria-haspopup="listbox"
            >
              <metricDef.icon size={14} style={{ color: metricDef.color }} />
              <span className="text-[14px] font-medium text-slate-200 flex-1">{metricDef.label}</span>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  role="listbox"
                  aria-label="Select metric"
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-full mt-1.5 z-50 py-1 rounded-xl bg-[#1A2234] border border-white/[0.1] shadow-xl shadow-black/40 backdrop-blur-xl overflow-hidden"
                >
                  {METRICS.map((m) => {
                    const MIcon = m.icon;
                    const active = m.key === metric;
                    return (
                      <button
                        key={m.key}
                        role="option"
                        aria-selected={active}
                        onClick={() => { setMetric(m.key); setMenuOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left cursor-pointer transition-colors ${
                          active ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"
                        }`}
                      >
                        <MIcon size={14} style={{ color: m.color }} />
                        <span className={`text-[13px] font-medium ${active ? "text-white" : "text-slate-300"}`}>
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Graph */}
          <div className="glass-card rounded-2xl p-3 mb-4">
            <Graph hours={hours} metric={metric} mode={mode} highlightIndex={highlightIndex} sunTimes={sunTimes} />
          </div>

          {/* Hourly strip — updates based on selected metric */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-white/[0.06]">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                Hourly {metricDef.label}
              </span>
            </div>
            <div className="flex overflow-x-auto scrollbar-hide py-3 px-1 items-center">
              {hours.map((hour, i) => {
                const val = getValue(hour, metric, mode);
                const ms = hour.scores[mode];
                const isHighlighted = highlightIndex === i;
                const displayLabel = metric === "score" ? scoreToLabel(ms.score) : null;
                const sunEvent = sunEventsMap.get(hour.hour_utc);
                return (
                  <div key={hour.hour_utc} className="flex items-center">
                    <button
                    onClick={() => handleHourClick(i)}
                    className={`flex flex-col items-center gap-1.5 px-2.5 min-w-[52px] cursor-pointer transition-all ${
                      i < hours.length - 1 ? "border-r border-white/[0.04]" : ""
                    } ${isHighlighted ? "bg-white/[0.06] rounded-lg" : ""}`}
                  >
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatHour(hour.hour_utc)}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold ${
                        metric === "score"
                          ? `bg-gradient-to-br ${scoreGradient(ms.label)}`
                          : ""
                      } ${isHighlighted ? "score-glow" : ""}`}
                      style={{
                        ...(metric !== "score" ? { backgroundColor: `${metricDef.color}30`, color: metricDef.color } : {}),
                        ...(isHighlighted ? { "--glow-color": scoreGlow(ms.label) } as React.CSSProperties : {}),
                      }}
                    >
                      {formatValue(val, metric)}
                    </div>
                    {displayLabel ? (
                      <span className="text-[9px] font-medium" style={{ color: scoreHex(displayLabel) }}>
                        {displayLabel}
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium text-slate-500">
                        {val != null ? formatValue(val, metric) : "--"}
                      </span>
                    )}
                    </button>
                    {sunEvent && (
                      <SunStripMarker type={sunEvent.type} label={sunEvent.label} />
                    )}
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
