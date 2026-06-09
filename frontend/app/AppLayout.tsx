"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import MobileTabBar from "@/components/layout/MobileTabBar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { GameAtmosphere, HudBar } from "@/components/game/GamePrimitives";
import { universeForPath } from "@/components/game/universes";
import { API_URL } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  const { setUser, user: storeUser } = useAppStore();

  const [userName, setUserName] = useState("Student");
  const [userEmail, setUserEmail] = useState(() => storeUser?.email || "");
  const [userPlan, setUserPlan] = useState(() => storeUser?.plan || "free");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileError, setProfileError] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = localStorage.getItem("userName");
      if (stored) setUserName(stored);
    });
  }, []);

  useEffect(() => {
    if (isPublic) return;

    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/me", { credentials: "include" });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          setAuthError("Failed to load your profile. Please refresh the page.");
          return;
        }

        const profile = await response.json();
        const name = profile.name || "Student";
        setUserName(name);
        setUserEmail(profile.email || "");
        setUserPlan(profile.plan || "free");
        localStorage.setItem("userName", name);

        setUser({
          id: profile.id,
          name,
          email: profile.email || "",
          plan: profile.plan || "free",
        });
        setAuthError("");
      } catch (error) {
        console.error("Failed to load profile", error);
        setAuthError("Failed to load your profile. Please refresh the page.");
      }
    };

    void fetchProfile();
  }, [isPublic, router, setUser]);

  useEffect(() => {
    queueMicrotask(() => setIsMobileMenuOpen(false));
  }, [pathname]);

  if (isPublic) {
    return <>{children}</>;
  }

  const universe = universeForPath(pathname);

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
        credentials: "include",
        body: JSON.stringify({ name: nextName }),
      });

      const data = await response.json();

      if (!response.ok) {
        setProfileError(data.detail || "Could not update profile.");
        return;
      }

      const name = data.name || nextName;
      setUserName(name);
      setUserEmail(data.email || userEmail);
      setUserPlan(data.plan || userPlan);
      localStorage.setItem("userName", name);

      if (storeUser) {
        setUser({ ...storeUser, name });
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
    localStorage.removeItem("userName");
    setUserName("Student");
    setUserEmail("");
    setUserPlan("free");
    setIsProfileOpen(false);
    setUser(null);

    try {
      await fetch(`${API_URL}/logout`, { method: "POST", credentials: "include" });
    } catch (error) {
      console.error("Logout failed", error);
    }

    router.push("/login");
  };

  return (
    <div className="relative flex h-dvh overflow-hidden bg-bg font-sans text-zinc-200">
      <GameAtmosphere universe={universe} intensity="quiet" />
      <Sidebar
        appName="Ascend AI"
        userName={userName}
        userPlan={userPlan}
        isMobileOpen={isMobileMenuOpen}
        onMobileOpenChange={setIsMobileMenuOpen}
        onOpenProfile={openProfile}
        onLogout={handleLogout}
        universe={universe}
      />

      <main className="relative flex h-full w-full min-w-0 flex-1 flex-col overflow-hidden pt-16 md:pl-64 md:pt-0">
        <div className="pointer-events-none absolute inset-0 z-0 bg-noise opacity-50" />

        <div className="relative z-10 flex-1 overflow-auto scrollbar-thin scrollbar-thumb-zinc-800 pb-16 md:pb-0">
          <HudBar userName={userName} plan={userPlan} universe={universe} />
          {authError && (
            <div className="border-b border-accent-mock/20 bg-accent-mock/10 px-4 py-3 text-sm text-accent-mock">
              {authError}
            </div>
          )}
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>

      <MobileTabBar onMenuClick={() => setIsMobileMenuOpen(true)} universe={universe} />

      {isProfileOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <form onSubmit={handleSaveProfile} className="w-full max-w-md rounded-[var(--radius-token)] border border-accent-deus/20 bg-surface/95 p-6 shadow-2xl shadow-accent-deus/10">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent-deus">Ripperdoc Console</p>
                <h2 className="text-lg font-bold text-white">Identity Implant</h2>
                <p className="mt-1 text-sm text-zinc-500">Tune the operator name shown in the Neuro-OS HUD.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close profile dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <label htmlFor="profile-name" className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-300">Operator call sign</span>
                <input
                  id="profile-name"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Your call sign"
                />
              </label>

              <label htmlFor="profile-email" className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-300">Secure access ID</span>
                <input
                  id="profile-email"
                  value={userEmail || "Not loaded"}
                  disabled
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-zinc-500 outline-none"
                />
              </label>
            </div>

            {profileError && <p className="mt-4 text-sm text-accent-mock">{profileError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                Close bay
              </button>
              <button
                type="submit"
                disabled={isSavingProfile || !profileName.trim()}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-primary disabled:opacity-50"
              >
                {isSavingProfile && <Loader2 className="size-4 animate-spin" />}
                Install implant
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
