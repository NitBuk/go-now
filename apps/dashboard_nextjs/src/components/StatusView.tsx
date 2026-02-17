"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Clock, Database, Layers, MapPin } from "lucide-react";
import { statusColor } from "@/lib/score-utils";
import type { HealthResponse } from "@/lib/types";

interface StatusViewProps {
  health: HealthResponse;
}

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const duration = 800;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [target]);

  return <span className="tabular-nums">{count}{suffix}</span>;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.3 + i * 0.08, duration: 0.3, ease: "easeOut" as const },
  }),
};

export default function StatusView({ health }: StatusViewProps) {
  return (
    <div className="space-y-4">
      <motion.h1
        className="text-lg font-bold text-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        Pipeline Status
      </motion.h1>

      {/* Overall Status */}
      <motion.div
        className="glass-card rounded-2xl p-5"
        variants={cardVariants}
        initial="hidden"
        animate="show"
        custom={0}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <Activity size={14} className="text-slate-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            System Health
          </span>
        </div>
        <motion.div
          className={`text-2xl font-bold capitalize ${statusColor(health.status)}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {health.status}
        </motion.div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.3 }}
          >
            <span className="text-slate-400 text-xs">API Version</span>
            <p className="font-medium text-slate-200">{health.version}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45, duration: 0.3 }}
          >
            <span className="text-slate-400 text-xs">Scoring</span>
            <p className="font-medium text-slate-200">{health.scoring_version}</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Forecast Pipeline */}
      <motion.div
        className="glass-card rounded-2xl p-5"
        variants={cardVariants}
        initial="hidden"
        animate="show"
        custom={1}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <Database size={14} className="text-slate-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Forecast Pipeline
          </span>
        </div>
        <div className="space-y-3">
          <motion.div
            className="flex justify-between items-center"
            variants={rowVariants}
            initial="hidden"
            animate="show"
            custom={0}
          >
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <Clock size={13} />
              <span>Freshness</span>
            </div>
            <span className={`text-sm font-medium ${health.forecast.freshness === "fresh" ? "text-emerald-400" : "text-amber-400"}`}>
              {health.forecast.freshness === "fresh" ? "Fresh" : "Stale"} (<AnimatedCounter target={health.forecast.age_minutes} suffix="m ago" />)
            </span>
          </motion.div>
          <motion.div
            className="flex justify-between items-center"
            variants={rowVariants}
            initial="hidden"
            animate="show"
            custom={1}
          >
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <Layers size={13} />
              <span>Ingest Status</span>
            </div>
            <span className="text-sm font-medium text-slate-200">{health.forecast.ingest_status}</span>
          </motion.div>
          <motion.div
            className="flex justify-between items-center"
            variants={rowVariants}
            initial="hidden"
            animate="show"
            custom={2}
          >
            <span className="text-sm text-slate-400">Hours Available</span>
            <span className="text-sm font-medium text-slate-200">
              <AnimatedCounter target={health.forecast.hours_count} />
            </span>
          </motion.div>
          <motion.div
            className="flex justify-between items-center"
            variants={rowVariants}
            initial="hidden"
            animate="show"
            custom={3}
          >
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <MapPin size={13} />
              <span>Area</span>
            </div>
            <span className="text-sm font-medium text-slate-200">{health.forecast.area_id}</span>
          </motion.div>
          {health.forecast.updated_at_utc && (
            <motion.div
              className="flex justify-between items-center"
              variants={rowVariants}
              initial="hidden"
              animate="show"
              custom={4}
            >
              <span className="text-sm text-slate-400">Last Updated</span>
              <span className="text-sm font-mono text-slate-400">
                {new Date(health.forecast.updated_at_utc).toLocaleString("en-IL", { timeZone: "Asia/Jerusalem" })}
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Live Data Pipeline */}
      <motion.div
        className="glass-card rounded-2xl p-5 overflow-hidden"
        variants={cardVariants}
        initial="hidden"
        animate="show"
        custom={2}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-slate-400" />
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
              Data Pipeline
            </span>
          </div>
          <motion.span
            className="px-2.5 py-1 bg-emerald-400/15 text-emerald-400 text-[10px] font-mono rounded-full flex items-center gap-1.5"
            animate={{ x: [0, 2, 0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full live-dot" />
            LIVE
          </motion.span>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" as const }}
        >
          <svg className="w-full" viewBox="0 0 420 200" preserveAspectRatio="xMidYMid meet">
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(59,130,246,0.04)" strokeWidth="0.5"/>
              </pattern>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <rect width="420" height="200" fill="url(#grid)"/>

            <text x="50" y="16" textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">SOURCE</text>
            <text x="160" y="16" textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">INGEST</text>
            <text x="270" y="16" textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">STORAGE</text>
            <text x="375" y="16" textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">SERVING</text>

            <path d="M95 76 C105 76 110 55 115 55" className="data-flow-fast" stroke="#3B82F6" strokeWidth="1.5" fill="none" filter="url(#glow)"/>
            <path d="M95 90 C105 90 110 75 115 75" className="data-flow-fast" stroke="#22C55E" strokeWidth="1.5" fill="none"/>
            <path d="M95 104 C105 104 110 95 115 95" className="data-flow" stroke="#F59E0B" strokeWidth="1" fill="none"/>
            <path d="M95 118 C105 118 110 115 115 115" className="data-flow" stroke="#A855F7" strokeWidth="1" fill="none"/>

            <path d="M195 55 C220 55 230 45 240 45" className="data-flow-fast" stroke="#3B82F6" strokeWidth="1.5" fill="none"/>
            <path d="M195 75 C220 75 230 90 240 90" className="data-flow-fast" stroke="#22C55E" strokeWidth="1.5" fill="none"/>
            <path d="M195 95 C220 95 230 130 240 135" className="data-flow" stroke="#F59E0B" strokeWidth="1" fill="none"/>

            <path d="M310 45 C330 45 340 55 345 55" className="data-flow-fast" stroke="#60A5FA" strokeWidth="1.5" fill="none" filter="url(#glow)"/>
            <path d="M310 90 C330 90 340 95 345 95" className="data-flow" stroke="#22C55E" strokeWidth="1" fill="none"/>
            <path d="M310 135 C330 135 340 135 345 135" className="data-flow" stroke="#F59E0B" strokeWidth="1" fill="none"/>

            <g>
              <rect x="5" y="30" width="90" height="100" rx="8" fill="rgba(30,41,59,0.8)" stroke="#3B82F6" strokeWidth="1.5"/>
              <text x="50" y="52" textAnchor="middle" fill="#3B82F6" fontSize="10" fontWeight="bold" fontFamily="monospace">Open-Meteo</text>
              <line x1="15" y1="60" x2="85" y2="60" stroke="rgba(51,65,85,0.5)" strokeWidth="0.5"/>
              <text x="15" y="76" fill="#94A3B8" fontSize="8" fontFamily="monospace">Waves</text>
              <text x="15" y="90" fill="#94A3B8" fontSize="8" fontFamily="monospace">Weather</text>
              <text x="15" y="104" fill="#94A3B8" fontSize="8" fontFamily="monospace">UV / AQI</text>
              <text x="15" y="118" fill="#94A3B8" fontSize="8" fontFamily="monospace">Rain</text>
            </g>

            <g>
              <rect x="115" y="35" width="80" height="85" rx="8" fill="rgba(30,41,59,0.8)" stroke="#22C55E" strokeWidth="1.5"/>
              <text x="155" y="55" textAnchor="middle" fill="#22C55E" fontSize="10" fontWeight="bold" fontFamily="monospace">Ingest</text>
              <text x="155" y="68" textAnchor="middle" fill="#64748B" fontSize="7">Cloud Run</text>
              <line x1="125" y1="75" x2="185" y2="75" stroke="rgba(51,65,85,0.5)" strokeWidth="0.5"/>
              <text x="125" y="89" fill="#94A3B8" fontSize="7" fontFamily="monospace">Fetch</text>
              <text x="125" y="100" fill="#94A3B8" fontSize="7" fontFamily="monospace">Normalize</text>
              <text x="125" y="111" fill="#94A3B8" fontSize="7" fontFamily="monospace">Load</text>
            </g>

            <g>
              <rect x="220" y="25" width="90" height="35" rx="6" fill="rgba(30,41,59,0.8)" stroke="#60A5FA" strokeWidth="1"/>
              <text x="265" y="42" textAnchor="middle" fill="#60A5FA" fontSize="9" fontFamily="monospace">GCS Raw</text>
              <text x="265" y="52" textAnchor="middle" fill="#64748B" fontSize="7">JSON blobs</text>
            </g>
            <g>
              <rect x="220" y="70" width="90" height="35" rx="6" fill="rgba(30,41,59,0.8)" stroke="#F59E0B" strokeWidth="1"/>
              <text x="265" y="87" textAnchor="middle" fill="#F59E0B" fontSize="9" fontFamily="monospace">BigQuery</text>
              <text x="265" y="97" textAnchor="middle" fill="#64748B" fontSize="7">Curated tables</text>
            </g>
            <g>
              <rect x="220" y="115" width="90" height="35" rx="6" fill="rgba(30,41,59,0.8)" stroke="#F97316" strokeWidth="1"/>
              <text x="265" y="132" textAnchor="middle" fill="#F97316" fontSize="9" fontFamily="monospace">Firestore</text>
              <text x="265" y="142" textAnchor="middle" fill="#64748B" fontSize="7">Serving cache</text>
            </g>

            <g>
              <rect x="325" y="30" width="90" height="45" rx="8" fill="rgba(30,41,59,0.8)" stroke="#34D399" strokeWidth="1.5"/>
              <text x="370" y="50" textAnchor="middle" fill="#34D399" fontSize="10" fontWeight="bold" fontFamily="monospace">FastAPI</text>
              <text x="370" y="63" textAnchor="middle" fill="#64748B" fontSize="7">Scores + Forecast</text>
            </g>
            <g>
              <rect x="325" y="85" width="90" height="35" rx="6" fill="rgba(30,41,59,0.8)" stroke="#A855F7" strokeWidth="1"/>
              <text x="370" y="100" textAnchor="middle" fill="#A855F7" fontSize="9" fontFamily="monospace">Scoring v2</text>
              <text x="370" y="112" textAnchor="middle" fill="#64748B" fontSize="7">Linear ramp</text>
            </g>
            <g>
              <rect x="325" y="125" width="90" height="35" rx="6" fill="rgba(30,41,59,0.8)" stroke="#EC4899" strokeWidth="1"/>
              <text x="370" y="140" textAnchor="middle" fill="#EC4899" fontSize="9" fontFamily="monospace">Next.js</text>
              <text x="370" y="152" textAnchor="middle" fill="#64748B" fontSize="7">Web App</text>
            </g>

            <circle r="3" fill="#3B82F6" filter="url(#glow)">
              <animateMotion dur="3s" repeatCount="indefinite" path="M50 76 L115 55 L195 55 L265 45 L370 55"/>
            </circle>
            <circle r="2.5" fill="#22C55E">
              <animateMotion dur="4s" repeatCount="indefinite" path="M50 90 L115 75 L195 75 L265 90 L370 95" begin="0.8s"/>
            </circle>
            <circle r="2" fill="#F59E0B">
              <animateMotion dur="5s" repeatCount="indefinite" path="M50 104 L115 95 L195 95 L265 135 L370 135" begin="1.6s"/>
            </circle>

            <text x="50" y="155" textAnchor="middle" fill="#64748B" fontSize="7" fontFamily="monospace">Hourly via</text>
            <text x="50" y="165" textAnchor="middle" fill="#64748B" fontSize="7" fontFamily="monospace">Cloud Scheduler</text>
            <text x="155" y="140" textAnchor="middle" fill="#64748B" fontSize="7" fontFamily="monospace">Pub/Sub trigger</text>

            <text x="210" y="175" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">
              168 hourly forecasts per cycle
            </text>
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}
