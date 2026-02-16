"use client";

import { useEffect } from "react";
import { useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";

export function useAnimatedNumber(target: number): MotionValue<string> {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toString());

  useEffect(() => {
    motionValue.set(target);
  }, [target, motionValue]);

  return display;
}
