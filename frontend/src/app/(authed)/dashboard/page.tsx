"use client";

import { useEffect, useState } from "react";
import { api, TeamDto, AuctionStateDto } from "@/lib/api";
import { formatCr } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { Gavel, Users, Trophy, TrendingUp, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [state, setState] = useState<AuctionStateDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, s] = await Promise.all([
          api.get("/teams"),
          api.get("/auction/state"),
        ]);
        setTeams(t.data);
        setState(s.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalSold =
    state?.teams.reduce(
      (acc, t) => acc + (t.totalPlayers ?? 0),
      0
    ) || 0;
  const auctionProgress = Math.round((totalSold / 48) * 100);

  return (
    <div className="p-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="label-cap">Overview</div>
          <h1 className="h-heading text-5xl font-bold mt-1" data-testid="dashboard-heading">
            Welcome, {user?.fullName?.split(" ")[0] || "Guest"}
          </h1>
          <p className="text-white/50 mt-2 max-w-xl">
            Live tournament status, quick stats and shortcuts across the NEML platform.
          </p>
        </div>
        {state?.status === "RUNNING" && (
          <Link href="/auction" className="btn btn-primary" data-testid="jump-to-auction">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            Live Auction <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Kpi
          label="Auction Status"
          value={state?.status?.replaceAll("_", " ") || "—"}
          accent={state?.status === "RUNNING" ? "primary" : state?.status === "COMPLETED" ? "cyan" : "default"}
          icon={<Gavel size={20} />}
          testid="kpi-auction-status"
        />
        <Kpi
          label="Players Sold"
          value={`${totalSold} / 48`}
          sub={`${auctionProgress}% complete`}
          icon={<Users size={20} />}
          testid="kpi-players-sold"
        />
        <Kpi
          label="Teams"
          value="4"
          sub="Chennai · Bangalore · Mumbai · Delhi"
          icon={<Trophy size={20} />}
          testid="kpi-teams"
        />
        <Kpi
          label="Total Purse Pool"
          value={formatCr(teams.reduce((a, t) => a + Number(t.purseTotal || 0), 0))}
          sub="₹100 Cr × 4 teams"
          icon={<TrendingUp size={20} />}
          testid="kpi-total-purse"
        />
      </div>

      {/* Team purse cards */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="h-heading text-2xl font-semibold">Team Purse Status</h2>
          <Link href="/teams" className="btn btn-ghost text-xs" data-testid="view-all-teams">
            View all teams <ArrowRight size={13} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {teams.map((t) => {
            const spent = Number(t.purseTotal) - Number(t.purseRemaining);
            const pct = (spent / Number(t.purseTotal)) * 100;
            return (
              <div key={t.id} className="card-elev rounded-2xl p-5" data-testid={`team-card-${t.shortCode}`}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center h-heading font-bold text-lg"
                    style={{ background: t.primaryColor + "22", color: t.primaryColor, border: `1px solid ${t.primaryColor}55` }}
                  >
                    {t.shortCode}
                  </div>
                  <div className="min-w-0">
                    <div className="h-heading text-sm font-medium truncate">{t.name}</div>
                    <div className="label-cap text-[10px]">Owner slot #{t.shortCode}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline justify-between">
                    <div className="stat-num text-2xl">{formatCr(Number(t.purseRemaining))}</div>
                    <div className="label-cap text-[10px]">/ {formatCr(Number(t.purseTotal))}</div>
                  </div>
                  <div className="h-1.5 mt-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: t.primaryColor }}
                    />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between border border-white/10 rounded-md px-2 py-1.5">
                    <span className="text-white/50">Male</span>
                    <span className="h-heading">{t.maleCount}/9</span>
                  </div>
                  <div className="flex justify-between border border-white/10 rounded-md px-2 py-1.5">
                    <span className="text-white/50">Female</span>
                    <span className="h-heading">{t.femaleCount}/3</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Announcements + Schedule stubs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-elev rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label-cap">Announcements</div>
              <h3 className="h-heading text-xl mt-1">Latest Updates</h3>
            </div>
            <span className="chip chip-primary">Season 1</span>
          </div>
          <ul className="space-y-3">
            <Announcement title="Auction goes live" body="Live auction slot opens shortly. Team owners, get ready to bid." />
            <Announcement title="Composition rule" body="Each team must field min 3 female and 9 male players (12 total)." />
            <Announcement title="Format" body="Every match features 5 playing formats. A player can play only 1 format per match." />
          </ul>
        </div>
        <div className="card-elev rounded-2xl p-6">
          <div className="label-cap">Coming up</div>
          <h3 className="h-heading text-xl mt-1 mb-4">Tournament Schedule</h3>
          <div className="space-y-3">
            <ScheduleItem when="Phase 1" what="Live Player Auction" state="Active" />
            <ScheduleItem when="Phase 2" what="Squad Confirmation" state="Pending" />
            <ScheduleItem when="Phase 3" what="League Matches" state="Pending" />
            <ScheduleItem when="Phase 4" what="Playoffs & Final" state="Pending" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, icon, accent, testid }: any) {
  const accentClass =
    accent === "primary"
      ? "text-primary"
      : accent === "cyan"
      ? "text-secondary"
      : "text-white";
  return (
    <div className="card-elev rounded-2xl p-6" data-testid={testid}>
      <div className="flex items-start justify-between">
        <div className="label-cap">{label}</div>
        <div className="text-white/40">{icon}</div>
      </div>
      <div className={`stat-num text-3xl mt-3 ${accentClass}`}>{value}</div>
      {sub && <div className="text-white/40 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function Announcement({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex gap-3 py-2 border-b border-white/5 last:border-b-0">
      <div className="w-1 h-auto rounded bg-primary/60 flex-shrink-0" />
      <div>
        <div className="h-heading text-sm">{title}</div>
        <div className="text-white/50 text-xs mt-0.5">{body}</div>
      </div>
    </li>
  );
}

function ScheduleItem({ when, what, state }: { when: string; what: string; state: string }) {
  const s = state === "Active" ? "chip-live" : "";
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0">
      <div>
        <div className="label-cap text-[10px]">{when}</div>
        <div className="text-sm">{what}</div>
      </div>
      <span className={`chip ${s}`}>{state}</span>
    </div>
  );
}
