"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { scoreGradient, scoreHex, scoreGlow } from "@/lib/score-utils";
import { formatHour } from "@/lib/score-utils";
import HourDetailSheet from "./HourDetailSheet";
import type { ScoredHour, ActivityMode } from "@/lib/types";

interface HourlyCarouselProps {
  hours: ScoredHour[];
  mode: ActivityMode;
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

  return hours.filter((h) => {
    const d = new Date(h.hour_utc);
    return d >= cutoff && d <= limit;
  }).slice(0, 24);
}

export default function HourlyCarousel({ hours, mode }: HourlyCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLButtonElement>(null);
  const todayHours = getNext24Hours(hours);
  const [selectedHour, setSelectedHour] = useState<ScoredHour | null>(null);

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
          className="flex gap-0 overflow-x-auto scrollbar-hide py-4 px-1"
        >
          {todayHours.map((hour, i) => {
            const ms = hour.scores[mode];
            const isCurrent = isCurrentHour(hour.hour_utc);

            return (
              <motion.button
                key={hour.hour_utc}
                ref={isCurrent ? nowRef : undefined}
                onClick={() => setSelectedHour(hour)}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`flex flex-col items-center gap-2 px-3 min-w-[62px] cursor-pointer hover:bg-white/[0.03] transition-colors rounded-lg ${
                  i < todayHours.length - 1 ? "border-r border-white/[0.04]" : ""
                }`}
              >
                <span
                  className={`text-[12px] font-medium ${
                    isCurrent ? "text-white" : "text-slate-400"
                  }`}
                >
                  {isCurrent ? "Now" : formatHour(hour.hour_utc)}
                </span>

                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${scoreGradient(ms.label)} flex items-center justify-center text-white text-[13px] font-semibold ${
                    isCurrent ? "score-glow" : ""
                  }`}
                  style={isCurrent ? { "--glow-color": scoreGlow(ms.label) } as React.CSSProperties : undefined}
                >
                  {ms.score}
                </div>

                <span
                  className="text-[10px] font-medium"
                  style={{ color: scoreHex(ms.label) }}
                >
                  {ms.label}
                </span>

                {hour.feelslike_c != null && (
                  <span className="text-[10px] text-slate-400">
                    {Math.round(hour.feelslike_c)}°
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Hour detail sheet */}
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
