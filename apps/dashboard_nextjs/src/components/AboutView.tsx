"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView, type Variants } from "framer-motion";
import {
  Layers,
  Zap,
  Github,
  ChevronRight,
  PawPrint,
  Waves,
  PersonStanding,
} from "lucide-react";
import Link from "next/link";

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

/* ── Variant definitions ────────────────────────────────────────── */

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
    transition: { delay: i * 0.08, duration: 0.35, ease: "easeOut" as const },
  }),
};

/* ── Score circle ───────────────────────────────────────────────── */

function ScoreCircle({ score }: { score: number }) {
  return (
    <motion.div
      className="relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #059669 0%, #34D399 100%)" }}
      animate={{ boxShadow: ["0 0 0px rgba(52,211,153,0)", "0 0 16px rgba(52,211,153,0.35)", "0 0 0px rgba(52,211,153,0)"] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="text-lg font-bold text-white tabular-nums">{score}</span>
    </motion.div>
  );
}

/* ── Mode score row ─────────────────────────────────────────────── */

const MODES = [
  { icon: Waves, label: "Swim solo", score: 87, color: "text-emerald-400", bg: "bg-emerald-400/15" },
  { icon: Waves, label: "Swim + dog", score: 74, color: "text-blue-400", bg: "bg-blue-400/15" },
  { icon: PersonStanding, label: "Run solo", score: 91, color: "text-emerald-400", bg: "bg-emerald-400/15" },
  { icon: PersonStanding, label: "Run + dog", score: 65, color: "text-amber-400", bg: "bg-amber-400/15" },
];

const TIERS = [
  { label: "Perfect 85+", color: "text-emerald-400", bg: "bg-emerald-400/15" },
  { label: "Good 70", color: "text-blue-400", bg: "bg-blue-400/15" },
  { label: "Meh 45", color: "text-amber-400", bg: "bg-amber-400/15" },
  { label: "Bad 20", color: "text-orange-400", bg: "bg-orange-400/15" },
  { label: "Nope 0", color: "text-red-400", bg: "bg-red-400/15" },
];

const DOG_REASONS = [
  "Overheats faster than humans",
  "More sensitive to air quality",
  "Can\u2019t tell you when they\u2019ve had enough",
];

/* ── Main component ─────────────────────────────────────────────── */

export default function AboutView() {
  return (
    <div className="space-y-4">
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
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-3">
              Built by one person
            </p>
            <p className="text-base italic text-slate-200 mb-3">
              &ldquo;Four apps, one decision. Every time.&rdquo;
            </p>
            <p className="text-sm text-slate-300 mb-2">
              Every morning before heading to the beach I&rsquo;d open four apps: waves, weather, UV, air quality. Then mentally combine them into a single answer.
            </p>
            <p className="text-sm text-slate-400 mb-3">
              There&rsquo;s no reason a human should have to do that math.
            </p>
            <p className="text-sm font-medium text-white">So I built Go Now.</p>
          </div>
          <ScoreCircle score={87} />
        </div>
      </motion.div>

      {/* 2. The Dog Layer card */}
      <ScrollReveal className="glass-card rounded-2xl p-5" variants={cardVariants} custom={1}>
        <div className="flex items-center gap-1.5 mb-3">
          <PawPrint size={14} className="text-slate-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            The Dog Layer
          </span>
        </div>
        <p className="text-sm text-slate-300 mb-3">Bringing my dog made it worse.</p>
        <div className="space-y-2 mb-3">
          {DOG_REASONS.map((reason, i) => (
            <ScrollReveal key={reason} className="flex items-center gap-2" variants={rowVariants} custom={i}>
              <span className="w-1 h-1 rounded-full bg-slate-500 shrink-0" />
              <span className="text-sm text-slate-400">{reason}</span>
            </ScrollReveal>
          ))}
        </div>
        <p className="text-sm text-slate-400">Same scattered data, higher stakes.</p>
      </ScrollReveal>

      {/* 3. Four Modes card */}
      <ScrollReveal className="glass-card rounded-2xl p-5" variants={cardVariants} custom={2}>
        <div className="flex items-center gap-1.5 mb-3">
          <Layers size={14} className="text-slate-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Four Modes
          </span>
        </div>
        <p className="text-sm text-slate-400 mb-3">The dog modes use stricter thresholds.</p>
        <div className="space-y-2">
          {MODES.map((mode, i) => {
            const Icon = mode.icon;
            return (
              <ScrollReveal key={mode.label} className="flex items-center gap-2" variants={rowVariants} custom={i}>
                <Icon size={13} className="text-slate-400 shrink-0" />
                <span className="text-sm text-slate-300 flex-1">{mode.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums ${mode.bg} ${mode.color}`}>
                  {mode.score}
                </span>
              </ScrollReveal>
            );
          })}
        </div>
      </ScrollReveal>

      {/* 4. How It Scores card */}
      <ScrollReveal className="glass-card rounded-2xl p-5" variants={cardVariants} custom={3}>
        <div className="flex items-center gap-1.5 mb-3">
          <Zap size={14} className="text-slate-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            How It Scores
          </span>
        </div>
        <p className="text-sm text-slate-300 mb-3">
          Every hour, wave&nbsp;/&nbsp;weather&nbsp;/&nbsp;UV&nbsp;/&nbsp;AQI&nbsp;/&nbsp;wind&nbsp;/&nbsp;rain data &rarr; scoring engine &rarr; 0&ndash;100.
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {TIERS.map((tier) => (
            <span key={tier.label} className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${tier.bg} ${tier.color}`}>
              {tier.label}
            </span>
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
      <ScrollReveal className="glass-card rounded-2xl p-5" variants={cardVariants} custom={4}>
        <div className="flex items-center gap-1.5 mb-3">
          <Github size={14} className="text-slate-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Open Source
          </span>
        </div>
        <p className="text-sm text-slate-400 mb-3">
          Next.js &middot; FastAPI &middot; Python &middot; GCP
        </p>
        <a
          href="https://github.com/nitzanber/go-now"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-sm text-slate-200 hover:bg-white/[0.1] transition-colors"
        >
          <Github size={13} />
          View on GitHub
        </a>
      </ScrollReveal>
    </div>
  );
}
