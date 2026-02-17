"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { formatHour, formatDay, scoreText, scoreHex, scoreGlow } from "@/lib/score-utils";
import type { ScoredHour, ActivityMode } from "@/lib/types";

interface BestWindowProps {
  hours: ScoredHour[];
  mode: ActivityMode;
}

interface WindowResult {
  startHour: ScoredHour;
  endHour: ScoredHour;
  avgScore: number;
  label: string;
  windowLength: number;
}

function findBestWindow(hours: ScoredHour[], mode: ActivityMode): WindowResult | null {
  const now = new Date();
  const futureHours = hours.filter((h) => new Date(h.hour_utc) > now);

  let bestStart = -1;
  let bestEnd = -1;
  let bestAvg = 0;

  let curStart = -1;
  for (let i = 0; i <= futureHours.length; i++) {
    const score = i < futureHours.length ? futureHours[i].scores[mode].score : 0;
    if (score >= 70) {
      if (curStart === -1) curStart = i;
    } else {
      if (curStart !== -1) {
        const windowScores = futureHours
          .slice(curStart, i)
          .map((h) => h.scores[mode].score);
        const avg = windowScores.reduce((a, b) => a + b, 0) / windowScores.length;
        if (avg > bestAvg) {
          bestStart = curStart;
          bestEnd = i - 1;
          bestAvg = avg;
        }
        curStart = -1;
      }
    }
  }

  if (bestStart === -1) return null;

  const avgScore = Math.round(bestAvg);
  return {
    startHour: futureHours[bestStart],
    endHour: futureHours[bestEnd],
    avgScore,
    label: avgScore >= 85 ? "Perfect" : avgScore >= 70 ? "Good" : "Meh",
    windowLength: bestEnd - bestStart + 1,
  };
}

export default function BestWindow({ hours, mode }: BestWindowProps) {
  const window = findBestWindow(hours, mode);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
          Next Best Window
        </span>
      </div>

      <AnimatePresence mode="wait">
        {window ? (
          <motion.div
            key={`${mode}-found`}
            className="px-4 py-3 flex items-center gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Sparkles size={14} style={{ color: scoreHex(window.label) }} className="shrink-0 sparkle-anim" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-slate-200 truncate">
                  {formatDay(window.startHour.hour_utc)} {formatHour(window.startHour.hour_utc)}&ndash;{formatHour(window.endHour.hour_utc)}
                </span>
                <span
                  className="text-[12px] font-semibold tabular-nums shrink-0"
                  style={{ color: scoreHex(window.label) }}
                >
                  {window.avgScore}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                {window.windowLength}h &middot;{" "}
                <span className={`font-medium ${scoreText(window.label)}`}>{window.label}</span>
              </span>
            </div>
            <div
              className="w-2 h-2 rounded-full shrink-0 score-glow"
              style={{
                backgroundColor: scoreHex(window.label),
                "--glow-color": scoreGlow(window.label),
              } as React.CSSProperties}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`${mode}-empty`}
            className="px-4 py-3 flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sparkles size={14} className="text-slate-500 shrink-0" />
            <span className="text-[13px] text-slate-500">
              No good windows ahead. Tomorrow looks better.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
