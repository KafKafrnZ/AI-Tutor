import { ReactNode } from "react";

interface StatBadgeProps {
  icon?: ReactNode;
  label: string;
  color?: "cyan" | "violet" | "amber" | "rose" | "emerald" | "zinc";
}

const colorMap = {
  cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  zinc: "text-zinc-300 bg-white/5 border-white/10",
};

export function StatBadge({ icon, label, color = "zinc" }: StatBadgeProps) {
  return (
    <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 ${colorMap[color]}`}>
      {icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
