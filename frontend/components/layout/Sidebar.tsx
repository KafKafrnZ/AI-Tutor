"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  ChevronRight,
  ClipboardCheck,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreVertical,
  Target,
  TrendingUp,
  User,
  X,
} from "lucide-react";

import Logo from "@/components/Logo";
import { type UniverseTheme } from "@/components/game/universes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Tutor", href: "/tutor", icon: Bot },
  { label: "Practice", href: "/practice", icon: Target },
  { label: "Tests", href: "/mock-tests", icon: ClipboardCheck },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Progress", href: "/progress", icon: TrendingUp },
  { label: "Mistakes", href: "/error-log", icon: AlertTriangle },
] as const;

type SidebarProps = {
  appName?: string;
  userName: string;
  userPlan: string;
  isMobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  universe?: UniverseTheme;
};

export default function Sidebar({
  appName = "Ascend AI",
  userName,
  userPlan,
  isMobileOpen,
  onMobileOpenChange,
  onOpenProfile,
  onLogout,
  universe,
}: SidebarProps) {
  const pathname = usePathname();
  const initials = userName.trim().slice(0, 2).toUpperCase() || "ST";

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-[60] flex h-16 items-center justify-between border-b border-white/10 bg-bg/85 px-5 backdrop-blur-xl md:hidden">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Logo className="size-8 shrink-0 text-primary drop-shadow-[0_0_16px_rgba(0,212,255,0.45)]" />
          <span className="truncate font-display text-lg font-bold tracking-tight text-white">Neuro-OS</span>
        </Link>
        <button
          type="button"
          onClick={() => onMobileOpenChange(!isMobileOpen)}
          className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={isMobileOpen ? "Close navigation" : "Open navigation"}
        >
          {isMobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {isMobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm md:hidden"
          onClick={() => onMobileOpenChange(false)}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-white/10 bg-bg/86 text-zinc-200 shadow-2xl shadow-black/40 backdrop-blur-3xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="hidden h-16 shrink-0 items-center border-b border-white/10 px-6 md:flex">
          <Link href="/" className="group flex min-w-0 items-center gap-3 transition-opacity hover:opacity-85">
            <Logo className="size-9 shrink-0 text-primary drop-shadow-[0_0_18px_rgba(0,212,255,0.45)]" />
            <div className="min-w-0">
              <span className="block truncate font-display text-xl font-bold tracking-tight text-white">{appName}</span>
              <span className="block truncate text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">{universe?.label ?? "Neuro-OS"}</span>
            </div>
          </Link>
        </div>

        <div className="h-16 shrink-0 border-b border-white/10 md:hidden" />

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link key={item.href} href={item.href} onClick={() => onMobileOpenChange(false)}>
                <div
                  className={cn(
                    "group relative flex items-center gap-3 overflow-hidden rounded-xl px-4 py-3 text-[15px] transition-all",
                    isActive
                      ? "border border-primary/20 bg-primary/[0.12] font-semibold text-white shadow-[inset_0_0_28px_rgba(0,212,255,0.07)]"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                  )}
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100" />
                  {isActive && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_16px_rgba(0,212,255,0.85)]" />}
                  <Icon className={cn("relative z-10 size-5 transition-colors", isActive ? "text-primary" : "group-hover:text-primary")} />
                  <span className="relative z-10 min-w-0 flex-1 truncate">{item.label}</span>
                  {isActive && <ChevronRight className="relative z-10 size-4 text-primary/70" />}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
              <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/10">
                <Avatar className="size-10 border border-primary/20 ring-2 ring-transparent transition-all group-hover:ring-primary/40">
                  <AvatarFallback className="bg-surface text-sm font-bold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{userName}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{userPlan} operator</p>
                </div>
                <MoreVertical className="size-4 text-zinc-500" />
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" side="right" className="w-56 rounded-2xl border border-white/10 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-xl">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Settings
              </div>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={onOpenProfile} className="cursor-pointer rounded-xl py-3 text-zinc-200 outline-none transition-colors hover:bg-white/10 hover:text-white">
                <User className="mr-3 size-4 text-zinc-400" />
                Aug Lab
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={onLogout} className="cursor-pointer rounded-xl py-3 text-accent-mock outline-none transition-colors hover:bg-accent-mock/10 hover:text-accent-mock">
                <LogOut className="mr-3 size-4" />
                Flatline Session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
