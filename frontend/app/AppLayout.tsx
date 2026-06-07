"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Bot, Target, FileText, TrendingUp, LogOut, User, Sparkles, MoreVertical, ChevronRight, AlertTriangle, X, Loader2, Menu
} from "lucide-react";

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { API_URL } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

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

  // C-04 FIX: Hide full sidebar + mobile chrome + profile on public auth/landing pages
  const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  
  // Pull store actions (FIX-17 / FIX-18)
  const { setUser, user: storeUser } = useAppStore();

  // Must match server render — localStorage is only available client-side.
  // useEffect updates to real value after hydration to avoid SSR mismatch.
  const [userName, setUserName] = useState("Student");
  const [userEmail, setUserEmail] = useState(() => storeUser?.email || "");
  const [userPlan, setUserPlan] = useState(() => storeUser?.plan || "free");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // FE-6 FIX: Added mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Seed userName from localStorage immediately on mount (client-only, after hydration)
  useEffect(() => {
    queueMicrotask(() => {
      const stored = localStorage.getItem("userName");
      if (stored) setUserName(stored);
    });
  }, []);

  // FE-2 FIX: Removed 'pathname' from dependency array. This now runs EXACTLY ONCE on mount.
  // FIX-17: Centralize user in store so other components don't re-fetch /me constantly.
  useEffect(() => {
    if (isPublic) return;

    const fetchProfile = async () => {
      try {
        // SEC-2 FIX: Removed localStorage token check. Relying purely on httpOnly cookies.
        const response = await fetch(`${API_URL}/me`, {
          method: "GET",
          credentials: "include", 
        });

        if (!response.ok) return;

        const profile = await response.json();
        const name = profile.name || "Student";
        setUserName(name);
        setUserEmail(profile.email || "");
        setUserPlan(profile.plan || "free");
        localStorage.setItem("userName", name);

        // Push to global store (FIX-17)
        setUser({
          id: profile.id,
          name,
          email: profile.email || "",
          plan: profile.plan || "free",
        });
      } catch (error) {
        console.error("Failed to load profile", error);
      }
    };

    fetchProfile();
  }, [isPublic, setUser]);

  // FE-6 FIX: Auto-close mobile menu when route changes
  useEffect(() => {
    queueMicrotask(() => setIsMobileMenuOpen(false));
  }, [pathname]);

  if (isPublic) {
    return <>{children}</>;
  }

  const openProfile = () => {
    setProfileName(userName === "Student" ? "" : userName);
    setProfileError("");
    setIsProfileOpen(true);
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextName = profileName.trim();

    if (!nextName) {
      setProfileError("Name cannot be empty.");
      return;
    }

    setIsSavingProfile(true);
    setProfileError("");

    try {
      const response = await fetch(`${API_URL}/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // SEC-2 FIX
        body: JSON.stringify({ name: nextName }),
      });

      const data = await response.json();

      if (!response.ok) {
        setProfileError(data.detail || "Could not update profile.");
        return;
      }

      setUserName(data.name || nextName);
      setUserEmail(data.email || userEmail);
      setUserPlan(data.plan || userPlan);
      localStorage.setItem("userName", data.name || nextName);

      // Keep Zustand user in sync after edit (FIX-17)
      if (storeUser) {
        setUser({ ...storeUser, name: data.name || nextName });
      }

      setIsProfileOpen(false);
    } catch (error) {
      console.error("Profile update failed", error);
      setProfileError("Cannot connect to the backend right now.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    // Clear local UX cache
    localStorage.removeItem("userName");
    setUserName("Student");
    setUserEmail("");
    setUserPlan("free");
    setIsProfileOpen(false);

    // Clear from global store too (FIX-17)
    setUser(null);
    
    // SEC-2 FIX: Ping the backend to destroy the httpOnly cookie session
    try {
      await fetch(`${API_URL}/logout`, { method: "POST", credentials: "include" });
    } catch (e) {
      console.error("Logout failed", e);
    }

    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-200 font-sans overflow-hidden relative">
      
      {/* FE-6 FIX: Mobile Top Navigation Bar */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-black/60 backdrop-blur-xl border-b border-white/5 z-[60] flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight uppercase">Ascend AI</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 text-zinc-400 hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* SIDEBAR: Now responsive! Hidden off-screen on mobile unless toggled */}
      <aside className={`absolute inset-y-0 left-0 w-64 border-r border-white/5 bg-black/60 backdrop-blur-3xl flex flex-col shrink-0 z-50 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        
        {/* Desktop Branding Logo */}
        <div className="hidden md:flex h-16 items-center px-6 border-b border-white/5 shrink-0">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.5)]">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight uppercase">Ascend AI</span>
          </Link>
        </div>

        {/* Mobile menu spacer */}
        <div className="h-16 md:hidden shrink-0 border-b border-white/5" />

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-none">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link key={item.name} href={item.href}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                  isActive ? "bg-violet-600/20 border border-violet-500/20 text-white font-medium" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                }`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600/0 via-violet-600/10 to-violet-600/0 opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-all duration-1000 pointer-events-none" />
                  {isActive && (
                    <>
                      <motion.div layoutId="activeNav" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-violet-500 rounded-r-full shadow-[0_0_15px_rgba(139,92,246,0.8)]" />
                      <div className="absolute left-3 w-5 h-5 bg-violet-500/30 blur-lg rounded-full" />
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
              <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors group outline-none">
                <Avatar className="w-10 h-10 border border-white/10 ring-2 ring-transparent group-hover:ring-violet-500/50 transition-all">
                  <AvatarFallback className="bg-zinc-800 text-zinc-300 text-sm font-bold">
                    {userName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{userName}</p>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">{userPlan} Member</p>
                </div>
                <MoreVertical className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
              </div>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="start" side="right" className="w-56 bg-zinc-950/90 border border-white/10 shadow-2xl rounded-2xl p-1.5 backdrop-blur-xl">
              <div className="px-3 py-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                Settings
              </div>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={openProfile} className="text-zinc-200 hover:bg-white/10 hover:text-white cursor-pointer rounded-xl py-3 transition-colors outline-none">
                <User className="w-4 h-4 mr-3 text-zinc-400" />
                Profile Details
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={handleLogout} className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer rounded-xl py-3 transition-colors outline-none">
                <LogOut className="w-4 h-4 mr-3" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* MAIN CONTENT: Padded to make room for the mobile header and desktop sidebar */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative w-full h-full md:pl-64 pt-16 md:pt-0">
        <div className="absolute inset-0 z-0 bg-noise opacity-50 pointer-events-none" />
        
        {/* Mobile Sidebar Overlay Dimmer */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden absolute inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <div className="flex-1 overflow-auto relative z-10 scrollbar-thin scrollbar-thumb-zinc-800">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>

      {/* Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <form onSubmit={handleSaveProfile} className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Profile Details</h2>
                <p className="mt-1 text-sm text-zinc-500">Update the name shown in your sidebar.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Name</label>
                <input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition-all focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Email</label>
                <input
                  value={userEmail || "Not loaded"}
                  disabled
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-zinc-500 outline-none"
                />
              </div>
            </div>

            {profileError && <p className="mt-4 text-sm text-rose-400">{profileError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingProfile || !profileName.trim()}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
              >
                {isSavingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
