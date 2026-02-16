"use client";

const BLOB_COLORS: Record<string, string[]> = {
  Perfect: ["rgba(52, 211, 153, 0.07)", "rgba(45, 212, 191, 0.06)", "rgba(16, 185, 129, 0.05)"],
  Good: ["rgba(96, 165, 250, 0.07)", "rgba(56, 189, 248, 0.06)", "rgba(59, 130, 246, 0.05)"],
  Meh: ["rgba(251, 191, 36, 0.06)", "rgba(245, 158, 11, 0.05)", "rgba(234, 179, 8, 0.05)"],
  Bad: ["rgba(251, 146, 60, 0.06)", "rgba(249, 115, 22, 0.05)", "rgba(234, 88, 12, 0.05)"],
  Nope: ["rgba(248, 113, 113, 0.06)", "rgba(239, 68, 68, 0.05)", "rgba(220, 38, 38, 0.05)"],
};

const DEFAULT_COLORS = ["rgba(156, 163, 175, 0.04)", "rgba(148, 163, 184, 0.04)", "rgba(100, 116, 139, 0.03)"];

interface AmbientBackgroundProps {
  label: string;
}

export default function AmbientBackground({ label }: AmbientBackgroundProps) {
  const colors = BLOB_COLORS[label] ?? DEFAULT_COLORS;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* CSS animations run on compositor thread — no JS, no main-thread paint */}
      <div
        className="absolute rounded-full ambient-blob-1"
        style={{
          width: 300,
          height: 300,
          top: "-5%",
          left: "10%",
          background: `radial-gradient(circle, ${colors[0]}, transparent 70%)`,
          willChange: "transform",
        }}
      />
      <div
        className="absolute rounded-full ambient-blob-2"
        style={{
          width: 350,
          height: 350,
          top: "30%",
          right: "-10%",
          background: `radial-gradient(circle, ${colors[1]}, transparent 70%)`,
          willChange: "transform",
        }}
      />
      <div
        className="absolute rounded-full ambient-blob-3"
        style={{
          width: 250,
          height: 250,
          bottom: "10%",
          left: "-5%",
          background: `radial-gradient(circle, ${colors[2]}, transparent 70%)`,
          willChange: "transform",
        }}
      />
    </div>
  );
}
