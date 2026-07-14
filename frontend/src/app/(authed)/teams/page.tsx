"use client";

import { useEffect, useState } from "react";
import { api, TeamDto, PlayerDto } from "@/lib/api";
import { formatCr } from "@/lib/format";
import { Users2, Wallet } from "lucide-react";

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [players, setPlayers] = useState<PlayerDto[]>([]);
  const [activeTeam, setActiveTeam] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [t, p] = await Promise.all([
        api.get<TeamDto[]>("/teams"),
        api.get<PlayerDto[]>("/players"),
      ]);
      setTeams(t.data);
      setPlayers(p.data);
      if (t.data.length) setActiveTeam(t.data[0].id);
    })();
  }, []);

  const teamPlayers = players.filter((p) => p.teamId === activeTeam);
  const active = teams.find((t) => t.id === activeTeam);

  return (
    <div className="p-10">
      <div className="mb-8">
        <div className="label-cap">Franchises</div>
        <h1 className="h-heading text-5xl font-bold mt-1" data-testid="teams-heading">Teams</h1>
        <p className="text-white/50 mt-2">Squads, purchases and purse management for all four franchises.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {teams.map((t) => {
          const isActive = t.id === activeTeam;
          const spent = Number(t.purseTotal) - Number(t.purseRemaining);
          const pct = (spent / Number(t.purseTotal)) * 100;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTeam(t.id)}
              data-testid={`team-tab-${t.shortCode}`}
              className={`text-left rounded-2xl p-5 border transition-colors ${
                isActive ? "bg-primary/5 border-primary" : "card-elev hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center h-heading font-bold"
                  style={{ background: t.primaryColor + "22", color: t.primaryColor, border: `1px solid ${t.primaryColor}55` }}
                >
                  {t.shortCode}
                </div>
                <div>
                  <div className="h-heading">{t.name}</div>
                  <div className="label-cap text-[10px]">{t.totalPlayers}/12 slots</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="stat-num text-xl text-primary">{formatCr(Number(t.purseRemaining))}</div>
                <div className="h-1.5 mt-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.primaryColor }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="card-elev rounded-2xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <div className="label-cap">Squad</div>
              <h2 className="h-heading text-3xl mt-1">{active.name}</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Stat icon={<Users2 size={14} />} label="Total" value={`${active.totalPlayers}/12`} />
              <Stat icon={<Users2 size={14} />} label="M / F" value={`${active.maleCount}/9 · ${active.femaleCount}/3`} />
              <Stat icon={<Wallet size={14} />} label="Spent" value={formatCr(Number(active.purseTotal) - Number(active.purseRemaining))} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left label-cap text-[10px]">
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-4">Player</th>
                  <th className="py-3 pr-4">Gender</th>
                  <th className="py-3 pr-4">Skill</th>
                  <th className="py-3 pr-4">Base</th>
                  <th className="py-3 pr-4 text-right">Sold Price</th>
                </tr>
              </thead>
              <tbody>
                {teamPlayers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-white/40">
                      No players bought yet.
                    </td>
                  </tr>
                )}
                {teamPlayers.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5" data-testid={`row-player-${p.id}`}>
                    <td className="py-3 pr-4 font-medium">{p.fullName}</td>
                    <td className="py-3 pr-4"><span className="chip">{p.gender}</span></td>
                    <td className="py-3 pr-4 text-white/70">{p.skillLevel}</td>
                    <td className="py-3 pr-4 text-white/50">{formatCr(Number(p.basePrice))}</td>
                    <td className="py-3 pr-4 text-right h-heading text-primary">{p.soldPrice ? formatCr(Number(p.soldPrice)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-white/10 rounded-lg px-4 py-2 min-w-[110px]">
      <div className="flex items-center gap-2 text-white/50 label-cap text-[10px]">
        {icon} {label}
      </div>
      <div className="h-heading text-lg mt-1">{value}</div>
    </div>
  );
}
