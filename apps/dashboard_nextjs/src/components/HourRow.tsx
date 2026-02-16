"use client";

import { useState } from "react";
import { ChevronDown, Waves, Thermometer, Wind, Sun, CloudRain, Activity } from "lucide-react";
import { scoreBg, scoreBgLight, scoreText, formatHour } from "@/lib/score-utils";
import ReasonChip from "./ReasonChip";
import type { ScoredHour, ActivityMode } from "@/lib/types";

interface HourRowProps {
  hour: ScoredHour;
  mode: ActivityMode;
  isNow?: boolean;
}

export default function HourRow({ hour, mode, isNow }: HourRowProps) {
  const [expanded, setExpanded] = useState(false);
  const modeScore = hour.scores[mode];
  const isGated = modeScore.hard_gated;
  const topChip = modeScore.reasons[0];

  return (
    <div className={`${isNow ? "ring-2 ring-blue-400 ring-offset-1" : ""} rounded-lg`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-0 rounded-lg text-left transition-colors hover:bg-[#F6F8FA] ${
          expanded ? "bg-[#F6F8FA]" : ""
        } ${isGated ? "opacity-50" : ""}`}
      >
        {/* Score color bar */}
        <div className={`w-1 self-stretch rounded-l-lg ${scoreBg(modeScore.label)}`} />

        <div className="flex-1 flex items-center gap-3 px-3 py-3">
          <span className="text-[14px] font-mono text-[#656D76] w-12 shrink-0">
            {formatHour(hour.hour_utc)}
          </span>

          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-full ${scoreBg(modeScore.label)} flex items-center justify-center text-white text-xs font-semibold shrink-0`}
            >
              {modeScore.score}
            </div>
            <div className="min-w-0">
              <span className={`text-[14px] font-medium ${isGated ? "line-through text-[#656D76]" : "text-[#1F2328]"}`}>
                {modeScore.label}
              </span>
              {topChip && (
                <span className="text-[12px] text-[#656D76] ml-2 hidden sm:inline">
                  {topChip.text}
                </span>
              )}
            </div>
          </div>

          <ChevronDown
            size={16}
            className={`text-[#656D76] shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {expanded && (
        <div className={`px-4 pb-3 pt-1 ${scoreBgLight(modeScore.label)} rounded-b-lg ml-1`}>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {modeScore.reasons.map((chip, i) => (
              <ReasonChip key={i} chip={chip} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] text-[#656D76]">
            {hour.feelslike_c != null && (
              <div className="flex items-center gap-1.5">
                <Thermometer size={13} />
                <span>Feels like <span className="font-medium text-[#1F2328]">{hour.feelslike_c}°C</span></span>
              </div>
            )}
            {hour.wave_height_m != null && (
              <div className="flex items-center gap-1.5">
                <Waves size={13} />
                <span>Waves <span className="font-medium text-[#1F2328]">{hour.wave_height_m}m</span></span>
              </div>
            )}
            {hour.gust_ms != null && (
              <div className="flex items-center gap-1.5">
                <Wind size={13} />
                <span>Gusts <span className="font-medium text-[#1F2328]">{hour.gust_ms}m/s</span></span>
              </div>
            )}
            {hour.uv_index != null && (
              <div className="flex items-center gap-1.5">
                <Sun size={13} />
                <span>UV <span className="font-medium text-[#1F2328]">{hour.uv_index}</span></span>
              </div>
            )}
            {hour.eu_aqi != null && (
              <div className="flex items-center gap-1.5">
                <Activity size={13} />
                <span>AQI <span className="font-medium text-[#1F2328]">{hour.eu_aqi}</span></span>
              </div>
            )}
            {hour.precip_prob_pct != null && (
              <div className="flex items-center gap-1.5">
                <CloudRain size={13} />
                <span>Rain <span className="font-medium text-[#1F2328]">{hour.precip_prob_pct}%</span></span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
