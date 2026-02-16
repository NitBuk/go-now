import {
  Calculator, ShieldAlert, Waves, Thermometer,
  Sun, Wind, CloudRain, Dog, Activity, Minus, PersonStanding,
} from "lucide-react";

export default function FormulaPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-white">Scoring Formula</h1>

      {/* Core formula */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-1.5 mb-4">
          <Calculator size={14} className="text-slate-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            How Scores Work
          </span>
        </div>

        <div className="bg-white/[0.04] rounded-xl p-4 mb-4">
          <p className="text-[14px] font-mono text-slate-200 text-center">
            Score = 100 - {"\u03A3"} penalties
          </p>
          <p className="text-[12px] text-slate-400 text-center mt-1.5">
            Penalties scale <span className="font-medium text-slate-200">linearly</span> between comfort and bad thresholds
          </p>
          <p className="text-[11px] text-slate-400 text-center mt-1">
            Below comfort {"\u2192"} 0 penalty &middot; Above bad {"\u2192"} max penalty &middot; Between {"\u2192"} proportional
          </p>
        </div>

        {/* Score tiers */}
        <div className="space-y-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-400/15 text-emerald-400 shrink-0">85-100 Perfect</span>
            <span className="text-[12px] text-slate-400">Ideal conditions — get out there</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-400/15 text-blue-400 shrink-0">70-84 Good</span>
            <span className="text-[12px] text-slate-400">Minor drawbacks, still enjoyable</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-400/15 text-amber-400 shrink-0">45-69 Meh</span>
            <span className="text-[12px] text-slate-400">Noticeable discomfort, go if you really want to</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-orange-400/15 text-orange-400 shrink-0">20-44 Bad</span>
            <span className="text-[12px] text-slate-400">Uncomfortable or potentially unsafe conditions</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-400/15 text-red-400 shrink-0">0-19 Nope</span>
            <span className="text-[12px] text-slate-400">Dangerous or completely unsuitable</span>
          </div>
        </div>
      </div>

      {/* Hard Gates */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <ShieldAlert size={14} className="text-red-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Hard Gates
          </span>
          <span className="text-[11px] text-slate-400 ml-1">Score forced to 0</span>
        </div>
        <div className="space-y-3 ml-1">
          <div className="bg-white/[0.04] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <CloudRain size={13} className="text-slate-400 shrink-0" />
              <span className="text-[13px] text-slate-200 font-medium">Heavy rain</span>
              <span className="text-[11px] text-red-400 font-medium ml-auto shrink-0">All modes</span>
            </div>
            <p className="text-[12px] text-slate-400 ml-[21px]">{"\u2265"}3mm precipitation or {"\u2265"}80% probability</p>
            <p className="text-[11px] text-slate-500 ml-[21px] mt-0.5">Unsafe footing, poor visibility, and hypothermia risk in coastal conditions</p>
          </div>
          <div className="bg-white/[0.04] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wind size={13} className="text-slate-400 shrink-0" />
              <span className="text-[13px] text-slate-200 font-medium">Extreme wind</span>
              <span className="text-[11px] text-red-400 font-medium ml-auto shrink-0">Run only</span>
            </div>
            <p className="text-[12px] text-slate-400 ml-[21px]">Gusts {"\u2265"}14 m/s</p>
            <p className="text-[11px] text-slate-500 ml-[21px] mt-0.5">Sand blasting and balance hazard on the promenade</p>
          </div>
          <div className="bg-white/[0.04] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Dog size={13} className="text-slate-400 shrink-0" />
              <span className="text-[13px] text-slate-200 font-medium">Dog heat</span>
              <span className="text-[11px] text-red-400 font-medium ml-auto shrink-0">Run + Dog</span>
            </div>
            <p className="text-[12px] text-slate-400 ml-[21px]">{"\u2265"}29°C or {"\u2265"}26°C + UV {"\u2265"}8</p>
            <p className="text-[11px] text-slate-500 ml-[21px] mt-0.5">Paw burns and heatstroke risk for dogs on hot asphalt</p>
          </div>
        </div>
      </div>

      {/* Swim Penalties */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Waves size={14} className="text-blue-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Swim Penalties
          </span>
        </div>

        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-0.5 text-[12px]">
          <div className="col-span-4 grid grid-cols-subgrid text-[10px] font-medium text-slate-400 uppercase tracking-wider pb-1 border-b border-white/[0.06]">
            <span></span>
            <span>Factor</span>
            <span className="text-right">Comfort</span>
            <span className="text-right">Bad {"\u2192"} Max</span>
          </div>

          <Waves size={11} className="text-slate-400 mt-0.5" />
          <span className="text-slate-400">Waves</span>
          <span className="text-right font-mono text-slate-200">0.3m</span>
          <span className="text-right font-mono text-orange-400">1.5m {"\u2192"} -70</span>

          <Wind size={11} className="text-slate-400 mt-0.5" />
          <span className="text-slate-400">Wind gusts</span>
          <span className="text-right font-mono text-slate-200">7 m/s</span>
          <span className="text-right font-mono text-amber-400">14 m/s {"\u2192"} -15</span>

          <Activity size={11} className="text-slate-400 mt-0.5" />
          <span className="text-slate-400">AQI</span>
          <span className="text-right font-mono text-slate-200">40</span>
          <span className="text-right font-mono text-amber-400">120 {"\u2192"} -25</span>

          <Thermometer size={11} className="text-slate-400 mt-0.5" />
          <span className="text-slate-400">Heat</span>
          <span className="text-right font-mono text-slate-200">28°C</span>
          <span className="text-right font-mono text-amber-400">40°C {"\u2192"} -10</span>

          <Thermometer size={11} className="text-slate-400 mt-0.5" />
          <span className="text-slate-400">Cold</span>
          <span className="text-right font-mono text-slate-200">18°C</span>
          <span className="text-right font-mono text-amber-400">10°C {"\u2192"} -15</span>
        </div>
      </div>

      {/* Run Penalties */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <PersonStanding size={14} className="text-amber-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Run Penalties
          </span>
        </div>

        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-0.5 text-[12px]">
          <div className="col-span-4 grid grid-cols-subgrid text-[10px] font-medium text-slate-400 uppercase tracking-wider pb-1 border-b border-white/[0.06]">
            <span></span>
            <span>Factor</span>
            <span className="text-right">Comfort</span>
            <span className="text-right">Bad {"\u2192"} Max</span>
          </div>

          <Thermometer size={11} className="text-slate-400 mt-0.5" />
          <span className="text-slate-400">Heat</span>
          <span className="text-right font-mono text-slate-200">26°C</span>
          <span className="text-right font-mono text-red-400">38°C {"\u2192"} -60</span>

          <Sun size={11} className="text-slate-400 mt-0.5" />
          <span className="text-slate-400">UV index</span>
          <span className="text-right font-mono text-slate-200">4</span>
          <span className="text-right font-mono text-amber-400">10 {"\u2192"} -25</span>

          <Activity size={11} className="text-slate-400 mt-0.5" />
          <span className="text-slate-400">AQI</span>
          <span className="text-right font-mono text-slate-200">40</span>
          <span className="text-right font-mono text-orange-400">120 {"\u2192"} -40</span>

          <Wind size={11} className="text-slate-400 mt-0.5" />
          <span className="text-slate-400">Wind gusts</span>
          <span className="text-right font-mono text-slate-200">7 m/s</span>
          <span className="text-right font-mono text-amber-400">14 m/s {"\u2192"} -12</span>

          <CloudRain size={11} className="text-slate-400 mt-0.5" />
          <span className="text-slate-400">Rain prob</span>
          <span className="text-right font-mono text-slate-200">30%</span>
          <span className="text-right font-mono text-amber-400">79% {"\u2192"} -10</span>
        </div>
      </div>

      {/* Dog Modes */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Dog size={14} className="text-orange-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Dog Mode Adjustments
          </span>
        </div>
        <div className="space-y-2 text-[13px] text-slate-400">
          <div className="bg-white/[0.04] rounded-xl p-3">
            <p className="font-medium text-slate-200 mb-1">1.2x penalty multiplier</p>
            <p className="text-[12px]">Heat, UV, and AQI penalties are amplified by 1.2x for dog modes. Dogs regulate temperature through panting — less efficient than sweating — making them more vulnerable to heat stress and poor air quality.</p>
          </div>
          <div className="bg-white/[0.04] rounded-xl p-3">
            <p className="font-medium text-slate-200 mb-1">Stricter swim thresholds</p>
            <p className="text-[12px]">Swim + Dog: waves are penalized harder (bad at 1.0m vs 1.5m, max penalty -80 vs -70). Most dogs struggle with wave heights that are manageable for human swimmers.</p>
          </div>
        </div>
      </div>

      {/* Example */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Calculator size={14} className="text-slate-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Example Calculation
          </span>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-3 mb-3">
          <p className="text-[12px] font-medium text-slate-200 mb-1">Example: 32°C run score</p>
          <p className="text-[12px] text-slate-400">
            32°C is 50% through the 26-38°C ramp {"\u2192"} penalty = 50% of 60 = <span className="font-mono font-medium text-orange-400">-30</span> {"\u2192"} score <span className="font-mono font-medium text-slate-200">70</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Old system: 31°C = 0 penalty, 32°C = -60 penalty (cliff edge)
          </p>
        </div>

        <div className="bg-white/[0.04] rounded-xl p-3 text-[12px] text-slate-400">
          Missing data never penalizes — an info chip is shown instead so you know the score may be less reliable.
        </div>
      </div>
    </div>
  );
}
