"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, type Variants } from "framer-motion";
import {
  Calculator, ShieldAlert, Waves, Thermometer,
  Sun, Wind, CloudRain, Dog, Activity, PersonStanding, Sunset,
} from "lucide-react";

/* ── Scroll-triggered reveal wrapper ────────────────────────────── */

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

/* ── Animated penalty number ────────────────────────────────────── */

function AnimatedPenalty({ target }: { target: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!isInView || target === 0) return;
    const duration = 600;
    const steps = 20;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (Math.abs(current) >= Math.abs(target)) {
        setVal(target);
        clearInterval(interval);
      } else {
        setVal(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [target, isInView]);

  return <span ref={ref} className="tabular-nums">{isInView ? val : 0}</span>;
}

/* ── Variant definitions ────────────────────────────────────────── */

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const tierVariants = {
  hidden: { opacity: 0, scale: 0.5, x: -10 },
  show: (i: number) => ({
    opacity: 1,
    scale: 1,
    x: 0,
    transition: { delay: i * 0.08, duration: 0.3, type: "spring" as const, stiffness: 300, damping: 20 },
  }),
};

const gateVariants = {
  hidden: { opacity: 0, x: -20 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1, duration: 0.35, ease: "easeOut" as const },
  }),
};

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" as const },
  }),
};

const stepVariants = {
  hidden: { opacity: 0, x: -10 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.3, duration: 0.4, ease: "easeOut" as const },
  }),
};

const bounceIn = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, type: "spring" as const, bounce: 0.3 },
  }),
};

/* ── Data ───────────────────────────────────────────────────────── */

const TIERS = [
  { range: "85-100", label: "Perfect", desc: "Ideal conditions \u2014 get out there", bg: "bg-emerald-400/15", text: "text-emerald-400" },
  { range: "70-84", label: "Good", desc: "Minor drawbacks, still enjoyable", bg: "bg-blue-400/15", text: "text-blue-400" },
  { range: "45-69", label: "Meh", desc: "Noticeable discomfort, go if you really want to", bg: "bg-amber-400/15", text: "text-amber-400" },
  { range: "20-44", label: "Bad", desc: "Uncomfortable or potentially unsafe conditions", bg: "bg-orange-400/15", text: "text-orange-400" },
  { range: "0-19", label: "Nope", desc: "Dangerous or completely unsuitable", bg: "bg-red-400/15", text: "text-red-400" },
];

const GATES = [
  { icon: CloudRain, name: "Heavy rain", scope: "All modes", rule: "\u22653mm precipitation or \u226580% probability", reason: "Unsafe footing, poor visibility, and hypothermia risk in coastal conditions" },
  { icon: Wind, name: "Extreme wind", scope: "Run only", rule: "Gusts \u226514 m/s", reason: "Sand blasting and balance hazard on the promenade" },
  { icon: Dog, name: "Dog heat", scope: "Run + Dog", rule: "\u226529\u00B0C or \u226526\u00B0C + UV \u22658", reason: "Paw burns and heatstroke risk for dogs on hot asphalt" },
  { icon: Sunset, name: "Darkness", scope: "Swim only", rule: "Score ramps linearly to 0 over the 30 min following sunset", reason: "After that window, swim score is hard-gated to 0 — no night swimming" },
];

interface PenaltyRow {
  icon: typeof Thermometer;
  factor: string;
  comfort: string;
  bad: string;
  penalty: number;
}

const SWIM_PENALTIES: PenaltyRow[] = [
  { icon: Waves, factor: "Waves", comfort: "0.3m", bad: "1.5m", penalty: -70 },
  { icon: Wind, factor: "Wind gusts", comfort: "7 m/s", bad: "14 m/s", penalty: -15 },
  { icon: Activity, factor: "AQI", comfort: "40", bad: "120", penalty: -25 },
  { icon: Thermometer, factor: "Heat", comfort: "28\u00B0C", bad: "40\u00B0C", penalty: -10 },
  { icon: Thermometer, factor: "Cold", comfort: "18\u00B0C", bad: "10\u00B0C", penalty: -15 },
];

