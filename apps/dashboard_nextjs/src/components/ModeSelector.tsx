"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [dogWag, setDogWag] = useState(false);

  useEffect(() => {
    if (withDog) {
      setDogWag(true);
      const timer = setTimeout(() => setDogWag(false), 500);
      return () => clearTimeout(timer);
    }
  }, [withDog]);

  return (
    <div className="flex flex-col items-start gap-2">
      {/* Compact segmented pill: Swim | Run */}
      <div className="relative flex bg-white/[0.06] border border-white/[0.06] rounded-full p-0.5">
        <motion.div
          className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full bg-white/[0.12]"
          animate={{ x: activity === "run" ? "calc(100% + 4px)" : "0%" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />

        <motion.button
          role="radio"
          aria-checked={activity === "swim"}
          onClick={() => onChange(compose("swim", withDog))}
          whileTap={{ scale: 0.95 }}
          className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
            activity === "swim" ? "text-white" : "text-slate-400"
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={activity === "swim" ? "swim-active" : "swim-idle"}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center"
            >
              <Waves size={14} strokeWidth={activity === "swim" ? 2 : 1.5} />
            </motion.span>
          </AnimatePresence>
          <span>Swim</span>
        </motion.button>

        <motion.button
          role="radio"
          aria-checked={activity === "run"}
          onClick={() => onChange(compose("run", withDog))}
          whileTap={{ scale: 0.95 }}
          className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
            activity === "run" ? "text-white" : "text-slate-400"
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={activity === "run" ? "run-active" : "run-idle"}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center"
            >
              <PersonStanding size={14} strokeWidth={activity === "run" ? 2 : 1.5} />
            </motion.span>
          </AnimatePresence>
          <span>Run</span>
        </motion.button>
      </div>

      {/* Dog toggle pill with wag animation */}
      <motion.button
        role="switch"
        aria-checked={withDog}
        aria-label="With dog"
        onClick={() => onChange(compose(activity, !withDog))}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer border ${
          withDog
            ? "bg-white/[0.1] border-white/[0.12] text-white"
            : "border-white/[0.06] text-slate-500 hover:text-slate-300"
        }`}
      >
        <span className={dogWag ? "dog-wag" : ""}>
          <Dog size={13} strokeWidth={withDog ? 2 : 1.5} />
        </span>
        <span>Dog</span>
      </motion.button>
    </div>
  );
}
