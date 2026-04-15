"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ModeSelector from "./ModeSelector";
import HeroSection from "./HeroSection";
import BestWindow from "./BestWindow";
import HourlyCarousel from "./HourlyCarousel";
import DailyForecast from "./DailyForecast";
import AmbientBackground from "./AmbientBackground";
import { scoreBgTint } from "@/lib/score-utils";
import type { ScoredForecastResponse, ActivityMode } from "@/lib/types";

interface ForecastViewProps {
  data: ScoredForecastResponse;
}

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

// Panel variant: stagger its motion children independently
const panel = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

const heroReveal = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE } },
};

function findCurrentHour(data: ScoredForecastResponse) {
  const now = new Date();
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

  const currentLabel = currentHour?.scores[mode]?.label ?? "Meh";

  return (
    <div className="relative">
      <AmbientBackground label={currentLabel} />
      <div
        className="absolute -mt-32 -mx-4 left-0 right-0 h-[540px] pointer-events-none transition-all duration-700 ease-in-out"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${scoreBgTint(currentLabel)}, transparent 70%)`,
        }}
      />

      {/* Mobile: vertical stack. Desktop (lg+): two-column grid */}
      <motion.div
        className="relative lg:grid lg:grid-cols-[380px_1fr] lg:gap-6 lg:items-start space-y-3 lg:space-y-0"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Left panel: mode selector + hero score */}
        <motion.div className="space-y-3" variants={panel}>
          <motion.div variants={fadeUp}>
            <ModeSelector selected={mode} onChange={setMode} />
          </motion.div>

          {currentHour && (
            <motion.div variants={heroReveal}>
              <HeroSection hour={currentHour} mode={mode} />
            </motion.div>
          )}
        </motion.div>

        {/* Right panel: hourly timeline + best window + 7-day */}
        <motion.div className="space-y-3" variants={panel}>
          <motion.div variants={fadeUp}>
            <HourlyCarousel hours={data.hours} mode={mode} daily={data.daily} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <BestWindow hours={data.hours} mode={mode} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <DailyForecast hours={data.hours} mode={mode} />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
