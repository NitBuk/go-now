// Vivid score tier colors for dark mode
const TIER_COLORS = {
  Perfect: "#34D399", // emerald-400
  Good: "#60A5FA",    // blue-400
  Meh: "#FBBF24",     // amber-400
  Bad: "#FB923C",     // orange-400
  Nope: "#F87171",    // red-400
} as const;

// Glow colors (more saturated for dark bg)
const GLOW_COLORS = {
  Perfect: "rgba(52, 211, 153, 0.35)",
  Good: "rgba(96, 165, 250, 0.35)",
  Meh: "rgba(251, 191, 36, 0.3)",
  Bad: "rgba(251, 146, 60, 0.3)",
  Nope: "rgba(248, 113, 113, 0.3)",
} as const;

// Gradient pairs for score circles
const TIER_GRADIENTS = {
  Perfect: "from-emerald-400 to-teal-300",
  Good: "from-blue-400 to-cyan-300",
  Meh: "from-amber-400 to-yellow-300",
  Bad: "from-orange-400 to-amber-300",
  Nope: "from-red-400 to-rose-300",
} as const;

export function scoreHex(label: string): string {
  return TIER_COLORS[label as keyof typeof TIER_COLORS] ?? "#9CA3AF";
}

export function scoreGlow(label: string): string {
  return GLOW_COLORS[label as keyof typeof GLOW_COLORS] ?? "rgba(156, 163, 175, 0.2)";
}

export function scoreGradient(label: string): string {
  return TIER_GRADIENTS[label as keyof typeof TIER_GRADIENTS] ?? "from-gray-400 to-gray-300";
}

export function scoreBg(label: string): string {
  switch (label) {
    case "Perfect": return "bg-emerald-400";
    case "Good": return "bg-blue-400";
    case "Meh": return "bg-amber-400";
    case "Bad": return "bg-orange-400";
    case "Nope": return "bg-red-400";
    default: return "bg-gray-400";
  }
}

export function scoreText(label: string): string {
  switch (label) {
    case "Perfect": return "text-emerald-400";
    case "Good": return "text-blue-400";
    case "Meh": return "text-amber-400";
    case "Bad": return "text-orange-400";
    case "Nope": return "text-red-400";
    default: return "text-gray-400";
  }
}

export function scoreBgLight(label: string): string {
  switch (label) {
    case "Perfect": return "bg-emerald-400/10";
    case "Good": return "bg-blue-400/10";
    case "Meh": return "bg-amber-400/10";
    case "Bad": return "bg-orange-400/10";
    case "Nope": return "bg-red-400/10";
    default: return "bg-gray-400/10";
  }
}

// Chip colors for dark mode
export function chipBg(emoji: string): string {
  switch (emoji) {
    case "check": return "bg-emerald-400/15 text-emerald-300";
    case "warning": return "bg-amber-400/15 text-amber-300";
    case "danger": return "bg-red-400/15 text-red-300";
    case "info": return "bg-slate-400/15 text-slate-300";
    default: return "bg-slate-400/15 text-slate-300";
  }
}

export function formatHour(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-IL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jerusalem",
  });
}

export function formatDay(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateInTZ = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const nowInTZ = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const tomorrowInTZ = new Date(tomorrow.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));

  if (dateInTZ.toDateString() === nowInTZ.toDateString()) return "Today";
  if (dateInTZ.toDateString() === tomorrowInTZ.toDateString()) return "Tomorrow";

  return date.toLocaleDateString("en-IL", {
    weekday: "short",
    day: "numeric",
    timeZone: "Asia/Jerusalem",
  });
}

export function formatDayLong(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateInTZ = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const nowInTZ = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const tomorrowInTZ = new Date(tomorrow.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));

  if (dateInTZ.toDateString() === nowInTZ.toDateString()) return "Today";
  if (dateInTZ.toDateString() === tomorrowInTZ.toDateString()) return "Tomorrow";

  return date.toLocaleDateString("en-IL", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Jerusalem",
  });
}

export function freshnessLabel(ageMinutes: number): string {
  if (ageMinutes < 60) return `${ageMinutes}m ago`;
  return `${Math.round(ageMinutes / 60)}h ago`;
}

export function freshnessState(ageMinutes: number): "fresh" | "stale" | "very-stale" {
  if (ageMinutes < 90) return "fresh";
  if (ageMinutes < 180) return "stale";
  return "very-stale";
}

const BG_TINT_COLORS = {
  Perfect: "rgba(52, 211, 153, 0.07)",
  Good: "rgba(96, 165, 250, 0.07)",
  Meh: "rgba(251, 191, 36, 0.05)",
  Bad: "rgba(251, 146, 60, 0.06)",
  Nope: "rgba(248, 113, 113, 0.06)",
} as const;

export function scoreBgTint(label: string): string {
  return BG_TINT_COLORS[label as keyof typeof BG_TINT_COLORS] ?? "rgba(156, 163, 175, 0.04)";
}

export function statusColor(status: string): string {
  switch (status) {
    case "healthy": return "text-emerald-400";
    case "degraded": return "text-amber-400";
    case "unhealthy": return "text-red-400";
    default: return "text-gray-400";
  }
}
