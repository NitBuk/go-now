import type { ScoredHour } from "./types";

export type Severity = "good" | "warning" | "danger" | "neutral";

/**
 * Balanced-preset thresholds for condition severity coloring.
 * Based on docs/04_scoring_engine_v1.md penalty thresholds.
 */

export function getFeelsSeverity(feelslike_c: number | null): Severity {
  if (feelslike_c == null) return "neutral";
  if (feelslike_c >= 35 || feelslike_c <= 10) return "danger";
  if (feelslike_c >= 32 || feelslike_c <= 14) return "warning";
  return "good";
}

export function getWavesSeverity(wave_height_m: number | null): Severity {
  if (wave_height_m == null) return "neutral";
  if (wave_height_m >= 1.0) return "danger";
  if (wave_height_m >= 0.6) return "warning";
  return "good";
}

export function getWindSeverity(gust_ms: number | null): Severity {
  if (gust_ms == null) return "neutral";
  if (gust_ms >= 14) return "danger";
  if (gust_ms >= 10) return "warning";
  return "good";
}

export function getUvSeverity(uv_index: number | null): Severity {
  if (uv_index == null) return "neutral";
  if (uv_index >= 8) return "danger";
  if (uv_index >= 6) return "warning";
  return "good";
}

export function getAqiSeverity(eu_aqi: number | null): Severity {
  if (eu_aqi == null) return "neutral";
  if (eu_aqi >= 100) return "danger";
  if (eu_aqi >= 50) return "warning";
  return "good";
}

export function getRainSeverity(precip_prob_pct: number | null, precip_mm: number | null): Severity {
  if (precip_prob_pct == null && precip_mm == null) return "neutral";
  if ((precip_mm != null && precip_mm >= 3.0) || (precip_prob_pct != null && precip_prob_pct >= 80))
    return "danger";
  if (precip_prob_pct != null && precip_prob_pct >= 40) return "warning";
  return "good";
}

export interface ConditionItem {
  key: string;
  label: string;
  value: string;
  detail: string | null;
  severity: Severity;
}

/**
 * All 6 condition items with severity for a given hour.
 */
export function getConditions(hour: ScoredHour): ConditionItem[] {
  return [
    {
      key: "feels",
      label: "Feels",
      value: hour.feelslike_c != null ? `${Math.round(hour.feelslike_c)}°` : "--",
      detail: hour.air_temp_c != null ? `${Math.round(hour.air_temp_c)}° actual` : null,
      severity: getFeelsSeverity(hour.feelslike_c),
    },
    {
      key: "waves",
      label: "Waves",
      value: hour.wave_height_m != null ? `${hour.wave_height_m}m` : "--",
      detail: hour.wave_period_s != null ? `${hour.wave_period_s}s period` : null,
      severity: getWavesSeverity(hour.wave_height_m),
    },
    {
      key: "wind",
      label: "Wind",
      value: hour.gust_ms != null ? `${hour.gust_ms}m/s` : hour.wind_ms != null ? `${hour.wind_ms}m/s` : "--",
      detail: hour.gust_ms != null && hour.wind_ms != null ? `${hour.wind_ms}m/s avg` : null,
      severity: getWindSeverity(hour.gust_ms),
    },
    {
      key: "uv",
      label: "UV",
      value: hour.uv_index != null ? `${hour.uv_index}` : "--",
      detail: hour.uv_index != null
        ? hour.uv_index >= 8 ? "Very High" : hour.uv_index >= 6 ? "High" : hour.uv_index >= 3 ? "Moderate" : "Low"
        : null,
      severity: getUvSeverity(hour.uv_index),
    },
    {
      key: "aqi",
      label: "AQI",
      value: hour.eu_aqi != null ? `${hour.eu_aqi}` : "--",
      detail: hour.eu_aqi != null
        ? hour.eu_aqi <= 50 ? "Good" : hour.eu_aqi <= 100 ? "Moderate" : "Poor"
        : null,
      severity: getAqiSeverity(hour.eu_aqi),
    },
    {
      key: "rain",
      label: "Rain",
      value: hour.precip_prob_pct != null ? `${hour.precip_prob_pct}%` : "--",
      detail: hour.precip_mm != null && hour.precip_mm > 0 ? `${hour.precip_mm}mm` : null,
      severity: getRainSeverity(hour.precip_prob_pct, hour.precip_mm),
    },
  ];
}

/** Tailwind color classes for each severity — only warning/danger are colored */
export function severityColor(severity: Severity): string {
  switch (severity) {
    case "warning": return "text-amber-400";
    case "danger": return "text-red-400";
    default: return "text-slate-400";
  }
}

/** Hex color for SVG / inline styles — only warning/danger are colored */
export function severityHex(severity: Severity): string {
  switch (severity) {
    case "warning": return "#FBBF24";
    case "danger": return "#F87171";
    default: return "#94A3AF";
  }
}
