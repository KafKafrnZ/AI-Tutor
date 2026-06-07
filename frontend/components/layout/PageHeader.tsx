import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, backHref, backLabel = "Back", actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        {backHref && (
          <Link 
            href={backHref} 
            className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors text-zinc-400 hover:text-white"
            aria-label={backLabel}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        )}
        <div>
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
