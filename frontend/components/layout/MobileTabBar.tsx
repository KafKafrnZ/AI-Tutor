"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bot, Target, ClipboardCheck, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tutor", href: "/tutor", icon: Bot },
  { label: "Practice", href: "/practice", icon: Target },
  { label: "Mocks", href: "/mock-tests", icon: ClipboardCheck },
];

interface MobileTabBarProps {
  onMenuClick: () => void;
}

export default function MobileTabBar({ onMenuClick }: MobileTabBarProps) {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-bg/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-2 z-[60] pb-safe">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = tab.icon;
        return (
          <Link key={tab.label} href={tab.href} className="flex flex-col items-center justify-center w-full h-full space-y-1">
            <Icon className={cn("w-6 h-6 transition-colors", isActive ? "text-primary" : "text-zinc-500")} />
            <span className={cn("text-[10px] font-medium transition-colors", isActive ? "text-primary" : "text-zinc-500")}>
              {tab.label}
            </span>
          </Link>
        );
      })}
      <button onClick={onMenuClick} className="flex flex-col items-center justify-center w-full h-full space-y-1 text-zinc-500 hover:text-white transition-colors">
        <Menu className="w-6 h-6" />
        <span className="text-[10px] font-medium">More</span>
      </button>
    </div>
  );
}
