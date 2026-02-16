"use client";

import { motion } from "framer-motion";
import { Waves, Dog, PersonStanding } from "lucide-react";
import type { ActivityMode } from "@/lib/types";

interface ModeSelectorProps {
  selected: ActivityMode;
  onChange: (mode: ActivityMode) => void;
}

function compose(act: "swim" | "run", dog: boolean): ActivityMode {
  return `${act}_${dog ? "dog" : "solo"}` as ActivityMode;
}

export default function ModeSelector({ selected, onChange }: ModeSelectorProps) {
  const activity = selected.startsWith("swim") ? "swim" : "run";
  const withDog = selected.endsWith("_dog");

  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl bg-white/[0.06] border border-white/[0.06]">
      {/* Segmented control: Swim | Run */}
      <div className="relative flex" role="radiogroup" aria-label="Activity type">
        {/* Sliding indicator with layout animation */}
        <motion.div
          className="absolute top-0 h-full w-1/2 p-0.5"
          animate={{ x: activity === "run" ? "100%" : "0%" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <div className="h-full w-full rounded-lg bg-white/[0.12] shadow-sm shadow-white/5" />
        </motion.div>

        <motion.button
          role="radio"
          aria-checked={activity === "swim"}
          onClick={() => onChange(compose("swim", withDog))}
          whileTap={{ scale: 0.97 }}
          className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 ${
            activity === "swim" ? "text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Waves size={18} strokeWidth={activity === "swim" ? 2 : 1.5} />
          <span>Swim</span>
        </motion.button>

        <motion.button
          role="radio"
          aria-checked={activity === "run"}
          onClick={() => onChange(compose("run", withDog))}
          whileTap={{ scale: 0.97 }}
          className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 ${
            activity === "run" ? "text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <PersonStanding size={18} strokeWidth={activity === "run" ? 2 : 1.5} />
          <span>Run</span>
        </motion.button>
      </div>

      {/* Dog toggle pill */}
      <div className="flex justify-end">
        <motion.button
          role="switch"
          aria-checked={withDog}
          aria-label="With dog"
          onClick={() => onChange(compose(activity, !withDog))}
          whileTap={{ scale: 0.97 }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 ${
            withDog
              ? "bg-white/[0.12] text-white shadow-sm shadow-white/5"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
          }`}
        >
          <Dog size={16} strokeWidth={withDog ? 2 : 1.5} />
          <span>With Dog</span>
        </motion.button>
      </div>
    </div>
  );
}
