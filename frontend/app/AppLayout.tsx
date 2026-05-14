"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, Home, Bot, BookOpen, TestTube, BarChart3, LogOut, Trophy } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/tutor', label: 'AI Tutor', icon: Bot },
  { href: '/practice', label: 'Practice', icon: BookOpen },
  { href: '/mock-tests', label: 'Mock Tests', icon: TestTube },
  { href: '/progress', label: 'Progress', icon: BarChart3 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Hide sidebar on public pages including the Landing Page ('/')
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('userName');
    
    if (!token && !isPublicPage) {
      router.replace('/login');
    } else {
      setUser({ name: name || 'Student' });
    }
  }, [pathname, isPublicPage, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    router.replace('/login');
  };

  if (!isMounted) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>;

  if (isPublicPage) return <>{children}</>;

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      
      {/* --- SIDEBAR (Fixed with 'relative flex flex-col') --- */}
      <div className={`relative flex flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-300 flex-shrink-0 ${sidebarOpen ? 'w-72' : 'w-20'}`}>
        
        <div className="p-6 flex items-center gap-3 border-b border-zinc-800">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && <span className="font-bold text-2xl tracking-tighter text-white">IBPS SO AI</span>}
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`group flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 light-streak
                  ${isActive ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}>
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110 shrink-0" />
                  {sidebarOpen && <span className="font-medium truncate">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* --- PROFILE BAR (Fixed with 'mt-auto') --- */}
        <div className="mt-auto p-4 mb-4">
          <div className="flex items-center gap-3 p-4 rounded-3xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-violet-600 text-white font-semibold">
                {user?.name?.[0] || 'S'}
              </AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-sm text-white truncate">{user?.name}</p>
                <p className="text-xs text-zinc-500 truncate">Level 12 • 89% Accuracy</p>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout} className="shrink-0 text-zinc-400 hover:text-white">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-lg px-8 flex items-center justify-between">
          <Button onClick={() => setSidebarOpen(!sidebarOpen)} variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
            {sidebarOpen ? <X /> : <Menu />}
          </Button>
        </header>
        <main className="flex-1 overflow-auto bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}