"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { formatHour, formatDay, scoreGradient, scoreText, scoreHex, scoreGlow } from "@/lib/score-utils";
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
    <motion.div
      className="glass-card rounded-2xl p-5"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles size={14} className="text-slate-400" />
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
          Next Best Window
        </span>
      </div>

      <AnimatePresence mode="wait">
        {window ? (
          <motion.div
            key={`${mode}-found`}
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className={`w-12 h-12 rounded-full bg-gradient-to-br ${scoreGradient(window.label)} flex items-center justify-center text-white text-sm font-semibold score-glow`}
              style={{ "--glow-color": scoreGlow(window.label) } as React.CSSProperties}
            >
              {window.avgScore}
            </div>
            <div>
              <div className="text-[14px] font-medium text-slate-200">
                {formatDay(window.startHour.hour_utc)} &middot; {formatHour(window.startHour.hour_utc)}&ndash;{formatHour(window.endHour.hour_utc)}
              </div>
              <div className="text-[12px] text-slate-400">
                {window.windowLength}h window &middot; avg {window.avgScore}{" "}
                <span className={`font-medium ${scoreText(window.label)}`}>{window.label}</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.p
            key={`${mode}-empty`}
            className="text-[14px] text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            No good windows coming up. Tomorrow looks better.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
