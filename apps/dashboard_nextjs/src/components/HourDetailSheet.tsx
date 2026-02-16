"use client";

import { motion } from "framer-motion";
import { X, Thermometer, Waves, Wind, Sun, CloudRain, Activity } from "lucide-react";
import { scoreGradient, scoreHex, scoreGlow, formatHour } from "@/lib/score-utils";
import ReasonChip from "./ReasonChip";
import type { ScoredHour, ActivityMode } from "@/lib/types";

interface HourDetailSheetProps {
  hour: ScoredHour;
  mode: ActivityMode;
  onClose: () => void;
}

export default function HourDetailSheet({ hour, mode, onClose }: HourDetailSheetProps) {
  const ms = hour.scores[mode];

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="relative w-full max-w-lg bg-[#0F1724] border-t border-white/[0.08] rounded-t-3xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[14px] font-medium text-slate-200">
            {formatHour(hour.hour_utc)}
          </span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 cursor-pointer">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Score + label */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className={`w-14 h-14 rounded-full bg-gradient-to-br ${scoreGradient(ms.label)} flex items-center justify-center text-white font-bold text-[22px] score-glow`}
            style={{ "--glow-color": scoreGlow(ms.label) } as React.CSSProperties}
          >
            {ms.score}
          </div>
          <div>
            <span className="text-[16px] font-semibold" style={{ color: scoreHex(ms.label) }}>
              {ms.label}
            </span>
            {ms.hard_gated && (
              <span className="text-[11px] text-red-400 ml-2">Hard gated</span>
            )}
          </div>
        </div>

        {/* Reason chips */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {ms.reasons.map((chip, i) => (
            <ReasonChip key={i} chip={chip} />
          ))}
        </div>

        {/* Conditions grid */}
        <div className="grid grid-cols-3 gap-3">
          {hour.feelslike_c != null && (
            <div className="bg-white/[0.04] rounded-xl p-3 flex flex-col items-center gap-1">
              <Thermometer size={14} className="text-slate-400" />
              <span className="text-[10px] text-slate-400 uppercase">Feels</span>
              <span className="text-[15px] font-medium text-slate-200">{hour.feelslike_c}°</span>
            </div>
          )}
          {hour.wave_height_m != null && (
            <div className="bg-white/[0.04] rounded-xl p-3 flex flex-col items-center gap-1">
              <Waves size={14} className="text-slate-400" />
              <span className="text-[10px] text-slate-400 uppercase">Waves</span>
              <span className="text-[15px] font-medium text-slate-200">{hour.wave_height_m}m</span>
            </div>
          )}
          {hour.wind_ms != null && (
            <div className="bg-white/[0.04] rounded-xl p-3 flex flex-col items-center gap-1">
              <Wind size={14} className="text-slate-400" />
              <span className="text-[10px] text-slate-400 uppercase">Wind</span>
              <span className="text-[15px] font-medium text-slate-200">{hour.wind_ms}m/s</span>
            </div>
          )}
          {hour.uv_index != null && (
            <div className="bg-white/[0.04] rounded-xl p-3 flex flex-col items-center gap-1">
              <Sun size={14} className="text-slate-400" />
              <span className="text-[10px] text-slate-400 uppercase">UV</span>
              <span className="text-[15px] font-medium text-slate-200">{hour.uv_index}</span>
            </div>
          )}
          {hour.eu_aqi != null && (
            <div className="bg-white/[0.04] rounded-xl p-3 flex flex-col items-center gap-1">
              <Activity size={14} className="text-slate-400" />
              <span className="text-[10px] text-slate-400 uppercase">AQI</span>
              <span className="text-[15px] font-medium text-slate-200">{hour.eu_aqi}</span>
            </div>
          )}
          {hour.precip_prob_pct != null && (
            <div className="bg-white/[0.04] rounded-xl p-3 flex flex-col items-center gap-1">
              <CloudRain size={14} className="text-slate-400" />
              <span className="text-[10px] text-slate-400 uppercase">Rain</span>
              <span className="text-[15px] font-medium text-slate-200">{hour.precip_prob_pct}%</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
