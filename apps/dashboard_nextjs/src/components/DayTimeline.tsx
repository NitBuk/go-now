"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatDay, scoreText } from "@/lib/score-utils";
import HourRow from "./HourRow";
import type { ScoredHour, ActivityMode } from "@/lib/types";

interface DayTimelineProps {
  hours: ScoredHour[];
  mode: ActivityMode;
}

function groupByDay(hours: ScoredHour[]): Map<string, ScoredHour[]> {
  const groups = new Map<string, ScoredHour[]>();
  for (const hour of hours) {
    const day = formatDay(hour.hour_utc);
    const existing = groups.get(day) || [];
    existing.push(hour);
    groups.set(day, existing);
  }
  return groups;
}

function isCurrentHour(hourUtc: string): boolean {
  const hourDate = new Date(hourUtc);
  const now = new Date();
  return (
    hourDate.getUTCFullYear() === now.getUTCFullYear() &&
    hourDate.getUTCMonth() === now.getUTCMonth() &&
    hourDate.getUTCDate() === now.getUTCDate() &&
    hourDate.getUTCHours() === now.getUTCHours()
  );
}

function scoreToLabel(score: number): string {
  if (score >= 85) return "Perfect";
  if (score >= 70) return "Good";
  if (score >= 45) return "Meh";
  if (score >= 20) return "Bad";
  return "Nope";
}

export default function DayTimeline({ hours, mode }: DayTimelineProps) {
  const dayGroups = groupByDay(hours);
  const dayKeys = Array.from(dayGroups.keys());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    new Set(dayKeys.slice(0, 2))
  );

  const toggleDay = (day: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {dayKeys.map((day) => {
        const dayHours = dayGroups.get(day)!;
        const isExpanded = expandedDays.has(day);
        const bestScore = Math.max(...dayHours.map((h) => h.scores[mode].score));
        const bestLabel = scoreToLabel(bestScore);
        const bestHour = dayHours.find((h) => h.scores[mode].score === bestScore);
        const bestTime = bestHour
          ? new Date(bestHour.hour_utc).toLocaleTimeString("en-IL", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "Asia/Jerusalem",
            })
          : "";

        return (
          <div
            key={day}
            className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#D0D7DE] overflow-hidden"
          >
            <button
              onClick={() => toggleDay(day)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[#F6F8FA] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[16px] font-semibold text-[#1F2328]">{day}</span>
                <span className="text-[12px] text-[#656D76]">
                  Best: <span className={`font-medium ${scoreText(bestLabel)}`}>{bestScore}</span> at {bestTime}
                </span>
              </div>
              <ChevronDown
                size={16}
                className={`text-[#656D76] transition-transform ${isExpanded ? "rotate-180" : ""}`}
              />
            </button>

            {isExpanded && (
              <div className="px-2 pb-2 space-y-0.5">
                {dayHours.map((hour) => (
                  <HourRow
                    key={hour.hour_utc}
                    hour={hour}
                    mode={mode}
                    isNow={isCurrentHour(hour.hour_utc)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
