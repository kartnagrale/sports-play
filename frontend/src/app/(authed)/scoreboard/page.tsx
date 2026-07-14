"use client";

import { useEffect, useState } from "react";
import { api, StandingDto } from "@/lib/api";
import { createMatchSocket } from "@/lib/ws";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Trophy, AlertTriangle, RefreshCw, Sparkles } from "lucide-react";

export default function ScoreboardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<StandingDto[]>([]);
  const [penaltiesOn, setPenaltiesOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [populating, setPopulating] = useState(false);

  const load = async (penalties: boolean = penaltiesOn) => {
    setLoading(true);
    try {
      const { data } = await api.get<StandingDto[]>(`/analytics/standings?penalties=${penalties}`);
      setRows(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    const client = createMatchSocket(() => { load(penaltiesOn); });
    return () => { client.deactivate(); };
    // eslint-disable-next-line
  }, [penaltiesOn]);

  const populate = async () => {
    setPopulating(true);
    try {
      const { data } = await api.post("/admin/demo/populate?autoPlay=6");
      toast.success(`Seeded ${data.matches} matches, auto-played ${data.autoPlayed}`);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Populate failed");
    } finally { setPopulating(false); }
  };

  const anyPenalty = rows.some((r) => r.penalty > 0);
  const noMatches = rows.every((r) => r.played === 0);

  return (
    <div className="p-10">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="label-cap">League Table</div>
          <h1 className="h-heading text-5xl font-bold mt-1" data-testid="scoreboard-heading">Score Board</h1>
          <p className="text-white/50 mt-2 max-w-xl">
            Live standings. Ranked by total points → head-to-head → format wins → format difference.
          </p>
        </div>
        <div className="flex gap-2">
          <label className="chip cursor-pointer" data-testid="toggle-penalties">
            <input
              type="checkbox"
              checked={penaltiesOn}
              onChange={(e) => { setPenaltiesOn(e.target.checked); load(e.target.checked); }}
              className="accent-primary"
            />
            Apply -2 pt penalties
          </label>
          <button className="btn btn-ghost" onClick={() => load()} data-testid="refresh-standings">
            <RefreshCw size={14} /> Refresh
          </button>
          {user?.role === "ADMIN" && (
            <button className="btn btn-cyan" disabled={populating} onClick={populate} data-testid="populate-demo">
              <Sparkles size={14} /> {populating ? "Loading…" : "Populate demo data"}
            </button>
          )}
        </div>
      </div>

      {noMatches && (
        <div className="card-elev rounded-2xl p-8 mb-6 flex items-center gap-4">
          <AlertTriangle className="text-warning" />
          <div>
            <div className="h-heading text-lg">No completed matches yet</div>
            <div className="text-white/50 text-sm mt-1">
              {user?.role === "ADMIN"
                ? "Click 'Populate demo data' above to auto-seed squads and simulate a full round-robin."
                : "Waiting for the tournament to begin. Standings appear once matches are played."}
            </div>
          </div>
        </div>
      )}

      <div className="card-elev rounded-2xl overflow-hidden">
        <table className="w-full text-sm" data-testid="standings-table">
          <thead>
            <tr className="text-left label-cap text-[10px] bg-white/5">
              <th className="py-4 pl-6 pr-4 w-14">#</th>
              <th className="py-4 pr-4">Team</th>
              <th className="py-4 pr-4 text-center">P</th>
              <th className="py-4 pr-4 text-center">W</th>
              <th className="py-4 pr-4 text-center">L</th>
              <th className="py-4 pr-4 text-center">FW</th>
              <th className="py-4 pr-4 text-center">FL</th>
              <th className="py-4 pr-4 text-center">Diff</th>
              <th className="py-4 pr-4 text-center">Base</th>
              <th className="py-4 pr-4 text-center">Penalty</th>
              <th className="py-4 pr-6 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.team.id} className="border-t border-white/5 hover:bg-white/5 transition-colors" data-testid={`standing-row-${r.team.shortCode}`}>
                <td className="py-4 pl-6 pr-4">
                  <div className={`h-heading text-2xl ${r.rank === 1 ? "text-primary drop-shadow-glow" : ""}`}>{r.rank}</div>
                </td>
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center h-heading font-bold text-xs"
                         style={{ background: r.team.primaryColor + "22", color: r.team.primaryColor, border: `1px solid ${r.team.primaryColor}55` }}>
                      {r.team.shortCode}
                    </div>
                    <div>
                      <div className="h-heading text-base">{r.team.name}</div>
                      {r.rank === 1 && (
                        <div className="chip chip-primary text-[9px] mt-1">
                          <Trophy size={10} /> Leader
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 pr-4 text-center text-white/70">{r.played}</td>
                <td className="py-4 pr-4 text-center h-heading text-primary">{r.won}</td>
                <td className="py-4 pr-4 text-center text-white/70">{r.lost}</td>
                <td className="py-4 pr-4 text-center text-white/70">{r.formatWins}</td>
                <td className="py-4 pr-4 text-center text-white/70">{r.formatLosses}</td>
                <td className={`py-4 pr-4 text-center h-heading ${r.formatDiff > 0 ? "text-success" : r.formatDiff < 0 ? "text-danger" : "text-white/50"}`}>
                  {r.formatDiff > 0 ? "+" : ""}{r.formatDiff}
                </td>
                <td className="py-4 pr-4 text-center text-white/60">{r.basePoints}</td>
                <td className="py-4 pr-4 text-center">
                  {r.penalty > 0 ? (
                    <span className="chip text-danger border-danger/40 bg-danger/10">-{r.penalty}</span>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </td>
                <td className="py-4 pr-6 text-right">
                  <div className="stat-num text-2xl">{r.totalPoints}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {anyPenalty && (
        <div className="mt-6 p-4 rounded-lg border border-danger/30 bg-danger/5 text-sm text-white/70 flex items-start gap-3" data-testid="penalty-notice">
          <AlertTriangle className="text-danger flex-shrink-0" size={18} />
          <div>
            <div className="h-heading text-danger">Participation penalty applied</div>
            <div>Every squad member must play at least one league match. Teams with unplayed players lose 2 points per absentee.</div>
          </div>
        </div>
      )}
    </div>
  );
}
