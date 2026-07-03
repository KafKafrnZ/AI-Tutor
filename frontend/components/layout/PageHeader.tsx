import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getTheme, type GameUniverse } from "@/components/game/universes";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  universe?: GameUniverse;
  eyebrow?: string;
}

export function PageHeader({ title, subtitle, backHref, backLabel = "Back", actions, universe = "neuro", eyebrow }: PageHeaderProps) {
  const theme = getTheme(universe);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        {backHref && (
          <Link 
            href={backHref} 
            className={cn("p-2 -ml-2 rounded-full border border-white/10 bg-white/5 transition-colors text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2", theme.ringClass)}
            aria-label={backLabel}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        )}
        <div>
          <p className={cn("mb-1 text-xs font-black uppercase tracking-[0.24em]", theme.accentClass)}>{eyebrow || theme.eyebrow}</p>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm md:text-base text-zinc-400 mt-1">{subtitle}</p>}
        </div>
      </div>
      
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
