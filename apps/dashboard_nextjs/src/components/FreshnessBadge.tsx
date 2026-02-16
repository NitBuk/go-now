"use client";

import { Clock } from "lucide-react";
import { freshnessLabel, freshnessState } from "@/lib/score-utils";

interface FreshnessBadgeProps {
  freshness: string;
  ageMinutes: number;
}

const STATE_COLORS = {
  fresh: "text-[#656D76]",
  stale: "text-[#D29922]",
  "very-stale": "text-[#F85149]",
} as const;

const DOT_COLORS = {
  fresh: "bg-[#2DA44E]",
  stale: "bg-[#D29922]",
  "very-stale": "bg-[#F85149]",
} as const;

export default function FreshnessBadge({ ageMinutes }: FreshnessBadgeProps) {
  const state = freshnessState(ageMinutes);

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${STATE_COLORS[state]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[state]}`} />
      <Clock size={12} />
      <span>{freshnessLabel(ageMinutes)}</span>
    </span>
  );
}
