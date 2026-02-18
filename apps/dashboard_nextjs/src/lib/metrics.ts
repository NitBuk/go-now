import { Thermometer, Waves, Wind, Sun, CloudRain, Activity } from "lucide-react";
import type { ScoredHour, ActivityMode } from "./types";

export type MetricKey = "score" | "temp" | "uv" | "wind" | "waves" | "rain" | "aqi";

export const METRICS: { key: MetricKey; label: string; icon: typeof Thermometer; unit: string; color: string }[] = [
  { key: "score", label: "Score", icon: Activity, unit: "", color: "#60A5FA" },
  { key: "temp", label: "Temperature", icon: Thermometer, unit: "°", color: "#FB923C" },
  { key: "uv", label: "UV Index", icon: Sun, unit: "", color: "#FBBF24" },
  { key: "wind", label: "Wind", icon: Wind, unit: "m/s", color: "#34D399" },
  { key: "waves", label: "Waves", icon: Waves, unit: "m", color: "#60A5FA" },
  { key: "rain", label: "Rain", icon: CloudRain, unit: "%", color: "#A78BFA" },
  { key: "aqi", label: "Air Quality", icon: Activity, unit: "", color: "#F87171" },
];

export function getValue(hour: ScoredHour, metric: MetricKey, mode: ActivityMode): number | null {
  switch (metric) {
    case "score": return hour.scores[mode].score;
    case "temp": return hour.feelslike_c;
    case "uv": return hour.uv_index;
    case "wind": return hour.wind_ms;
    case "waves": return hour.wave_height_m;
    case "rain": return hour.precip_prob_pct;
    case "aqi": return hour.eu_aqi;
  }
}

export function formatValue(val: number | null, metric: MetricKey): string {
  if (val == null) return "--";
  const metricDef = METRICS.find((m) => m.key === metric)!;
  if (metric === "waves") return `${val.toFixed(1)}${metricDef.unit}`;
  return `${Math.round(val)}${metricDef.unit}`;
}
