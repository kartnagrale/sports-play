"use client";

import { useEffect, useState } from "react";
import { api, TeamAnalysisDto, TeamDto, FORMAT_LABEL, FORMAT_SHORT } from "@/lib/api";
import { TrendingUp, TrendingDown, Target } from "lucide-react";

export default function AnalysisPage() {
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<TeamAnalysisDto | null>(null);

  useEffect(() => {
    api.get<TeamDto[]>("/teams").then((r) => {
      setTeams(r.data);
      if (r.data.length) setSelected(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get<TeamAnalysisDto>(`/analytics/team/${selected}`).then((r) => setData(r.data));
  }, [selected]);

  return (
    <div className="p-10">
      <div className="mb-8">
        <div className="label-cap">Deep dive</div>
        <h1 className="h-heading text-5xl font-bold mt-1" data-testid="team-analysis-heading">Team Analysis</h1>
        <p className="text-white/50 mt-2 max-w-xl">Win %, format-wise performance, head-to-head records, participation and squad depth.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {teams.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={`p-4 rounded-xl border text-left transition-colors ${selected === t.id ? "bg-primary/5 border-primary" : "card-elev hover:border-white/30"}`}
            data-testid={`analysis-tab-${t.shortCode}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center h-heading font-bold text-xs"
                   style={{ background: t.primaryColor + "22", color: t.primaryColor, border: `1px solid ${t.primaryColor}55` }}>
                {t.shortCode}
              </div>
              <div className="h-heading text-sm">{t.name}</div>
            </div>
          </button>
        ))}
      </div>

      {data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi label="Matches" value={data.played} />
            <Kpi label="Wins" value={data.won} accent="primary" />
            <Kpi label="Losses" value={data.lost} accent="danger" />
            <Kpi label="Win %" value={`${data.winPct.toFixed(0)}%`} accent="primary" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Format breakdown */}
            <div className="card-elev rounded-2xl p-6 lg:col-span-2" data-testid="format-breakdown">
              <div className="label-cap">By format</div>
              <div className="h-heading text-xl mt-1 mb-4">Format Performance</div>
              <div className="space-y-3">
                {data.formatBreakdown.map((f) => {
                  const total = f.won + f.lost;
                  const pct = total === 0 ? 0 : (f.won / total) * 100;
                  return (
                    <div key={f.formatType}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="chip text-[9px]">{FORMAT_SHORT[f.formatType]}</span>
                          <span className="text-sm">{FORMAT_LABEL[f.formatType]}</span>
                        </div>
                        <div className="h-heading text-sm">{f.won}W / {f.lost}L</div>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <StrengthCard
                  icon={<TrendingUp className="text-success" />}
                  label="Strongest"
                  value={data.strongestFormat ? FORMAT_LABEL[data.strongestFormat] : "—"}
                />
                <StrengthCard
                  icon={<TrendingDown className="text-danger" />}
                  label="Weakest"
                  value={data.weakestFormat ? FORMAT_LABEL[data.weakestFormat] : "—"}
                />
              </div>
            </div>

            {/* Head to head */}
            <div className="card-elev rounded-2xl p-6" data-testid="head-to-head">
              <div className="label-cap">Rivalries</div>
              <div className="h-heading text-xl mt-1 mb-4">Head to Head</div>
              <div className="space-y-3">
                {data.headToHead.length === 0 && <div className="text-white/40 text-sm">No matches yet.</div>}
                {data.headToHead.map((h) => (
                  <div key={h.opponent.id} className="border border-white/10 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded flex items-center justify-center h-heading text-[10px]"
                              style={{ background: h.opponent.primaryColor + "22", color: h.opponent.primaryColor, border: `1px solid ${h.opponent.primaryColor}55` }}>
                          {h.opponent.shortCode}
                        </span>
                        <span className="text-sm">{h.opponent.name}</span>
                      </div>
                      <span className="chip text-[10px]">{h.played} played</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-success">Won: <span className="h-heading">{h.won}</span></span>
                      <span className="text-danger">Lost: <span className="h-heading">{h.lost}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card-elev rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="label-cap">Squad usage</div>
                <div className="h-heading text-xl mt-1">Participation</div>
              </div>
              <Target className="text-primary" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Kpi label="Players used" value={`${data.participationCount} / ${data.squadSize}`} />
              <Kpi label="Participation %" value={`${data.participationPct.toFixed(0)}%`} accent="primary" />
              <Kpi label="Unplayed" value={data.unplayedPlayerIds.length} accent="danger" />
            </div>
            <div className="mt-4 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-[width]" style={{ width: `${data.participationPct}%` }} />
            </div>
            {data.unplayedPlayerIds.length > 0 && (
              <p className="mt-3 text-danger text-xs">
                {data.unplayedPlayerIds.length} squad player(s) haven&apos;t played any league match — {data.unplayedPlayerIds.length * 2} point penalty risk.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="text-white/40">Loading analysis...</div>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: any; accent?: "primary" | "danger" }) {
  const c = accent === "primary" ? "text-primary" : accent === "danger" ? "text-danger" : "text-white";
  return (
    <div className="border border-white/10 rounded-xl p-4 bg-black/20">
      <div className="label-cap">{label}</div>
      <div className={`stat-num text-3xl mt-2 ${c}`}>{value}</div>
    </div>
  );
}

function StrengthCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-white/10 rounded-lg p-3 flex items-center gap-3">
      {icon}
      <div>
        <div className="label-cap">{label}</div>
        <div className="h-heading">{value}</div>
      </div>
    </div>
  );
}
