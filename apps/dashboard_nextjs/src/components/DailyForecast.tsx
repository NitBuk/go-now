"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown } from "lucide-react";
import { scoreHex, formatDay, formatHour } from "@/lib/score-utils";
import { METRICS, getValue, formatValue, type MetricKey } from "@/lib/metrics";
import DayDetailSheet from "./DayDetailSheet";
import type { ScoredHour, ActivityMode } from "@/lib/types";

interface DailyForecastProps {
  hours: ScoredHour[];
  mode: ActivityMode;
}

function scoreToLabel(score: number): string {
  if (score >= 85) return "Perfect";
  if (score >= 70) return "Good";
  if (score >= 45) return "Meh";
  if (score >= 20) return "Bad";
  return "Nope";
}

interface DayGroup {
  day: string;
  hours: ScoredHour[];
  minVal: number;
  maxVal: number;
  bestScore: number;
  bestLabel: string;
}

function groupByDay(hours: ScoredHour[], mode: ActivityMode, metric: MetricKey): DayGroup[] {
  const groups = new Map<string, ScoredHour[]>();
  for (const hour of hours) {
    const day = formatDay(hour.hour_utc);
    const existing = groups.get(day) || [];
    existing.push(hour);
    groups.set(day, existing);
  }

  return Array.from(groups.entries()).map(([day, dayHours]) => {
    const vals = dayHours
      .map((h) => getValue(h, metric, mode))
      .filter((v): v is number => v !== null);
    const minVal = vals.length > 0 ? Math.min(...vals) : 0;
    const maxVal = vals.length > 0 ? Math.max(...vals) : 0;

    const scores = dayHours.map((h) => h.scores[mode].score);
    const bestScore = Math.max(...scores);

    return {
      day,
      hours: dayHours,
      minVal,
      maxVal,
      bestScore,
      bestLabel: scoreToLabel(bestScore),
    };
  });
}

function RangeBar({
  min,
  max,
  globalMin,
  globalMax,
  color,
  index,
}: {
  min: number;
  max: number;
  globalMin: number;
  globalMax: number;
  color: string;
  index: number;
}) {
  const range = globalMax - globalMin || 1;
  const left = ((min - globalMin) / range) * 100;
  const right = ((max - globalMin) / range) * 100;

  return (
    <div className="relative h-[4px] w-full bg-white/[0.06] rounded-full overflow-hidden">
      <motion.div
        className="absolute top-0 h-full rounded-full"
        initial={{ width: 0 }}
        animate={{
          width: `${Math.max(right - left, 5)}%`,
          left: `${left}%`,
        }}
        transition={{ delay: 0.3 + index * 0.05, duration: 0.5, ease: "easeOut" as const }}
        style={{
          background: color,
          boxShadow: `0 0 8px ${color}40`,
        }}
      />
    </div>
  );
}

function ScoreRangeBar({ min, max, index }: { min: number; max: number; index: number }) {
  const fromColor = scoreHex(scoreToLabel(min));
  const toColor = scoreHex(scoreToLabel(max));

  return (
    <RangeBar
      min={min}
      max={max}
      globalMin={0}
      globalMax={100}
      color={`linear-gradient(to right, ${fromColor}, ${toColor})`}
      index={index}
    />
  );
}

const rowVariants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export default function DailyForecast({ hours, mode }: DailyForecastProps) {
  const [metric, setMetric] = useState<MetricKey>("score");
  const [selectedDay, setSelectedDay] = useState<DayGroup | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const dayGroups = groupByDay(hours, mode, metric);
  const metricDef = METRICS.find((m) => m.key === metric)!;
  const isScore = metric === "score";

  const globalRange = useMemo(() => {
    if (isScore) return { min: 0, max: 100 };
    const allVals = hours
      .map((h) => getValue(h, metric, mode))
      .filter((v): v is number => v !== null);
    return {
      min: allVals.length > 0 ? Math.min(...allVals) : 0,
      max: allVals.length > 0 ? Math.max(...allVals) : 100,
    };
  }, [hours, metric, mode, isScore]);

  const Icon = metricDef.icon;

  return (
    <>
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            7-Day Forecast
          </span>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-colors cursor-pointer"
              aria-label={`Showing ${metricDef.label}. Click to change metric.`}
              aria-expanded={menuOpen}
              aria-haspopup="listbox"
            >
              <Icon size={12} style={{ color: metricDef.color }} />
              <span className="text-[11px] font-medium text-slate-300">{metricDef.label}</span>
              <ChevronDown
                size={10}
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
                  className="absolute right-0 top-full mt-1.5 z-50 min-w-[148px] py-1 rounded-xl bg-[#1A2234] border border-white/[0.1] shadow-xl shadow-black/40 backdrop-blur-xl overflow-hidden"
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
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer transition-colors ${
                          active ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"
                        }`}
                      >
                        <MIcon size={13} style={{ color: m.color }} />
                        <span className={`text-[12px] font-medium ${active ? "text-white" : "text-slate-300"}`}>
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {dayGroups.map((group, index) => (
            <motion.button
              key={group.day}
              onClick={() => setSelectedDay(group)}
              variants={rowVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-20px" }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <span className="text-[13px] font-medium text-slate-300 w-[72px] shrink-0 whitespace-nowrap">
                {group.day}
              </span>

              <span
                className="text-[12px] w-8 text-right tabular-nums shrink-0"
                style={{ color: isScore ? scoreHex(scoreToLabel(group.minVal)) : metricDef.color }}
              >
                {formatValue(group.minVal, metric)}
              </span>

              <div className="flex-1 px-1">
                {isScore ? (
                  <ScoreRangeBar min={group.minVal} max={group.maxVal} index={index} />
                ) : (
                  <RangeBar
                    min={group.minVal}
                    max={group.maxVal}
                    globalMin={globalRange.min}
                    globalMax={globalRange.max}
                    color={metricDef.color}
                    index={index}
                  />
                )}
              </div>

              <span
                className="text-[12px] font-semibold w-8 tabular-nums shrink-0"
                style={{ color: isScore ? scoreHex(group.bestLabel) : metricDef.color }}
              >
                {formatValue(group.maxVal, metric)}
              </span>

              <motion.span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                style={{
                  color: scoreHex(group.bestLabel),
                  backgroundColor: `${scoreHex(group.bestLabel)}15`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 20 }}
              >
                {group.bestLabel}
              </motion.span>

              <ChevronRight size={12} className="text-slate-500 shrink-0" />
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedDay && (
          <DayDetailSheet
            key={selectedDay.day}
            hours={selectedDay.hours}
            mode={mode}
            initialMetric={metric}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
