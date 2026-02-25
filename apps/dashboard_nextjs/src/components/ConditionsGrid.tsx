"use client";

import { motion } from "framer-motion";
import { Thermometer, Waves, Wind, Sun, CloudRain, AirVent } from "lucide-react";
import { getConditions, severityColor, severityHex } from "@/lib/condition-severity";
import type { ScoredHour } from "@/lib/types";

interface ConditionsGridProps {
  hour: ScoredHour;
}

const CONDITION_ICONS: Record<string, typeof Thermometer> = {
  feels: Thermometer,
  waves: Waves,
  wind: Wind,
  uv: Sun,
  aqi: AirVent,
  rain: CloudRain,
};

const tileVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.3, ease: "easeOut" as const },
  }),
};

export default function ConditionsGrid({ hour }: ConditionsGridProps) {
  const conditions = getConditions(hour);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
          Conditions
        </span>
      </div>

      <div className="grid grid-cols-2 gap-[1px] bg-white/[0.04] p-[1px]">
        {conditions.map((cond, i) => {
          const Icon = CONDITION_ICONS[cond.key] ?? AirVent;
          const color = severityColor(cond.severity);
          const hex = severityHex(cond.severity);
          return (
            <motion.div
              key={cond.key}
              variants={tileVariants}
              initial="hidden"
              animate="show"
              custom={i}
              className="bg-[#0F1724] p-3.5 flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-1.5">
                <Icon size={13} className={color} />
                <span className={`text-[10px] font-medium uppercase tracking-wider ${color}`}>
                  {cond.label}
                </span>
              </div>
              <span
                className="text-[18px] font-semibold leading-tight"
                style={{ color: hex }}
              >
                {cond.value}
              </span>
              {cond.detail && (
                <span className="text-[11px] text-slate-500">
                  {cond.detail}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
