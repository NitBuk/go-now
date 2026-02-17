import { fetchHealth } from "@/lib/api";
import StatusView from "@/components/StatusView";
import PageTransition from "@/components/PageTransition";

export default async function StatusPage() {
  let health;
  let error: string | null = null;

  try {
    health = await fetchHealth();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load health";
  }

  return (
    <PageTransition>
      {error && (
        <div className="glass-card rounded-2xl p-4 text-sm text-red-300 mb-4">
          <p className="font-medium">Could not load status</p>
          <p className="text-xs mt-1 text-red-400/70">{error}</p>
        </div>
      )}
      {health && <StatusView health={health} />}
    </PageTransition>
  );
}
