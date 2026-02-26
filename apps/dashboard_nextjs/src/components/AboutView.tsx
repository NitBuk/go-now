"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";
import { motion, useInView, type Variants } from "framer-motion";
import {
  Layers,
  Zap,
  Github,
  ChevronRight,
  PawPrint,
  Waves,
  PersonStanding,
  Wind,
  Sun,
  Activity,
  CloudRain,
  Thermometer,
} from "lucide-react";
import Link from "next/link";

/* ── Counter hook ────────────────────────────────────────────────── */

function useCounter(target: number, enabled: boolean, duration = 700) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    setTimeout(() => setVal(0), 0);
    const steps = 25;
    const inc = target / steps;
    let cur = 0;
    const timer = setInterval(() => {
      cur += inc;
      if (cur >= target) {
        setVal(target);
        clearInterval(timer);
      } else {
        setVal(Math.round(cur));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, enabled, duration]);
  return val;
}

/* ── ScrollReveal ────────────────────────────────────────────────── */

function ScrollReveal({
  children,
  className,
  variants,
  custom,
}: {
  children: ReactNode;
  className?: string;
  variants: Variants;
  custom?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  return (
    <motion.div
      ref={ref}
      className={className}
      variants={variants}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
      custom={custom}
    >
      {children}
    </motion.div>
  );
}

/* ── Variants ────────────────────────────────────────────────────── */

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1, duration: 0.35, ease: "easeOut" as const },
  }),
};

const springIn: Variants = {
  hidden: { opacity: 0, scale: 0.65, y: 8 },
  show: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: i * 0.07,
      duration: 0.3,
      type: "spring" as const,
      stiffness: 340,
      damping: 18,
    },
  }),
};

/* ── App combiner (hero interactive widget) ──────────────────────── */

const APPS = [
  { Icon: Waves,       label: "Waves",   color: "#60A5FA" },
  { Icon: Thermometer, label: "Temp",    color: "#FBBF24" },
  { Icon: Sun,         label: "UV",      color: "#FCD34D" },
  { Icon: Activity,    label: "AQI",     color: "#34D399" },
];

function AppCombiner() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  const [phase, setPhase] = useState(-1);
  const scoreVal = useCounter(87, phase === 4, 650);

  useEffect(() => {
    if (!isInView) {
      setTimeout(() => setPhase(-1), 0);
      return;
    }

    // Track all timers so cleanup can cancel every one
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let active = true;

    const safe = (fn: () => void, delay: number) => {
      const t = setTimeout(() => {
        timers.delete(t);
        if (active) fn();
      }, delay);
      timers.add(t);
    };

    const run = (offset: number) => {
      safe(() => setPhase(0), offset);
      safe(() => setPhase(1), offset + 370);
      safe(() => setPhase(2), offset + 740);
      safe(() => setPhase(3), offset + 1110);
      safe(() => setPhase(4), offset + 1500);
      // hold score → reset → loop
      safe(() => { setPhase(-1); run(700); }, offset + 4300);
    };

    run(400);

    return () => {
      active = false;
      timers.forEach(clearTimeout);
    };
  }, [isInView]);

  return (
    <div
      ref={ref}
      className="mt-4 rounded-xl p-3 border border-white/[0.06]"
      style={{ background: "rgba(255,255,255,0.025)" }}
    >
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2.5">
        Every morning
      </p>
      <div className="flex items-center gap-1.5">
        {/* App icon tiles */}
        {APPS.map(({ Icon, label, color }, i) => {
          const lit = phase === i;
          const done = phase === 4;
          return (
            <motion.div
              key={label}
              className="flex-1 flex flex-col items-center gap-1 rounded-lg py-2 px-1 transition-colors duration-200"
              animate={lit ? { y: -4, scale: 1.08 } : done ? { y: -2, scale: 1.03 } : { y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              style={{
                background: lit || done ? `${color}1A` : "transparent",
                border: `1px solid ${lit || done ? color + "55" : "transparent"}`,
                boxShadow: lit ? `0 0 12px ${color}35` : "none",
              }}
            >
              <Icon size={14} style={{ color: lit || done ? color : "#475569" }} />
              <span className="text-[9px]" style={{ color: lit || done ? color : "#475569" }}>
                {label}
              </span>
            </motion.div>
          );
        })}

        {/* Flowing dots arrow */}
        <motion.div
          className="flex items-center gap-0.5 shrink-0"
          animate={phase === 4 ? { opacity: 1, x: 0 } : { opacity: 0.2, x: -3 }}
          transition={{ duration: 0.35 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full bg-slate-400"
              animate={
                phase === 4
                  ? { opacity: [0.3, 1, 0.3], x: [0, 2, 0] }
                  : { opacity: 0.2 }
              }
              transition={{
                delay: i * 0.12,
                duration: 0.55,
                repeat: phase === 4 ? Infinity : 0,
              }}
            />
          ))}
          <ChevronRight size={13} className="text-slate-400 ml-0.5" />
        </motion.div>

        {/* Score circle */}
        <motion.div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #059669, #34D399)" }}
          animate={
            phase === 4
              ? {
                  scale: [0.8, 1.12, 1],
                  boxShadow: [
                    "0 0 0px rgba(52,211,153,0)",
                    "0 0 20px rgba(52,211,153,0.55)",
                    "0 0 8px rgba(52,211,153,0.25)",
                  ],
                }
              : { scale: 0.82, boxShadow: "0 0 0px rgba(52,211,153,0)" }
          }
          transition={{ duration: 0.5 }}
        >
          <span className="text-sm font-bold text-white tabular-nums">
            {phase === 4 ? scoreVal : "?"}
          </span>
        </motion.div>
      </div>
      <p className="text-[10px] text-slate-500 mt-2 text-center">4 apps → 1 answer</p>
    </div>
  );
}

