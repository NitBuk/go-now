"use client";

import ScoreCard from "./ScoreCard";
import ReasonChip from "./ReasonChip";
import { VIBE_LINES, type ScoredHour, type ActivityMode } from "@/lib/types";

interface NowCardProps {
  hour: ScoredHour;
  mode: ActivityMode;
}

function getVibeLine(label: string): string {
  const lines = VIBE_LINES[label] ?? VIBE_LINES["Meh"];
  return lines[Math.floor(Math.random() * lines.length)];
}

export default function NowCard({ hour, mode }: NowCardProps) {
  const modeScore = hour.scores[mode];

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#D0D7DE]">
      <div className="text-[12px] font-medium text-[#656D76] uppercase tracking-wider mb-1">
        Right Now
      </div>
      <p className="text-[14px] text-[#656D76] mb-4 italic">
        {getVibeLine(modeScore.label)}
      </p>
      <div className="flex items-start gap-4">
        <ScoreCard modeScore={modeScore} size="lg" />
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {modeScore.reasons.map((chip, i) => (
              <ReasonChip key={i} chip={chip} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
