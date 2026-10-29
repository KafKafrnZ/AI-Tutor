"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import MobileTabBar from "@/components/layout/MobileTabBar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { GameAtmosphere, HudBar } from "@/components/game/GamePrimitives";
import { universeForPath } from "@/components/game/universes";
import { API_URL, fetchWithRefresh, messageFromApiBody } from "@/lib/api";
import { isPreviewAuthAllowed } from "@/lib/preview-auth";
import { useAppStore } from "@/store/useAppStore";

export const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

export function usesAppChrome(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return false;
  if (pathname === "/tutor" || pathname.startsWith("/tutor/")) return false;
  if (pathname === "/practice" || pathname.startsWith("/practice/")) return false;
  if (pathname === "/explore" || pathname.startsWith("/explore/")) return false;
  return !/^\/mock-tests\/[^/]+/.test(pathname);
}
const PREVIEW_USER = {
  id: 0,
  name: "Preview Operator",
  email: "preview@localhost",
  plan: "cinematic",
};

export default function AppLayout({ children, previewAuthEnabled = false }: { children: React.ReactNode, previewAuthEnabled?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  const chrome = usesAppChrome(pathname);
  const isPreviewAuth =
    typeof window !== "undefined" &&
    isPreviewAuthAllowed({
      nodeEnv: process.env.NODE_ENV,
      previewAuth: previewAuthEnabled ? "true" : undefined,
      host: window.location.host,
    });
  const { setUser, user: storeUser } = useAppStore();

  const [userName, setUserName] = useState(() => (isPreviewAuth ? PREVIEW_USER.name : "Student"));
  const [userEmail, setUserEmail] = useState(() => (isPreviewAuth ? PREVIEW_USER.email : storeUser?.email || ""));
  const [userPlan, setUserPlan] = useState(() => (isPreviewAuth ? PREVIEW_USER.plan : storeUser?.plan || "free"));
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
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

    if (isPreviewAuth) {
      queueMicrotask(() => {
        localStorage.setItem("userName", PREVIEW_USER.name);
        setUser(PREVIEW_USER);
        setAuthError("");
      });
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetchWithRefresh(`${API_URL}/me`, { method: "GET" });

        if (!response.ok) {
          setAuthError("Failed to load your profile. Please refresh the page.");
          return;
        }

        const profile = await response.json();
        const name = profile.name || "Student";
        setUserName(name);
        setUserEmail(profile.email || "");
        setUserPlan(profile.plan || "free");
        setDailyLimit(typeof profile.daily_limit === "number" ? profile.daily_limit : 0);
        setDailyRemaining(typeof profile.daily_remaining === "number" ? profile.daily_remaining : null);
        localStorage.setItem("userName", name);

        setUser({
          id: profile.id,
          name,
          email: profile.email || "",
          plan: profile.plan || "free",
        });
        setAuthError("");
      } catch (error) {
        if (error instanceof Error && error.message === "SESSION_EXPIRED") return;
        console.error("Failed to load profile", error);
        setAuthError("Failed to load your profile. Please refresh the page.");
      }
    };

    void fetchProfile();
  }, [isPreviewAuth, isPublic, setUser]);

  useEffect(() => {
    queueMicrotask(() => setIsMobileMenuOpen(false));
  }, [pathname]);

  if (!chrome) {
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
      const response = await fetchWithRefresh(`${API_URL}/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: nextName }),
      });

      const data = await response.json();

      if (!response.ok) {
        setProfileError(messageFromApiBody(data, "Could not update profile."));
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
      if (error instanceof Error && error.message === "SESSION_EXPIRED") return;
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
      await fetchWithRefresh(`${API_URL}/logout`, { method: "POST" });
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
          <HudBar userName={userName} plan={userPlan} universe={universe} dailyRemaining={dailyRemaining} dailyLimit={dailyLimit} />
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
