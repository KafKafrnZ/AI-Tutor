"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bot, Target, ClipboardCheck, Menu } from "lucide-react";
import { type UniverseTheme } from "@/components/game/universes";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "War", href: "/dashboard", icon: LayoutDashboard },
  { label: "Lab", href: "/tutor", icon: Bot },
  { label: "Arena", href: "/practice", icon: Target },
  { label: "Trial", href: "/mock-tests", icon: ClipboardCheck },
];

interface MobileTabBarProps {
  onMenuClick: () => void;
  universe?: UniverseTheme;
}

export default function MobileTabBar({ onMenuClick, universe }: MobileTabBarProps) {
  const pathname = usePathname();

  return (
    <div className={cn("md:hidden fixed bottom-0 inset-x-0 h-16 bg-bg/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-2 z-[60] pb-[env(safe-area-inset-bottom,0px)]", universe?.borderClass)}>
      {TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = tab.icon;
        return (
          <Link key={tab.label} href={tab.href} className="flex flex-col items-center justify-center w-full h-full space-y-1">
            <Icon className={cn("w-6 h-6 transition-colors", isActive ? (universe?.accentClass ?? "text-primary") : "text-zinc-500")} />
            <span className={cn("text-[10px] font-medium transition-colors", isActive ? (universe?.accentClass ?? "text-primary") : "text-zinc-500")}>
              {tab.label}
            </span>
          </Link>
        );
      })}
      <button type="button" onClick={onMenuClick} className="flex flex-col items-center justify-center w-full h-full space-y-1 text-zinc-500 hover:text-white transition-colors">
        <Menu className="w-6 h-6" />
        <span className="text-[10px] font-medium">Pause</span>
      </button>
    </div>
  );
}
