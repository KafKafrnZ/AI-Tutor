import { ReactNode } from "react";

interface StatBadgeProps {
  icon?: ReactNode;
  label: string;
  color?: "cyan" | "violet" | "amber" | "rose" | "emerald" | "zinc";
}

const colorMap = {
  cyan: "text-primary bg-primary/10 border-primary/20",
  violet: "text-accent bg-accent/10 border-accent/20",
  amber: "text-accent-practice bg-accent-practice/10 border-accent-practice/20",
  rose: "text-accent-mock bg-accent-mock/10 border-accent-mock/20",
  emerald: "text-accent-progress bg-accent-progress/10 border-accent-progress/20",
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
