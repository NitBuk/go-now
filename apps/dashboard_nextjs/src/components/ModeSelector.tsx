"use client";

import { Waves, Dog, PersonStanding } from "lucide-react";
import { MODE_LABELS, type ActivityMode } from "@/lib/types";

interface ModeSelectorProps {
  selected: ActivityMode;
  onChange: (mode: ActivityMode) => void;
}

const MODES: { key: ActivityMode; icon: typeof Waves; subIcon?: typeof Dog }[] = [
  { key: "swim_solo", icon: Waves },
  { key: "swim_dog", icon: Waves, subIcon: Dog },
  { key: "run_solo", icon: PersonStanding },
  { key: "run_dog", icon: PersonStanding, subIcon: Dog },
];

export default function ModeSelector({ selected, onChange }: ModeSelectorProps) {
  return (
    <div className="flex gap-1 p-1 bg-[#F6F8FA] rounded-xl">
      {MODES.map(({ key, icon: Icon, subIcon: SubIcon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
            selected === key
              ? "bg-white text-[#1F2328] shadow-sm"
              : "text-[#656D76] hover:text-[#1F2328]"
          }`}
        >
          <div className="flex items-center gap-0.5">
            <Icon size={18} strokeWidth={selected === key ? 2 : 1.5} />
            {SubIcon && <SubIcon size={14} strokeWidth={selected === key ? 2 : 1.5} />}
          </div>
          <span>{MODE_LABELS[key]}</span>
        </button>
      ))}
    </div>
  );
}
