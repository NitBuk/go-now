"use client";

import { Sparkles } from "lucide-react";
import { formatHour, formatDay, scoreBg, scoreText } from "@/lib/score-utils";
import type { ScoredHour, ActivityMode } from "@/lib/types";

interface BestWindowProps {
  hours: ScoredHour[];
  mode: ActivityMode;
}

export default function BestWindow({ hours, mode }: BestWindowProps) {
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

  if (bestStart === -1) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#D0D7DE]">
        <div className="text-[12px] font-medium text-[#656D76] uppercase tracking-wider mb-2">
          Next Best Window
        </div>
        <p className="text-[14px] text-[#656D76]">No good windows coming up. Tomorrow looks better.</p>
      </div>
    );
  }

  const startHour = futureHours[bestStart];
  const endHour = futureHours[bestEnd];
  const avgScore = Math.round(bestAvg);
  const label = avgScore >= 85 ? "Perfect" : avgScore >= 70 ? "Good" : "Meh";
  const windowLength = bestEnd - bestStart + 1;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#D0D7DE]">
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles size={14} className="text-[#656D76]" />
        <span className="text-[12px] font-medium text-[#656D76] uppercase tracking-wider">
          Next Best Window
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-full ${scoreBg(label)} flex items-center justify-center text-white text-sm font-semibold`}
        >
          {avgScore}
        </div>
        <div>
          <div className="text-[14px] font-medium text-[#1F2328]">
            {formatDay(startHour.hour_utc)} &middot; {formatHour(startHour.hour_utc)}&ndash;{formatHour(endHour.hour_utc)}
          </div>
          <div className="text-[12px] text-[#656D76]">
            {windowLength}h window &middot; avg {avgScore} <span className={`font-medium ${scoreText(label)}`}>{label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
