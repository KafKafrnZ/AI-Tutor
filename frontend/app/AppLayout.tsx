"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Bot, Target, FileText, TrendingUp, LogOut, User, Sparkles, MoreVertical, ChevronRight, AlertTriangle
} from "lucide-react";

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "AI Tutor", href: "/tutor", icon: Bot },
  { name: "Practice", href: "/practice", icon: Target },
  { name: "Mock Tests", href: "/mock-tests", icon: FileText },
  { name: "Progress", href: "/progress", icon: TrendingUp },
  { name: "Mistake Locker", href: "/error-log", icon: AlertTriangle },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("Student");

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) setUserName(storedName);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-200 font-sans overflow-hidden">
      
      <aside className="w-64 border-r border-white/5 bg-zinc-950/80 backdrop-blur-xl flex flex-col shrink-0 z-20">
        
        <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.5)]">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight uppercase">IBPS SO AI</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-none">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link key={item.name} href={item.href}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                  isActive ? "bg-violet-600/10 text-white font-medium" : "text-zinc-400 hover:text-zinc-200"
                }`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600/0 via-violet-600/5 to-violet-600/0 opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-all duration-1000 pointer-events-none" />
                  {isActive && (
                    <>
                      <motion.div layoutId="activeNav" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-violet-500 rounded-r-full shadow-[0_0_15px_rgba(139,92,246,0.8)]" />
                      <div className="absolute left-3 w-5 h-5 bg-violet-500/20 blur-lg rounded-full" />
                    </>
                  )}
                  <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? "text-violet-400" : "group-hover:text-violet-400 group-hover:scale-110"}`} />
                  <span className="text-[15px] relative z-10">{item.name}</span>
                  {isActive && (
                    <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="ml-auto">
                      <ChevronRight className="w-4 h-4 text-violet-500/50" />
                    </motion.div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full text-left bg-transparent border-none p-0 outline-none focus:outline-none">
              <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group outline-none">
                <Avatar className="w-10 h-10 border border-white/10 ring-2 ring-transparent group-hover:ring-violet-500/50 transition-all">
                  <AvatarFallback className="bg-zinc-800 text-zinc-300 text-sm font-bold">
                    {userName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{userName}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Pro Member</p>
                </div>
                <MoreVertical className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </div>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="start" side="right" className="w-56 bg-zinc-950 border border-white/10 shadow-2xl rounded-2xl p-1.5 backdrop-blur-xl">
              
              {/* REPLACED DropdownMenuLabel with a standard div to bypass the crash */}
              <div className="px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Settings
              </div>

              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem className="text-zinc-200 hover:bg-white/10 hover:text-white cursor-pointer rounded-xl py-3 transition-colors focus:bg-white/10 focus:text-white outline-none">
                <User className="w-4 h-4 mr-3 text-zinc-400" />
                Profile Details
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={handleLogout} className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer rounded-xl py-3 transition-colors focus:bg-rose-500/10 focus:text-rose-400 outline-none">
                <LogOut className="w-4 h-4 mr-3" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-fuchsia-600/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="flex-1 overflow-auto relative z-10 scrollbar-thin scrollbar-thumb-zinc-800">
          {children}
        </div>
      </main>
    </div>
  );
}