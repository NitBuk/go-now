import { fetchHealth } from "@/lib/api";
import { statusColor } from "@/lib/score-utils";
import {
  Activity, Clock, Database, Layers, MapPin,
  Calculator, ShieldAlert, Minus, Waves, Thermometer,
  Sun, Wind, CloudRain, Dog,
} from "lucide-react";

export default async function StatusPage() {
  let health;
  let error: string | null = null;

  try {
    health = await fetchHealth();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load health";
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-[#1F2328]">Pipeline Status</h1>

      {error && (
        <div className="bg-[#FFF1E5] border border-[#E16F24]/20 rounded-2xl p-4 text-sm text-[#E16F24]">
          <p className="font-medium">Could not load status</p>
          <p className="text-xs mt-1 opacity-70">{error}</p>
        </div>
      )}

      {health && (
        <>
          {/* Overall Status */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#D0D7DE]">
            <div className="flex items-center gap-1.5 mb-3">
              <Activity size={14} className="text-[#656D76]" />
              <span className="text-[12px] font-medium text-[#656D76] uppercase tracking-wider">
                System Health
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`text-2xl font-bold capitalize ${statusColor(health.status)}`}
              >
                {health.status}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-[#656D76] text-xs">API Version</span>
                <p className="font-medium text-[#1F2328]">{health.version}</p>
              </div>
              <div>
                <span className="text-[#656D76] text-xs">Scoring</span>
                <p className="font-medium text-[#1F2328]">
                  {health.scoring_version}
                </p>
              </div>
            </div>
          </div>

          {/* Forecast Pipeline */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#D0D7DE]">
            <div className="flex items-center gap-1.5 mb-3">
              <Database size={14} className="text-[#656D76]" />
              <span className="text-[12px] font-medium text-[#656D76] uppercase tracking-wider">
                Forecast Pipeline
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-sm text-[#656D76]">
                  <Clock size={13} />
                  <span>Freshness</span>
                </div>
                <span
                  className={`text-sm font-medium ${
                    health.forecast.freshness === "fresh"
                      ? "text-[#2DA44E]"
                      : "text-[#D29922]"
                  }`}
                >
                  {health.forecast.freshness === "fresh" ? "Fresh" : "Stale"} (
                  {health.forecast.age_minutes}m ago)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-sm text-[#656D76]">
                  <Layers size={13} />
                  <span>Ingest Status</span>
                </div>
                <span className="text-sm font-medium text-[#1F2328]">
                  {health.forecast.ingest_status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#656D76]">Hours Available</span>
                <span className="text-sm font-medium text-[#1F2328]">
                  {health.forecast.hours_count}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-sm text-[#656D76]">
                  <MapPin size={13} />
                  <span>Area</span>
                </div>
                <span className="text-sm font-medium text-[#1F2328]">
                  {health.forecast.area_id}
                </span>
              </div>
              {health.forecast.updated_at_utc && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#656D76]">Last Updated</span>
                  <span className="text-sm font-mono text-[#656D76]">
                    {new Date(health.forecast.updated_at_utc).toLocaleString(
                      "en-IL",
                      { timeZone: "Asia/Jerusalem" }
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Grade Formula */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#D0D7DE]">
            <div className="flex items-center gap-1.5 mb-4">
              <Calculator size={14} className="text-[#656D76]" />
              <span className="text-[12px] font-medium text-[#656D76] uppercase tracking-wider">
                Grade Formula (v2)
              </span>
            </div>

            {/* Formula overview */}
            <div className="bg-[#F6F8FA] rounded-xl p-4 mb-4">
              <p className="text-[14px] font-mono text-[#1F2328] text-center">
                Score = 100 - {"\u03A3"} penalties
              </p>
              <p className="text-[12px] text-[#656D76] text-center mt-1.5">
                Penalties scale <span className="font-medium text-[#1F2328]">linearly</span> between comfort and bad thresholds
              </p>
              <p className="text-[11px] text-[#656D76] text-center mt-1">
                Below comfort {"\u2192"} 0 penalty &middot; Above bad {"\u2192"} max penalty &middot; Between {"\u2192"} proportional
              </p>
            </div>

            {/* Labels */}
            <div className="flex gap-1.5 mb-4 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#2DA44E]/10 text-[#2DA44E]">85-100 Perfect</span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#57AB5A]/10 text-[#57AB5A]">70-84 Good</span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#D29922]/10 text-[#D29922]">45-69 Meh</span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#E16F24]/10 text-[#E16F24]">20-44 Bad</span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F85149]/10 text-[#F85149]">0-19 Nope</span>
            </div>

            {/* Hard Gates */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldAlert size={13} className="text-[#F85149]" />
                <span className="text-[13px] font-semibold text-[#1F2328]">Hard Gates</span>
                <span className="text-[11px] text-[#656D76]">Score forced to 0</span>
              </div>
              <div className="space-y-1.5 ml-5">
                <div className="flex items-center gap-2 text-[13px]">
                  <CloudRain size={12} className="text-[#656D76] shrink-0" />
                  <span className="text-[#656D76]">Heavy rain ({"\u2265"}3mm or {"\u2265"}80% prob)</span>
                  <span className="text-[11px] text-[#F85149] font-medium ml-auto shrink-0">All modes</span>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <Wind size={12} className="text-[#656D76] shrink-0" />
                  <span className="text-[#656D76]">Extreme wind (gusts {"\u2265"}14 m/s)</span>
                  <span className="text-[11px] text-[#F85149] font-medium ml-auto shrink-0">Run only</span>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <Dog size={12} className="text-[#656D76] shrink-0" />
                  <span className="text-[#656D76]">Dog heat ({"\u2265"}29°C or {"\u2265"}26°C + UV {"\u2265"}8)</span>
                  <span className="text-[11px] text-[#F85149] font-medium ml-auto shrink-0">Run+Dog</span>
                </div>
              </div>
            </div>

            {/* Linear Ramp Penalties */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Minus size={13} className="text-[#D29922]" />
                <span className="text-[13px] font-semibold text-[#1F2328]">Linear Ramp Penalties</span>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-0.5 ml-5 text-[12px]">
                <div className="col-span-4 grid grid-cols-subgrid text-[10px] font-medium text-[#656D76] uppercase tracking-wider pb-1 border-b border-[#D0D7DE]/50">
                  <span></span>
                  <span>Factor</span>
                  <span className="text-right">Comfort</span>
                  <span className="text-right">Bad {"\u2192"} Max</span>
                </div>

                {/* Swim section */}
                <div className="col-span-4 text-[10px] font-medium text-[#656D76] uppercase tracking-wider pt-2 pb-0.5">Swim</div>

                <Waves size={11} className="text-[#656D76] mt-0.5" />
                <span className="text-[#656D76]">Waves</span>
                <span className="text-right font-mono text-[#1F2328]">0.3m</span>
                <span className="text-right font-mono text-[#E16F24]">1.5m {"\u2192"} -70</span>

                <Wind size={11} className="text-[#656D76] mt-0.5" />
                <span className="text-[#656D76]">Wind gusts</span>
                <span className="text-right font-mono text-[#1F2328]">7 m/s</span>
                <span className="text-right font-mono text-[#D29922]">14 m/s {"\u2192"} -15</span>

                <Activity size={11} className="text-[#656D76] mt-0.5" />
                <span className="text-[#656D76]">AQI</span>
                <span className="text-right font-mono text-[#1F2328]">40</span>
                <span className="text-right font-mono text-[#D29922]">120 {"\u2192"} -25</span>

                <Thermometer size={11} className="text-[#656D76] mt-0.5" />
                <span className="text-[#656D76]">Heat</span>
                <span className="text-right font-mono text-[#1F2328]">28°C</span>
                <span className="text-right font-mono text-[#D29922]">40°C {"\u2192"} -10</span>

                <Thermometer size={11} className="text-[#656D76] mt-0.5" />
                <span className="text-[#656D76]">Cold</span>
                <span className="text-right font-mono text-[#1F2328]">18°C</span>
                <span className="text-right font-mono text-[#D29922]">10°C {"\u2192"} -15</span>

                {/* Run section */}
                <div className="col-span-4 text-[10px] font-medium text-[#656D76] uppercase tracking-wider pt-2 pb-0.5 border-t border-[#D0D7DE]/50 mt-1">Run</div>

                <Thermometer size={11} className="text-[#656D76] mt-0.5" />
                <span className="text-[#656D76]">Heat</span>
                <span className="text-right font-mono text-[#1F2328]">26°C</span>
                <span className="text-right font-mono text-[#F85149]">38°C {"\u2192"} -60</span>

                <Sun size={11} className="text-[#656D76] mt-0.5" />
                <span className="text-[#656D76]">UV index</span>
                <span className="text-right font-mono text-[#1F2328]">4</span>
                <span className="text-right font-mono text-[#D29922]">10 {"\u2192"} -25</span>

                <Activity size={11} className="text-[#656D76] mt-0.5" />
                <span className="text-[#656D76]">AQI</span>
                <span className="text-right font-mono text-[#1F2328]">40</span>
                <span className="text-right font-mono text-[#E16F24]">120 {"\u2192"} -40</span>

                <Wind size={11} className="text-[#656D76] mt-0.5" />
                <span className="text-[#656D76]">Wind gusts</span>
                <span className="text-right font-mono text-[#1F2328]">7 m/s</span>
                <span className="text-right font-mono text-[#D29922]">14 m/s {"\u2192"} -12</span>

                <CloudRain size={11} className="text-[#656D76] mt-0.5" />
                <span className="text-[#656D76]">Rain prob</span>
                <span className="text-right font-mono text-[#1F2328]">30%</span>
                <span className="text-right font-mono text-[#D29922]">79% {"\u2192"} -10</span>
              </div>
            </div>

            {/* Dog modifier */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Dog size={13} className="text-[#656D76]" />
                <span className="text-[13px] font-semibold text-[#1F2328]">Dog Modes</span>
              </div>
              <div className="space-y-1 ml-5 text-[13px] text-[#656D76]">
                <p>1.2x multiplier on heat, UV, and AQI penalties</p>
                <p>Swim+Dog: stricter wave ramp (bad at 1.0m vs 1.5m, max -80)</p>
              </div>
            </div>

            {/* Example */}
            <div className="bg-[#F6F8FA] rounded-xl p-3 mb-3">
              <p className="text-[12px] font-medium text-[#1F2328] mb-1">Example: 32°C run score</p>
              <p className="text-[12px] text-[#656D76]">
                32°C is 50% through the 26-38°C ramp {"\u2192"} penalty = 50% of 60 = <span className="font-mono font-medium text-[#E16F24]">-30</span> {"\u2192"} score <span className="font-mono font-medium text-[#1F2328]">70</span>
              </p>
              <p className="text-[11px] text-[#656D76] mt-0.5">
                Old system: 31°C = 0 penalty, 32°C = -60 penalty (cliff edge)
              </p>
            </div>

            {/* Missing data note */}
            <div className="bg-[#F6F8FA] rounded-xl p-3 text-[12px] text-[#656D76]">
              Missing data never penalizes — an info chip is shown instead so you know the score may be less reliable.
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#D0D7DE]">
            <div className="text-[12px] font-medium text-[#656D76] uppercase tracking-wider mb-3">
              How This Works
            </div>
            <div className="text-[14px] text-[#656D76] space-y-2 leading-relaxed">
              <p>
                Every hour, an ingest worker fetches wave, weather, UV, and air
                quality data from Open-Meteo for the Tel Aviv coast.
              </p>
              <p>
                The data is normalized and stored in three layers: raw JSON
                (Cloud Storage), curated tables (BigQuery), and a serving cache
                (Firestore).
              </p>
              <p>
                The scoring engine evaluates each hour across 4 activity modes
                (swim, swim+dog, run, run+dog), applying hard gates and penalty
                factors to produce a 0-100 score.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
