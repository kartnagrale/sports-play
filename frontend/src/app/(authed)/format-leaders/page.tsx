"use client";

import { useEffect, useState } from "react";
import { api, FormatLeaderDto, FORMAT_LABEL, FORMAT_SHORT } from "@/lib/api";
import { Trophy } from "lucide-react";

export default function FormatLeadersPage() {
  const [leaders, setLeaders] = useState<FormatLeaderDto[]>([]);
  useEffect(() => {
    api.get<FormatLeaderDto[]>("/analytics/format-leaders").then((r) => setLeaders(r.data));
  }, []);
  return (
    <div className="p-10">
      <div className="mb-8">
        <div className="label-cap">By format</div>
        <h1 className="h-heading text-5xl font-bold mt-1" data-testid="format-leaders-heading">Format Leaders</h1>
        <p className="text-white/50 mt-2 max-w-xl">Team leading each of the five playing formats by total wins across the league.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leaders.map((l) => (
          <div key={l.formatType} className="card-elev rounded-2xl p-6 relative overflow-hidden" data-testid={`format-card-${l.formatType}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="chip chip-primary">{FORMAT_SHORT[l.formatType]}</span>
                <div className="h-heading text-xl mt-2">{FORMAT_LABEL[l.formatType]}</div>
              </div>
              <Trophy className="text-primary" size={28} />
            </div>
            {l.leadingTeam ? (
              <div className="mt-4">
                <div className="label-cap">Leader</div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center h-heading font-bold"
                       style={{ background: l.leadingTeam.primaryColor + "22", color: l.leadingTeam.primaryColor, border: `1px solid ${l.leadingTeam.primaryColor}55` }}>
                    {l.leadingTeam.shortCode}
                  </div>
                  <div>
                    <div className="h-heading text-lg">{l.leadingTeam.name}</div>
                    <div className="stat-num text-2xl text-primary drop-shadow-glow">{l.wins} <span className="text-sm text-white/50 font-body font-normal">wins</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-white/40 italic text-sm py-4">No matches decided yet</div>
            )}

            <div className="mt-4 pt-4 border-t border-white/5 space-y-1.5">
              {l.allTeams.map((t) => (
                <div key={t.team.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded" style={{ background: t.team.primaryColor }} />
                    {t.team.shortCode} — {t.team.name}
                  </span>
                  <span className="h-heading">{t.wins}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
