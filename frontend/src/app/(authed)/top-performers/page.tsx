"use client";

import { useEffect, useState } from "react";
import { api, TopPerformerDto } from "@/lib/api";
import { Sparkles, Flame } from "lucide-react";

export default function TopPerformersPage() {
  const [rows, setRows] = useState<TopPerformerDto[]>([]);
  useEffect(() => {
    api.get<TopPerformerDto[]>("/analytics/top-performers?limit=15").then((r) => setRows(r.data));
  }, []);

  const longest = [...rows].sort((a, b) => b.longestStreak - a.longestStreak).slice(0, 5);
  const bestWinPct = [...rows].filter((r) => r.matchesPlayed >= 2).sort((a, b) => b.winPct - a.winPct).slice(0, 5);
  const mostMatches = [...rows].sort((a, b) => b.matchesPlayed - a.matchesPlayed).slice(0, 5);

  return (
    <div className="p-10">
      <div className="mb-8">
        <div className="label-cap">Player rankings</div>
        <h1 className="h-heading text-5xl font-bold mt-1" data-testid="top-performers-heading">Top Performers</h1>
        <p className="text-white/50 mt-2 max-w-xl">MVP charts across the tournament — wins, streaks, participation.</p>
      </div>

      {rows.length === 0 ? (
        <div className="card-elev rounded-2xl p-16 text-center text-white/50">No player stats yet — start playing matches.</div>
      ) : (
        <>
          <div className="card-elev rounded-2xl overflow-hidden mb-8">
            <div className="p-6 border-b border-white/5 flex items-center gap-3">
              <Sparkles className="text-primary" />
              <div>
                <div className="label-cap">MVP Rankings</div>
                <div className="h-heading text-xl">Most Wins</div>
              </div>
            </div>
            <table className="w-full text-sm" data-testid="mvp-table">
              <thead>
                <tr className="text-left label-cap text-[10px] bg-white/5">
                  <th className="py-3 pl-6 pr-4 w-14">#</th>
                  <th className="py-3 pr-4">Player</th>
                  <th className="py-3 pr-4">Team</th>
                  <th className="py-3 pr-4 text-center">Played</th>
                  <th className="py-3 pr-4 text-center">Wins</th>
                  <th className="py-3 pr-4 text-center">Losses</th>
                  <th className="py-3 pr-4 text-center">Win %</th>
                  <th className="py-3 pr-4 text-center">Streak</th>
                  <th className="py-3 pr-6 text-right">Avg Margin</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.player.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="py-3 pl-6 pr-4"><span className={`h-heading text-xl ${i < 3 ? "text-primary" : "text-white/60"}`}>{i + 1}</span></td>
                    <td className="py-3 pr-4">
                      <div className="h-heading">{r.player.fullName}</div>
                      <div className="label-cap text-[9px] text-white/40">{r.player.gender}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="chip" style={{ borderColor: r.team.primaryColor + "55", color: r.team.primaryColor }}>{r.team.shortCode}</span>
                    </td>
                    <td className="py-3 pr-4 text-center text-white/70">{r.matchesPlayed}</td>
                    <td className="py-3 pr-4 text-center h-heading text-primary">{r.wins}</td>
                    <td className="py-3 pr-4 text-center text-white/70">{r.losses}</td>
                    <td className="py-3 pr-4 text-center h-heading">{r.winPct.toFixed(0)}%</td>
                    <td className="py-3 pr-4 text-center">
                      {r.longestStreak >= 2 && <Flame size={12} className="inline text-danger mr-1" />}
                      <span className="h-heading">{r.longestStreak}</span>
                    </td>
                    <td className="py-3 pr-6 text-right text-white/70">{r.avgMargin > 0 ? "+" : ""}{r.avgMargin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MiniList title="Longest Streaks" rows={longest} valueLabel="streak" value={(r) => r.longestStreak} />
            <MiniList title="Best Win %" rows={bestWinPct} valueLabel="win %" value={(r) => `${r.winPct.toFixed(0)}%`} />
            <MiniList title="Most Matches" rows={mostMatches} valueLabel="played" value={(r) => r.matchesPlayed} />
          </div>
        </>
      )}
    </div>
  );
}

function MiniList({ title, rows, valueLabel, value }: { title: string; rows: TopPerformerDto[]; valueLabel: string; value: (r: TopPerformerDto) => any }) {
  return (
    <div className="card-elev rounded-2xl p-5">
      <div className="label-cap">Chart</div>
      <div className="h-heading text-lg mt-1 mb-3">{title}</div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.player.id} className="flex items-center justify-between text-sm border-b border-white/5 py-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 label-cap text-white/40 text-[10px]">#{i + 1}</span>
              <span className="truncate">{r.player.fullName}</span>
              <span className="chip text-[9px]" style={{ borderColor: r.team.primaryColor + "55", color: r.team.primaryColor }}>{r.team.shortCode}</span>
            </div>
            <div className="h-heading text-primary">{value(r)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
