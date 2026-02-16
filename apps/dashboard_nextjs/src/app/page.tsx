import { fetchScores } from "@/lib/api";
import ForecastView from "@/components/ForecastView";
import FreshnessBadge from "@/components/FreshnessBadge";

export default async function ForecastPage() {
  let data;
  let error: string | null = null;

  try {
    data = await fetchScores(7);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load forecast";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Tel Aviv Coast</h1>
        {data && (
          <FreshnessBadge
            freshness={data.freshness}
            ageMinutes={data.forecast_age_minutes}
          />
        )}
      </div>

      {error && (
        <div className="glass-card rounded-xl p-4 text-sm text-red-300">
          <p className="font-medium">Could not load forecast</p>
          <p className="text-xs mt-1 text-red-400/70">{error}</p>
          <p className="text-xs mt-2 text-slate-400">
            Make sure the API is running at{" "}
            {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}
          </p>
        </div>
      )}

      {data && <ForecastView data={data} />}
    </div>
  );
}
