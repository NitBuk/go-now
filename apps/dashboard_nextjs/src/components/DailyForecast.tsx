"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { scoreHex, formatDay, formatHour } from "@/lib/score-utils";
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
  minScore: number;
  maxScore: number;
  bestScore: number;
  bestTime: string;
  bestLabel: string;
}

function groupByDay(hours: ScoredHour[], mode: ActivityMode): DayGroup[] {
  const groups = new Map<string, ScoredHour[]>();
  for (const hour of hours) {
    const day = formatDay(hour.hour_utc);
    const existing = groups.get(day) || [];
    existing.push(hour);
    groups.set(day, existing);
  }

  return Array.from(groups.entries()).map(([day, dayHours]) => {
    const scores = dayHours.map((h) => h.scores[mode].score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const bestHour = dayHours.find((h) => h.scores[mode].score === maxScore);
    const bestTime = bestHour ? formatHour(bestHour.hour_utc) : "";
    return {
      day,
      hours: dayHours,
      minScore,
      maxScore,
      bestScore: maxScore,
      bestTime,
      bestLabel: scoreToLabel(maxScore),
    };
  });
}

function scoreToPercent(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function RangeBar({ min, max, index }: { min: number; max: number; index: number }) {
  const left = scoreToPercent(min);
  const right = scoreToPercent(max);
  const minLabel = scoreToLabel(min);
  const maxLabel = scoreToLabel(max);

  const fromColor = scoreHex(minLabel);
  const toColor = scoreHex(maxLabel);

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
          background: `linear-gradient(to right, ${fromColor}, ${toColor})`,
          boxShadow: `0 0 8px ${toColor}40`,
        }}
      />
    </div>
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
  const dayGroups = groupByDay(hours, mode);
  const [selectedDay, setSelectedDay] = useState<DayGroup | null>(null);

  return (
    <>
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-white/[0.06]">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            7-Day Forecast
          </span>
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
                className="text-[12px] w-5 text-right tabular-nums shrink-0"
                style={{ color: scoreHex(scoreToLabel(group.minScore)) }}
              >
                {group.minScore}
              </span>

              <div className="flex-1 px-1">
                <RangeBar min={group.minScore} max={group.maxScore} index={index} />
              </div>

              <span
                className="text-[12px] font-semibold w-5 tabular-nums shrink-0"
                style={{ color: scoreHex(group.bestLabel) }}
              >
                {group.maxScore}
              </span>

              {/* Score pill with spring entrance */}
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
            onClose={() => setSelectedDay(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
