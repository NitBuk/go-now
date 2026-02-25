"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sunrise, Sunset } from "lucide-react";
import { scoreGradient, scoreGlow } from "@/lib/score-utils";
import { formatHour } from "@/lib/score-utils";
import { getSunTimes, getSunTimesFromData, getSunEvent } from "@/lib/sun";
import HourDetailSheet from "./HourDetailSheet";
import type { ScoredHour, ActivityMode, DailySunTime } from "@/lib/types";

interface HourlyCarouselProps {
  hours: ScoredHour[];
  mode: ActivityMode;
  daily?: DailySunTime[];
}

function isCurrentHour(hourUtc: string): boolean {
  const h = new Date(hourUtc);
  const now = new Date();
  return (
    h.getUTCFullYear() === now.getUTCFullYear() &&
    h.getUTCMonth() === now.getUTCMonth() &&
    h.getUTCDate() === now.getUTCDate() &&
    h.getUTCHours() === now.getUTCHours()
  );
}

function getNext24Hours(hours: ScoredHour[]): ScoredHour[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 3600000);
  const limit = new Date(now.getTime() + 24 * 3600000);

  return hours
    .filter((h) => {
      const d = new Date(h.hour_utc);
      return d >= cutoff && d <= limit;
    })
    .slice(0, 24);
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.3, ease: "easeOut" as const },
  }),
};

function SunMarker({ type, label }: { type: "sunrise" | "sunset"; label: string }) {
  const Icon = type === "sunrise" ? Sunrise : Sunset;
  const color = type === "sunrise" ? "text-amber-400" : "text-orange-400";

  return (
    <div className="flex flex-col items-center gap-1 px-1 min-w-[44px]">
      <Icon size={13} className={color} />
      <div className={`w-[1px] h-8 ${type === "sunrise" ? "bg-amber-400/30" : "bg-orange-400/30"}`} />
      <span className={`text-[9px] font-medium ${color}`}>
        {label}
      </span>
    </div>
  );
}

export default function HourlyCarousel({ hours, mode, daily = [] }: HourlyCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLButtonElement>(null);
  const todayHours = getNext24Hours(hours);
  const [selectedHour, setSelectedHour] = useState<ScoredHour | null>(null);

  const sunTimesMap = useMemo(() => {
    const seen = new Set<string>();
    const map = new Map<string, { type: "sunrise" | "sunset"; label: string }>();
    for (const hour of todayHours) {
      const date = new Date(hour.hour_utc);
      const dayKey = date.toISOString().slice(0, 10);
      if (!seen.has(dayKey)) {
        seen.add(dayKey);
      }
      const sunTimes = getSunTimesFromData(date, daily) ?? getSunTimes(date);
      const event = getSunEvent(hour.hour_utc, sunTimes);
      if (event) {
        map.set(hour.hour_utc, event);
      }
    }
    return map;
  }, [todayHours]);

  useEffect(() => {
    if (nowRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = nowRef.current;
      const scrollLeft = el.offsetLeft - container.offsetLeft - 16;
      container.scrollTo({ left: scrollLeft, behavior: "instant" });
    }
  }, []);

  if (todayHours.length === 0) return null;

  return (
    <>
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-white/[0.06]">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Hourly Forecast
          </span>
        </div>
        <div
          ref={scrollRef}
          className="flex gap-0 overflow-x-auto scrollbar-hide py-3 px-1 snap-x snap-mandatory items-center"
        >
          {todayHours.map((hour, i) => {
            const ms = hour.scores[mode];
            const isCurrent = isCurrentHour(hour.hour_utc);
            const sunEvent = sunTimesMap.get(hour.hour_utc);

            return (
              <div key={hour.hour_utc} className="flex items-center">
                <motion.button
                  ref={isCurrent ? nowRef : undefined}
                  onClick={() => setSelectedHour(hour)}
                  variants={itemVariants}
                  initial="hidden"
                  animate="show"
                  custom={i}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center gap-1.5 px-2.5 min-w-[58px] snap-start cursor-pointer hover:bg-white/[0.03] transition-colors rounded-lg ${
                    isCurrent ? "bg-white/[0.04]" : ""
                  } ${
                    i < todayHours.length - 1
                      ? "border-r border-white/[0.04]"
                      : ""
                  }`}
                >
                  <span
                    className={`text-[11px] font-medium ${
                      isCurrent ? "text-white" : "text-slate-500"
                    }`}
                  >
                    {isCurrent ? "Now" : formatHour(hour.hour_utc)}
                  </span>

                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${scoreGradient(ms.label)} flex items-center justify-center text-white text-[11px] font-semibold ${
                      isCurrent ? "score-glow" : ""
                    }`}
                    style={
                      isCurrent
                        ? ({
                            "--glow-color": scoreGlow(ms.label),
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {ms.score}
                  </div>

                  {hour.feelslike_c != null && (
                    <span className="text-[11px] text-slate-400 font-medium">
                      {Math.round(hour.feelslike_c)}°
                    </span>
                  )}
                </motion.button>
                {sunEvent && (
                  <SunMarker type={sunEvent.type} label={sunEvent.label} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedHour && (
          <HourDetailSheet
            key={selectedHour.hour_utc}
            hour={selectedHour}
            mode={mode}
            onClose={() => setSelectedHour(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