const RUN_PENALTIES: PenaltyRow[] = [
  { icon: Thermometer, factor: "Heat", comfort: "26\u00B0C", bad: "38\u00B0C", penalty: -60 },
  { icon: Sun, factor: "UV index", comfort: "4", bad: "10", penalty: -25 },
  { icon: Activity, factor: "AQI", comfort: "40", bad: "120", penalty: -40 },
  { icon: Wind, factor: "Wind gusts", comfort: "7 m/s", bad: "14 m/s", penalty: -12 },
  { icon: CloudRain, factor: "Rain prob", comfort: "30%", bad: "79%", penalty: -10 },
];

/* ── Penalty table ──────────────────────────────────────────────── */

function PenaltyTable({ rows, accentColor }: { rows: PenaltyRow[]; accentColor: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-0.5 text-[12px]">
      <div className="col-span-4 grid grid-cols-subgrid text-[10px] font-medium text-slate-400 uppercase tracking-wider pb-1 border-b border-white/[0.06]">
        <span></span>
        <span>Factor</span>
        <span className="text-right">Comfort</span>
        <span className="text-right">Bad &rarr; Max</span>
      </div>
      {rows.map((row, i) => {
        const Icon = row.icon;
        return (
          <ScrollReveal
            key={row.factor}
            className="col-span-4 grid grid-cols-subgrid items-center"
            variants={rowVariants}
            custom={i}
          >
            <Icon size={11} className="text-slate-400 mt-0.5" />
            <span className="text-slate-400">{row.factor}</span>
            <span className="text-right font-mono text-slate-200">{row.comfort}</span>
            <span className={`text-right font-mono ${accentColor}`}>
              {row.bad} &rarr; <AnimatedPenalty target={row.penalty} />
            </span>
          </ScrollReveal>
        );
      })}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */

export default function FormulaView() {
  const [formulaRevealed, setFormulaRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFormulaRevealed(true), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-4">
      <motion.h1
        className="text-lg font-bold text-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        Scoring Formula
      </motion.h1>

      {/* Core formula — always above the fold */}
      <motion.div
        className="glass-card rounded-2xl p-5"
        variants={cardVariants}
        initial="hidden"
        animate="show"
        custom={0}
      >
        <div className="flex items-center gap-1.5 mb-4">
          <Calculator size={14} className="text-slate-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            How Scores Work
          </span>
        </div>

        <div className="bg-white/[0.04] rounded-xl p-4 mb-4">
          <motion.p
            className="text-[14px] font-mono text-slate-200 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: formulaRevealed ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.span
              animate={formulaRevealed ? { textShadow: ["0 0 0px transparent", "0 0 12px rgba(96,165,250,0.4)", "0 0 0px transparent"] } : {}}
              transition={{ duration: 1.5, delay: 0.5 }}
            >
              Score = 100 - {"\u03A3"} penalties
            </motion.span>
          </motion.p>
          <p className="text-[12px] text-slate-400 text-center mt-1.5">
            Penalties scale <span className="font-medium text-slate-200">linearly</span> between comfort and bad thresholds
          </p>
          <p className="text-[11px] text-slate-400 text-center mt-1">
            Below comfort {"\u2192"} 0 penalty &middot; Above bad {"\u2192"} max penalty &middot; Between {"\u2192"} proportional
          </p>
        </div>

        {/* Score tiers */}
        <div className="space-y-2 mb-1">
          {TIERS.map((tier, i) => (
            <ScrollReveal
              key={tier.label}
              className="flex items-center gap-2"
              variants={tierVariants}
              custom={i}
            >
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${tier.bg} ${tier.text} shrink-0`}>
                {tier.range} {tier.label}
              </span>
              <span className="text-[12px] text-slate-400">{tier.desc}</span>
            </ScrollReveal>
          ))}
        </div>
      </motion.div>

      {/* Hard Gates */}
      <ScrollReveal className="glass-card rounded-2xl p-5" variants={cardVariants} custom={0}>
        <div className="flex items-center gap-1.5 mb-3">
          <ShieldAlert size={14} className="text-red-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Hard Gates
          </span>
          <span className="text-[11px] text-slate-400 ml-1">Score forced to 0</span>
        </div>
        <div className="space-y-3 ml-1">
          {GATES.map((gate, i) => {
            const Icon = gate.icon;
            return (
              <ScrollReveal
                key={gate.name}
                className="bg-white/[0.04] rounded-xl p-3"
                variants={gateVariants}
                custom={i}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={13} className="text-slate-400 shrink-0" />
                  <span className="text-[13px] text-slate-200 font-medium">{gate.name}</span>
                  <span className="text-[11px] text-red-400 font-medium ml-auto shrink-0">{gate.scope}</span>
                </div>
                <p className="text-[12px] text-slate-400 ml-[21px]">{gate.rule}</p>
                <p className="text-[11px] text-slate-500 ml-[21px] mt-0.5">{gate.reason}</p>
              </ScrollReveal>
            );
          })}
        </div>
      </ScrollReveal>

      {/* Swim Penalties */}
      <ScrollReveal className="glass-card rounded-2xl p-5" variants={cardVariants} custom={0}>
        <div className="flex items-center gap-1.5 mb-3">
          <Waves size={14} className="text-blue-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Swim Penalties
          </span>
        </div>
        <PenaltyTable rows={SWIM_PENALTIES} accentColor="text-amber-400" />
      </ScrollReveal>

      {/* Run Penalties */}
      <ScrollReveal className="glass-card rounded-2xl p-5" variants={cardVariants} custom={0}>
        <div className="flex items-center gap-1.5 mb-3">
          <PersonStanding size={14} className="text-amber-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Run Penalties
          </span>
        </div>
        <PenaltyTable rows={RUN_PENALTIES} accentColor="text-orange-400" />
      </ScrollReveal>

      {/* Dog Modes */}
      <ScrollReveal className="glass-card rounded-2xl p-5" variants={cardVariants} custom={0}>
        <div className="flex items-center gap-1.5 mb-3">
          <Dog size={14} className="text-orange-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Dog Mode Adjustments
          </span>
        </div>
        <div className="space-y-2 text-[13px] text-slate-400">
          <ScrollReveal className="bg-white/[0.04] rounded-xl p-3" variants={bounceIn} custom={0}>
            <p className="font-medium text-slate-200 mb-1">1.2x penalty multiplier</p>
            <p className="text-[12px]">Heat, UV, and AQI penalties are amplified by 1.2x for dog modes. Dogs regulate temperature through panting — less efficient than sweating — making them more vulnerable to heat stress and poor air quality.</p>
          </ScrollReveal>
          <ScrollReveal className="bg-white/[0.04] rounded-xl p-3" variants={bounceIn} custom={1}>
            <p className="font-medium text-slate-200 mb-1">Stricter swim thresholds</p>
            <p className="text-[12px]">Swim + Dog: waves are penalized harder (bad at 1.0m vs 1.5m, max penalty -80 vs -70). Most dogs struggle with wave heights that are manageable for human swimmers.</p>
          </ScrollReveal>
        </div>
      </ScrollReveal>

      {/* Example */}
      <ScrollReveal className="glass-card rounded-2xl p-5" variants={cardVariants} custom={0}>
        <div className="flex items-center gap-1.5 mb-3">
          <Calculator size={14} className="text-slate-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Example Calculation
          </span>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-3 mb-3 space-y-2">
          <ScrollReveal className="" variants={stepVariants} custom={0}>
            <p className="text-[12px] font-medium text-slate-200">Example: 32°C run score</p>
          </ScrollReveal>
          <ScrollReveal className="" variants={stepVariants} custom={1}>
            <p className="text-[12px] text-slate-400">32°C is 50% through the 26-38°C ramp</p>
          </ScrollReveal>
          <ScrollReveal className="" variants={stepVariants} custom={2}>
            <p className="text-[12px] text-slate-400">
              {"\u2192"} penalty = 50% of 60 = <span className="font-mono font-medium text-orange-400">-30</span>
            </p>
          </ScrollReveal>
          <ScrollReveal className="" variants={stepVariants} custom={3}>
            <p className="text-[12px] text-slate-400">
              {"\u2192"} score <span className="font-mono font-medium text-slate-200">70</span> (Good)
            </p>
          </ScrollReveal>
        </div>

        <div className="bg-white/[0.04] rounded-xl p-3 text-[12px] text-slate-400">
          Missing data never penalizes — an info chip is shown instead so you know the score may be less reliable.
        </div>
      </ScrollReveal>
    </div>
  );
}
