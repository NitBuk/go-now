"use client";

import { useMemo, useSyncExternalStore, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import swimData from "../../public/lottie/swim.json";
import runData from "../../public/lottie/run.json";
import dogData from "../../public/lottie/dog.json";

interface ActivityCharacterProps {
  activity: "swim" | "run";
  withDog: boolean;
  accentColor: string;
}

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

const KEEP_WHITE = ["goggle", "water_line", "speed_line"];

function tintAnimation(
  data: Record<string, unknown>,
  color: [number, number, number],
): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(data));
  function walkShapes(items: Record<string, unknown>[], skipTint = false) {
    for (const item of items) {
      const name = (item.nm as string) ?? "";
      const skip =
        skipTint || KEEP_WHITE.some((prefix) => name.startsWith(prefix));
      if (
        item.ty === "fl" &&
        item.c &&
        typeof item.c === "object" &&
        !skip
      ) {
        const c = item.c as Record<string, unknown>;
        c.k = [...color, 1];
      }
      if (
        item.ty === "gr" &&
        Array.isArray((item as Record<string, unknown>).it)
      ) {
        walkShapes(item.it as Record<string, unknown>[], skip);
      }
    }
  }
  for (const layer of (copy.layers || []) as Record<string, unknown>[]) {
    if (Array.isArray(layer.shapes)) {
      walkShapes(layer.shapes as Record<string, unknown>[]);
    }
  }
  return copy;
}

function SwimBuoys() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute w-3 h-3 rounded-full bg-orange-400 border-2 border-white"
        style={{ bottom: "38%", left: "2px" }}
      />
      <div
        className="absolute w-3 h-3 rounded-full bg-white border-2 border-orange-400"
        style={{ bottom: "38%", right: "2px" }}
      />
    </div>
  );
}

function RunShoes() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute h-2 w-4 rounded bg-white opacity-90"
        style={{ bottom: "2px", left: "8px" }}
      />
      <div
        className="absolute h-2 w-4 rounded bg-white opacity-90"
        style={{ bottom: "2px", right: "4px" }}
      />
    </div>
  );
}

export default function ActivityCharacter({
  activity,
  withDog,
  accentColor,
}: ActivityCharacterProps) {
  const reducedMotion = useSyncExternalStore(
    useCallback((cb: () => void) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    }, []),
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  const rgb = useMemo(() => hexToRgb01(accentColor), [accentColor]);

  const personData = useMemo(
    () =>
      tintAnimation(
        activity === "swim" ? swimData : runData,
        rgb,
      ) as Record<string, unknown>,
    [activity, rgb],
  );

  const tintedDogData = useMemo(
    () => tintAnimation(dogData, rgb) as Record<string, unknown>,
    [rgb],
  );

  return (
    <div className="flex items-end gap-0">
      <AnimatePresence mode="wait">
        {withDog && (
          <motion.div
            key={activity}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-[64px] h-[38px] -mr-6 mb-5"
          >
            <Lottie
              animationData={tintedDogData}
              loop={!reducedMotion}
              autoplay={!reducedMotion}
              style={{ width: "100%", height: "100%" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={activity}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-[72px] h-[104px]"
        >
          <Lottie
            animationData={personData}
            loop={!reducedMotion}
            autoplay={!reducedMotion}
            style={{ width: "100%", height: "100%" }}
          />
          {activity === "swim" && <SwimBuoys />}
          {activity === "run" && <RunShoes />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
