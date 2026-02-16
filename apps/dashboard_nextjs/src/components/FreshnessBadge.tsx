"use client";

import { Clock } from "lucide-react";
import { freshnessLabel, freshnessState } from "@/lib/score-utils";

interface FreshnessBadgeProps {
  freshness: string;
  ageMinutes: number;
}

const STATE_COLORS = {
  fresh: "text-slate-400",
  stale: "text-amber-400",
  "very-stale": "text-red-400",
} as const;

const DOT_COLORS = {
  fresh: "bg-emerald-400",
  stale: "bg-amber-400",
  "very-stale": "bg-red-400",
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
