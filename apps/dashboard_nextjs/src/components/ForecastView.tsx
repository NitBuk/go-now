"use client";

import { useState } from "react";
import ModeSelector from "./ModeSelector";
import NowCard from "./NowCard";
import BestWindow from "./BestWindow";
import DayTimeline from "./DayTimeline";
import type { ScoredForecastResponse, ActivityMode } from "@/lib/types";

interface ForecastViewProps {
  data: ScoredForecastResponse;
}

function findCurrentHour(data: ScoredForecastResponse) {
  const now = new Date();
  // Find the hour closest to now (same hour or most recent past hour)
  let best = data.hours[0] ?? null;
  for (const hour of data.hours) {
    const hourDate = new Date(hour.hour_utc);
    if (hourDate <= now) {
      best = hour;
    } else {
      break;
    }
  }
  return best;
}

export default function ForecastView({ data }: ForecastViewProps) {
  const [mode, setMode] = useState<ActivityMode>("swim_solo");
  const currentHour = findCurrentHour(data);

  return (
    <div className="space-y-4">
      <ModeSelector selected={mode} onChange={setMode} />

      {currentHour && <NowCard hour={currentHour} mode={mode} />}

      <BestWindow hours={data.hours} mode={mode} />

      <div>
        <h2 className="text-[12px] font-medium text-[#656D76] uppercase tracking-wider px-1 mb-2">
          7-Day Forecast
        </h2>
        <DayTimeline hours={data.hours} mode={mode} />
      </div>
    </div>
  );
}
