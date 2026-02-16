export interface ReasonChip {
  factor: string;
  text: string;
  emoji: "check" | "warning" | "danger" | "info";
  penalty: number;
}

export interface ModeScore {
  score: number;
  label: "Perfect" | "Good" | "Meh" | "Bad" | "Nope";
  reasons: ReasonChip[];
  hard_gated: boolean;
}

export interface ScoredHour {
  hour_utc: string;
  wave_height_m: number | null;
  wave_period_s: number | null;
  air_temp_c: number | null;
  feelslike_c: number | null;
  wind_ms: number | null;
  gust_ms: number | null;
  precip_prob_pct: number | null;
  precip_mm: number | null;
  uv_index: number | null;
  eu_aqi: number | null;
  pm10: number | null;
  pm2_5: number | null;
  scores: {
    swim_solo: ModeScore;
    swim_dog: ModeScore;
    run_solo: ModeScore;
    run_dog: ModeScore;
  };
}

export interface ScoredForecastResponse {
  area_id: string;
  updated_at_utc: string;
  provider: string;
  freshness: "fresh" | "stale";
  forecast_age_minutes: number;
  horizon_days: number;
  scoring_version: string;
  hours: ScoredHour[];
}

export interface HealthForecast {
  area_id: string;
  updated_at_utc: string;
  age_minutes: number;
  freshness: "fresh" | "stale";
  ingest_status: string;
  hours_count: number;
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  scoring_version: string;
  forecast: HealthForecast;
  timestamp_utc: string;
}

export type ActivityMode = "swim_solo" | "swim_dog" | "run_solo" | "run_dog";

export const MODE_LABELS: Record<ActivityMode, string> = {
  swim_solo: "Swim",
  swim_dog: "Swim + Dog",
  run_solo: "Run",
  run_dog: "Run + Dog",
};

// Microcopy vibe lines from the UX spec
export const VIBE_LINES: Record<string, string[]> = {
  Perfect: [
    "The coast is calling. Go now.",
    "Sea glass smooth. You know what to do.",
  ],
  Good: [
    "Pretty good out there. A few things to know.",
    "Not bad at all. Check the details.",
  ],
  Meh: [
    "Could go either way. Your call.",
    "Meh, but you've seen worse.",
  ],
  Bad: [
    "Hard pass today. Netflix won't judge.",
    "The coast says not today. Trust it.",
  ],
  Nope: [
    "Somewhere between 'no' and 'absolutely not.'",
  ],
};
