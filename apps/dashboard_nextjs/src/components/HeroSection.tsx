"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Thermometer, Waves, Wind, Sun, CloudRain, Activity } from "lucide-react";
import { scoreHex, scoreGlow } from "@/lib/score-utils";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";
import { getConditions, severityColor } from "@/lib/condition-severity";
import { VIBE_LINES, type ScoredHour, type ActivityMode } from "@/lib/types";
import ActivityCharacter from "./ActivityCharacter";

interface HeroSectionProps {
  hour: ScoredHour;
  mode: ActivityMode;
}

const CONDITION_ICONS: Record<string, typeof Thermometer> = {
  feels: Thermometer,
  waves: Waves,
  wind: Wind,
  uv: Sun,
  aqi: Activity,
  rain: CloudRain,
};

function useStableVibeLine(label: string, mode: ActivityMode): string {
  return useMemo(() => {
    const lines = VIBE_LINES[label] ?? VIBE_LINES["Meh"];
    return lines[Math.floor(Math.random() * lines.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, mode]);
}

export default function HeroSection({ hour, mode }: HeroSectionProps) {
  const modeScore = hour.scores[mode];
  const vibeLine = useStableVibeLine(modeScore.label, mode);
  const display = useAnimatedNumber(modeScore.score);
  const hex = scoreHex(modeScore.label);
  const glow = scoreGlow(modeScore.label);
  const conditions = getConditions(hour);

  return (
    <div className="relative py-4">
      {/* Subtle glow behind score */}
      <div
        className="absolute inset-0 opacity-30 blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${hex}40, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Score number (centered) + character (absolute left) */}
        <div className="relative mb-1">
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3">
            <ActivityCharacter
              activity={mode.startsWith("swim") ? "swim" : "run"}
              withDog={mode.endsWith("_dog")}
              accentColor={hex}
            />
          </div>
          <div className={`flex items-baseline gap-1 ${
            modeScore.label === "Perfect" || modeScore.label === "Good"
              ? "score-breathe-fast"
              : modeScore.label === "Meh"
              ? "score-breathe"
              : "score-breathe-slow"
          }`}>
            <motion.span
              className="text-[72px] font-bold leading-none tabular-nums"
              style={{
                color: hex,
                textShadow: `0 0 40px ${glow}`,
              }}
            >
              {display}
            </motion.span>
          </div>
        </div>

        {/* Label + vibe — crossfade on mode change */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${mode}-${modeScore.label}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-1"
          >
            <span
              className="text-[15px] font-semibold"
              style={{ color: hex }}
            >
              {modeScore.label}
            </span>
            <p className="text-[13px] text-slate-400 italic max-w-[260px]">
              {vibeLine}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Conditions strip — all 6 params with severity coloring */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`conditions-${mode}`}
            className="flex justify-center gap-4 mt-4 w-full"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {conditions.map((cond, i) => {
              const Icon = CONDITION_ICONS[cond.key] ?? Activity;
              const color = severityColor(cond.severity);
              return (
                <motion.div
                  key={cond.key}
                  className="flex flex-col items-center gap-1 min-w-0"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                >
                  <Icon size={15} className={color} />
                  <span className={`text-[9px] font-medium uppercase tracking-wider ${color}`}>
                    {cond.label}
                  </span>
                  <span className={`text-[14px] font-semibold leading-tight ${color}`}>
                    {cond.value}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
