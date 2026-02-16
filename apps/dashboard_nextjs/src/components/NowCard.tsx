"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { scoreGradient, scoreHex, scoreGlow } from "@/lib/score-utils";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";
import { Thermometer, Waves, Wind, Sun } from "lucide-react";
import ReasonChip from "./ReasonChip";
import { VIBE_LINES, type ScoredHour, type ActivityMode } from "@/lib/types";

interface NowCardProps {
  hour: ScoredHour;
  mode: ActivityMode;
}

function useStableVibeLine(label: string, mode: ActivityMode): string {
  return useMemo(() => {
    const lines = VIBE_LINES[label] ?? VIBE_LINES["Meh"];
    return lines[Math.floor(Math.random() * lines.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, mode]);
}

function AnimatedScore({ score, label }: { score: number; label: string }) {
  const display = useAnimatedNumber(score);

  return (
    <div
      className={`w-[88px] h-[88px] bg-gradient-to-br ${scoreGradient(label)} rounded-full flex items-center justify-center text-white font-bold text-[38px] leading-none mb-2.5 score-breathe score-glow`}
      style={{ "--glow-color": scoreGlow(label) } as React.CSSProperties}
    >
      <motion.span>{display}</motion.span>
    </div>
  );
}

export default function NowCard({ hour, mode }: NowCardProps) {
  const modeScore = hour.scores[mode];
  const vibeLine = useStableVibeLine(modeScore.label, mode);

  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
      {/* Subtle gradient glow behind the card */}
      <div
        className="absolute inset-0 opacity-20 blur-3xl"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${scoreHex(modeScore.label)}, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        {/* Score circle lives OUTSIDE AnimatePresence so it doesn't remount from 0 */}
        <div className="flex flex-col items-center text-center mb-5">
          <AnimatedScore score={modeScore.score} label={modeScore.label} />

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <span
                className="text-[17px] font-semibold mb-1"
                style={{ color: scoreHex(modeScore.label) }}
              >
                {modeScore.label}
              </span>
              <p className="text-[14px] text-slate-400 italic">
                {vibeLine}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Conditions row — static, same data regardless of mode */}
        <div className="flex justify-center gap-6 mb-5 text-[13px]">
          {hour.feelslike_c != null && (
            <div className="flex flex-col items-center gap-0.5">
              <Thermometer size={14} className="text-slate-400" />
              <span className="text-[10px] uppercase tracking-widest text-slate-400">Feels</span>
              <span className="font-medium text-slate-200">{hour.feelslike_c}°</span>
            </div>
          )}
          {hour.wave_height_m != null && (
            <div className="flex flex-col items-center gap-0.5">
              <Waves size={14} className="text-slate-400" />
              <span className="text-[10px] uppercase tracking-widest text-slate-400">Waves</span>
              <span className="font-medium text-slate-200">{hour.wave_height_m}m</span>
            </div>
          )}
          {hour.wind_ms != null && (
            <div className="flex flex-col items-center gap-0.5">
              <Wind size={14} className="text-slate-400" />
              <span className="text-[10px] uppercase tracking-widest text-slate-400">Wind</span>
              <span className="font-medium text-slate-200">{hour.wind_ms}m/s</span>
            </div>
          )}
          {hour.uv_index != null && (
            <div className="flex flex-col items-center gap-0.5">
              <Sun size={14} className="text-slate-400" />
              <span className="text-[10px] uppercase tracking-widest text-slate-400">UV</span>
              <span className="font-medium text-slate-200">{hour.uv_index}</span>
            </div>
          )}
        </div>

        {/* Reason chips — crossfade on mode change */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`chips-${mode}`}
            className="flex flex-wrap justify-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {modeScore.reasons.map((chip, i) => (
              <ReasonChip key={i} chip={chip} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
