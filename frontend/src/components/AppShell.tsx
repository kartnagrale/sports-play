"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Gavel, Trophy, Calendar, Users, BarChart3, Award, Sparkles, History, Bell, LogOut,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/auction", label: "Auction", icon: Gavel },
  { href: "/scoreboard", label: "Scoreboard", icon: Trophy },
  { href: "/matches", label: "Matches", icon: Calendar },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/analysis", label: "Team Analysis", icon: BarChart3 },
  { href: "/format-leaders", label: "Format Leaders", icon: Award },
  { href: "/top-performers", label: "Top Performers", icon: Sparkles },
  { href: "/history", label: "Auction History", icon: History },
  { href: "/announcements", label: "Announcements", icon: Bell },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hydrate, hydrated, logout } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/40 font-heading uppercase tracking-widest">
        Loading...
      </div>
    );
  }
  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-white/10 bg-bg-surface flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="text-primary h-heading text-2xl font-bold leading-none drop-shadow-glow" data-testid="brand-name">
            NEML
          </div>
          <div className="label-cap mt-1">Badminton Championship</div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                data-testid={`nav-${href.replace("/", "")}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg h-heading uppercase tracking-widest text-xs transition-colors ${
                  active
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon size={16} strokeWidth={2.2} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center h-heading text-primary font-bold">
              {user.fullName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate" data-testid="user-name">{user.fullName}</div>
              <div className="text-[10px] label-cap">{user.role.replace("_", " ")}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-ghost w-full justify-center text-xs"
            data-testid="logout-btn"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
