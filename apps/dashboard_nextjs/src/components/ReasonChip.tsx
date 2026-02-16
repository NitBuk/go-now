"use client";

import { Check, AlertTriangle, XCircle, Info } from "lucide-react";
import { chipBg } from "@/lib/score-utils";
import type { ReasonChip as ReasonChipType } from "@/lib/types";

const ICONS = {
  check: Check,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
} as const;

interface ReasonChipProps {
  chip: ReasonChipType;
}

export default function ReasonChip({ chip }: ReasonChipProps) {
  const Icon = ICONS[chip.emoji as keyof typeof ICONS] ?? Info;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[13px] font-medium ${chipBg(chip.emoji)}`}
    >
      <Icon size={13} strokeWidth={2} />
      <span>{chip.text}</span>
    </span>
  );
}