/* ── Dog reason row with severity bar ───────────────────────────── */

function DogReasonRow({
  text,
  barColor,
  severity,
  index,
}: {
  text: string;
  barColor: string;
  severity: number;
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <motion.div
      ref={ref}
      className="space-y-1.5"
      variants={rowVariants}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
      custom={index}
    >
      <span className="text-sm text-slate-300">{text}</span>
      <div className="h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: "0%" }}
          animate={isInView ? { width: `${severity}%` } : { width: "0%" }}
          transition={{
            delay: index * 0.15 + 0.25,
            duration: 0.55,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />
      </div>
    </motion.div>
  );
}

/* ── Mode row with animated score bar + counter ──────────────────── */

function ModeRow({
  icon: Icon,
  label,
  score,
  color,
  bgColor,
  barColor,
  index,
}: {
  icon: typeof Waves;
  label: string;
  score: number;
  color: string;
  bgColor: string;
  barColor: string;
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const count = useCounter(score, isInView);

  return (
    <motion.div
      ref={ref}
      className="space-y-1"
      variants={rowVariants}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
      custom={index}
    >
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-slate-400 shrink-0" />
        <span className="text-sm text-slate-300 flex-1">{label}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums ${bgColor} ${color}`}
        >
          {count}
        </span>
      </div>
      <div className="h-[3px] bg-white/[0.05] rounded-full overflow-hidden ml-5">
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: "0%" }}
          animate={isInView ? { width: `${score}%` } : { width: "0%" }}
          transition={{
            delay: index * 0.08 + 0.15,
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />
      </div>
    </motion.div>
  );
}

/* ── Static data ─────────────────────────────────────────────────── */

const MODES = [
  { icon: Waves,         label: "Swim solo",   score: 87, color: "text-emerald-400", bg: "bg-emerald-400/15", bar: "#34D399" },
  { icon: Waves,         label: "Swim + dog",  score: 74, color: "text-blue-400",    bg: "bg-blue-400/15",    bar: "#60A5FA" },
  { icon: PersonStanding,label: "Run solo",    score: 91, color: "text-emerald-400", bg: "bg-emerald-400/15", bar: "#34D399" },
  { icon: PersonStanding,label: "Run + dog",   score: 65, color: "text-amber-400",   bg: "bg-amber-400/15",   bar: "#FBBF24" },
];

const DATA_SOURCES = [
  { Icon: Waves,       label: "Waves" },
  { Icon: Thermometer, label: "Temp" },
  { Icon: Sun,         label: "UV" },
  { Icon: Activity,    label: "AQI" },
  { Icon: Wind,        label: "Wind" },
  { Icon: CloudRain,   label: "Rain" },
];

const TIERS = [
  { label: "Perfect 85+", color: "text-emerald-400", bg: "bg-emerald-400/15" },
  { label: "Good 70",     color: "text-blue-400",    bg: "bg-blue-400/15"    },
  { label: "Meh 45",      color: "text-amber-400",   bg: "bg-amber-400/15"   },
  { label: "Bad 20",      color: "text-orange-400",  bg: "bg-orange-400/15"  },
  { label: "Nope 0",      color: "text-red-400",     bg: "bg-red-400/15"     },
];

const DOG_REASONS = [
  { text: "Overheats faster than humans",        barColor: "#F87171", severity: 85 },
  { text: "More sensitive to air quality",       barColor: "#FBBF24", severity: 70 },
  { text: "Can\u2019t tell you when it\u2019s enough", barColor: "#FB923C", severity: 92 },
];

const TECH_STACK = ["Next.js", "FastAPI", "Python", "GCP"];

/* ── Main component ──────────────────────────────────────────────── */

export default function AboutView() {
  return (
    <div className="space-y-4">
      {/* Page heading */}
      <motion.h1
        className="text-lg font-bold text-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        About
      </motion.h1>

      {/* 1. Hero card */}
      <motion.div
        className="glass-card rounded-2xl p-5"
        variants={cardVariants}
        initial="hidden"
        animate="show"
        custom={0}
        whileHover={{ scale: 1.005, borderColor: "rgba(255,255,255,0.14)" }}
        transition={{ duration: 0.2 }}
      >
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-3">
          Built by one person
        </p>
        <p className="text-base italic text-slate-200 mb-3">
          &ldquo;Four apps, one decision. Every time.&rdquo;
        </p>
        <p className="text-sm text-slate-300 mb-1.5">
          Every morning before heading to the beach I&rsquo;d open four apps: waves,
          weather, UV, air quality. Then mentally combine them into a single answer.
        </p>
        <p className="text-sm text-slate-400 mb-1.5">
          There&rsquo;s no reason a human should have to do that math.
        </p>
        <p className="text-sm font-medium text-white">So I built Go Now.</p>
        <AppCombiner />
      </motion.div>

      {/* 2. Dog Layer card */}
      <ScrollReveal
        className="glass-card rounded-2xl p-5"
        variants={cardVariants}
        custom={1}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ delay: 1.5, duration: 0.5, repeat: Infinity, repeatDelay: 5 }}
          >
            <PawPrint size={14} className="text-slate-400" />
          </motion.div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            The Dog Layer
          </span>
        </div>
        <p className="text-sm text-slate-300 mb-3">Bringing my dog made it worse.</p>
        <div className="space-y-3 mb-3">
          {DOG_REASONS.map((r, i) => (
            <DogReasonRow
              key={r.text}
              text={r.text}
              barColor={r.barColor}
              severity={r.severity}
              index={i}
            />
          ))}
        </div>
        <p className="text-sm text-slate-400">Same scattered data, higher stakes.</p>
      </ScrollReveal>

      {/* 3. Four Modes card */}
      <ScrollReveal
        className="glass-card rounded-2xl p-5"
        variants={cardVariants}
        custom={2}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <Layers size={14} className="text-slate-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Four Modes
          </span>
        </div>
        <p className="text-sm text-slate-400 mb-3">
          The dog modes use stricter thresholds.
        </p>
        <div className="space-y-3">
          {MODES.map((m, i) => (
            <ModeRow
              key={m.label}
              icon={m.icon}
              label={m.label}
              score={m.score}
              color={m.color}
              bgColor={m.bg}
              barColor={m.bar}
              index={i}
            />
          ))}
        </div>
      </ScrollReveal>

      {/* 4. How It Scores card */}
      <ScrollReveal
        className="glass-card rounded-2xl p-5"
        variants={cardVariants}
        custom={3}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <Zap size={14} className="text-slate-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            How It Scores
          </span>
        </div>

        {/* Data source chips — spring bounce in */}
        <div className="flex flex-wrap gap-1.5 mb-3 items-center">
          {DATA_SOURCES.map(({ Icon, label }, i) => (
            <ScrollReveal key={label} variants={springIn} custom={i}>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                <Icon size={11} className="text-slate-400" />
                <span className="text-[11px] text-slate-400">{label}</span>
              </div>
            </ScrollReveal>
          ))}
          <ScrollReveal variants={springIn} custom={DATA_SOURCES.length}>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
              <ChevronRight size={11} className="text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-medium">0–100</span>
            </div>
          </ScrollReveal>
        </div>

        {/* Score tier pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {TIERS.map((tier, i) => (
            <ScrollReveal key={tier.label} variants={springIn} custom={i + 1}>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${tier.bg} ${tier.color}`}
              >
                {tier.label}
              </span>
            </ScrollReveal>
          ))}
        </div>

        <Link
          href="/formula"
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Full formula <ChevronRight size={14} />
        </Link>
      </ScrollReveal>

      {/* 5. Open Source card */}
      <ScrollReveal
        className="glass-card rounded-2xl p-5"
        variants={cardVariants}
        custom={4}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <Github size={14} className="text-slate-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Open Source
          </span>
        </div>

        {/* Tech stack pills — spring bounce */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {TECH_STACK.map((tech, i) => (
            <ScrollReveal key={tech} variants={springIn} custom={i}>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-300 bg-white/[0.06] border border-white/[0.1]">
                {tech}
              </span>
            </ScrollReveal>
          ))}
        </div>

        <motion.a
          href="https://github.com/nitzanber/go-now"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-sm text-slate-200"
          whileHover={{ backgroundColor: "rgba(255,255,255,0.1)", scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.15 }}
        >
          <Github size={13} />
          View on GitHub
        </motion.a>
      </ScrollReveal>
    </div>
  );
}
