// Score tier colors from UX spec
const TIER_COLORS = {
  Perfect: "#2DA44E",
  Good: "#57AB5A",
  Meh: "#D29922",
  Bad: "#E16F24",
  Nope: "#F85149",
} as const;

export function scoreHex(label: string): string {
  return TIER_COLORS[label as keyof typeof TIER_COLORS] ?? "#656D76";
}

export function scoreBg(label: string): string {
  switch (label) {
    case "Perfect": return "bg-[#2DA44E]";
    case "Good": return "bg-[#57AB5A]";
    case "Meh": return "bg-[#D29922]";
    case "Bad": return "bg-[#E16F24]";
    case "Nope": return "bg-[#F85149]";
    default: return "bg-[#656D76]";
  }
}

export function scoreText(label: string): string {
  switch (label) {
    case "Perfect": return "text-[#2DA44E]";
    case "Good": return "text-[#57AB5A]";
    case "Meh": return "text-[#D29922]";
    case "Bad": return "text-[#E16F24]";
    case "Nope": return "text-[#F85149]";
    default: return "text-[#656D76]";
  }
}

export function scoreBgLight(label: string): string {
  switch (label) {
    case "Perfect": return "bg-[#2DA44E]/10";
    case "Good": return "bg-[#57AB5A]/10";
    case "Meh": return "bg-[#D29922]/10";
    case "Bad": return "bg-[#E16F24]/10";
    case "Nope": return "bg-[#F85149]/10";
    default: return "bg-[#656D76]/10";
  }
}

// Chip colors from UX spec
export function chipBg(emoji: string): string {
  switch (emoji) {
    case "check": return "bg-[#2DA44E]/10 text-[#2DA44E]";
    case "warning": return "bg-[#D29922]/10 text-[#D29922]";
    case "danger": return "bg-[#F85149]/10 text-[#F85149]";
    case "info": return "bg-[#656D76]/10 text-[#656D76]";
    default: return "bg-[#656D76]/10 text-[#656D76]";
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
    month: "short",
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

export function statusColor(status: string): string {
  switch (status) {
    case "healthy": return "text-[#2DA44E]";
    case "degraded": return "text-[#D29922]";
    case "unhealthy": return "text-[#F85149]";
    default: return "text-[#656D76]";
  }
}
