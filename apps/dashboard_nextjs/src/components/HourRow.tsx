"use client";

import { useState } from "react";
import { ChevronDown, Waves, Thermometer, Wind, Sun, CloudRain, Activity } from "lucide-react";
import { scoreBg, scoreBgLight, scoreGradient, formatHour } from "@/lib/score-utils";
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

  return (
    <div className={`${isNow ? "ring-1 ring-blue-400/50 ring-offset-1 ring-offset-transparent" : ""} rounded-lg`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-0 rounded-lg text-left transition-colors hover:bg-white/[0.04] cursor-pointer ${
          expanded ? "bg-white/[0.04]" : ""
        } ${isGated ? "opacity-40" : ""}`}
      >
        <div className={`w-1 self-stretch rounded-l-lg ${scoreBg(modeScore.label)}`} />

        <div className="flex-1 flex items-center gap-3 px-3 py-2.5">
          <span className="text-[13px] font-mono text-slate-400 w-12 shrink-0">
            {formatHour(hour.hour_utc)}
          </span>

          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-full bg-gradient-to-br ${scoreGradient(modeScore.label)} flex items-center justify-center text-white text-[11px] font-semibold shrink-0`}
            >
              {modeScore.score}
            </div>
            <div className="min-w-0">
              <span className={`text-[13px] font-medium ${isGated ? "line-through text-slate-400" : "text-slate-200"}`}>
                {modeScore.label}
              </span>
            </div>
          </div>

          <ChevronDown
            size={14}
            className={`text-slate-400 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
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

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] text-slate-400">
            {hour.feelslike_c != null && (
              <div className="flex items-center gap-1.5">
                <Thermometer size={12} />
                <span>Feels <span className="font-medium text-slate-200">{hour.feelslike_c}°C</span></span>
              </div>
            )}
            {hour.wave_height_m != null && (
              <div className="flex items-center gap-1.5">
                <Waves size={12} />
                <span>Waves <span className="font-medium text-slate-200">{hour.wave_height_m}m</span></span>
              </div>
            )}
            {hour.wind_ms != null && (
              <div className="flex items-center gap-1.5">
                <Wind size={12} />
                <span>Wind <span className="font-medium text-slate-200">{hour.wind_ms}m/s</span></span>
              </div>
            )}
            {hour.uv_index != null && (
              <div className="flex items-center gap-1.5">
                <Sun size={12} />
                <span>UV <span className="font-medium text-slate-200">{hour.uv_index}</span></span>
              </div>
            )}
            {hour.eu_aqi != null && (
              <div className="flex items-center gap-1.5">
                <Activity size={12} />
                <span>AQI <span className="font-medium text-slate-200">{hour.eu_aqi}</span></span>
              </div>
            )}
            {hour.precip_prob_pct != null && (
              <div className="flex items-center gap-1.5">
                <CloudRain size={12} />
                <span>Rain <span className="font-medium text-slate-200">{hour.precip_prob_pct}%</span></span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
