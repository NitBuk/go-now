"use client";

import { scoreGradient, scoreText, scoreGlow } from "@/lib/score-utils";
import type { ModeScore } from "@/lib/types";

interface ScoreCardProps {
  modeScore: ModeScore;
  size?: "sm" | "lg";
}

export default function ScoreCard({ modeScore, size = "sm" }: ScoreCardProps) {
  const { score, label } = modeScore;

  if (size === "lg") {
    return (
      <div className="flex flex-col items-center gap-1">
        <div
          className={`w-[72px] h-[72px] bg-gradient-to-br ${scoreGradient(label)} rounded-full flex items-center justify-center text-white font-bold text-[32px] leading-none score-glow`}
          style={{ "--glow-color": scoreGlow(label) } as React.CSSProperties}
        >
          {score}
        </div>
        <span className={`text-sm font-medium ${scoreText(label)}`}>{label}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={`w-10 h-10 bg-gradient-to-br ${scoreGradient(label)} rounded-full flex items-center justify-center text-white text-sm font-semibold`}
      >
        {score}
      </div>
      <span className={`text-[11px] font-medium ${scoreText(label)}`}>{label}</span>
    </div>
  );
}
