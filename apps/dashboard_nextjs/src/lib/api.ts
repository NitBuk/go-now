import type { ScoredForecastResponse, HealthResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const AREA_ID = "tel_aviv_coast";

export async function fetchScores(days: number = 7): Promise<ScoredForecastResponse> {
  const res = await fetch(
    `${API_BASE}/v1/public/scores?area_id=${AREA_ID}&days=${days}`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/v1/public/health`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}
