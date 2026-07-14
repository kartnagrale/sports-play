"use client";

import { useEffect, useMemo, useState } from "react";
import { api, MatchDto, MatchFormatDto, PlayerDto, TeamDto, FORMAT_LABEL, FORMAT_SHORT } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Calendar, Circle, Check, ChevronRight, Plus, Trash2 } from "lucide-react";

export default function MatchesPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchDto[]>([]);
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [players, setPlayers] = useState<PlayerDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [m, t, p] = await Promise.all([
        api.get<MatchDto[]>("/matches"),
        api.get<TeamDto[]>("/teams"),
        api.get<PlayerDto[]>("/players"),
      ]);
      setMatches(m.data);
      setTeams(t.data);
      setPlayers(p.data);
      if (!selectedId && m.data.length) setSelectedId(m.data[0].id);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const selected = matches.find((m) => m.id === selectedId);

  return (
    <div className="p-10">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="label-cap">Fixtures</div>
          <h1 className="h-heading text-5xl font-bold mt-1" data-testid="matches-heading">Matches</h1>
          <p className="text-white/50 mt-2 max-w-xl">Round-robin fixtures with 5 playing formats per match.</p>
        </div>
        {user?.role === "ADMIN" && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)} data-testid="new-match-btn">
            <Plus size={14} /> New Match
          </button>
        )}
      </div>

      {matches.length === 0 && (
        <div className="card-elev rounded-2xl p-16 text-center">
          <div className="label-cap">Empty</div>
          <div className="h-heading text-2xl mt-2 text-white/60">No matches scheduled yet</div>
          <p className="text-white/40 mt-2">
            {user?.role === "ADMIN" ? "Click 'New Match' or use 'Populate demo data' on the Scoreboard to seed a round-robin." : "Fixtures will appear here once scheduled."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar list */}
        <div className="col-span-12 lg:col-span-4">
          <div className="space-y-2" data-testid="match-list">
            {matches.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  selectedId === m.id ? "bg-primary/5 border-primary" : "card-elev hover:border-white/30"
                }`}
                data-testid={`match-item-${m.matchNumber}`}
              >
                <div className="flex items-center justify-between">
                  <div className="label-cap text-[10px]">Match #{m.matchNumber}</div>
                  <MatchStatusChip status={m.status} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <TeamBadge team={m.teamA} />
                    <span className="text-white/40 text-xs">vs</span>
                    <TeamBadge team={m.teamB} />
                  </div>
                  {m.status === "COMPLETED" && (
                    <div className="h-heading text-lg">{m.teamAFormatWins}-{m.teamBFormatWins}</div>
                  )}
                </div>
                {m.venue && <div className="text-white/40 text-[11px] mt-1">{m.venue}</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        {selected && (
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <MatchHeader match={selected} isAdmin={user?.role === "ADMIN"} onDelete={async () => {
              if (!confirm("Delete this match?")) return;
              await api.delete(`/admin/matches/${selected.id}`);
              toast.success("Match deleted");
              setSelectedId(null);
              await load();
            }} />
            <div className="space-y-3">
              {selected.formats.map((f) => (
                <FormatCard
                  key={f.id}
                  match={selected}
                  format={f}
                  players={players}
                  isAdmin={user?.role === "ADMIN"}
                  onChange={load}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateMatchDialog teams={teams} onClose={() => setShowCreate(false)} onCreated={async () => { setShowCreate(false); await load(); }} />
      )}
    </div>
  );
}

function MatchStatusChip({ status }: { status: string }) {
  const s = status === "LIVE" ? "chip chip-live" : status === "COMPLETED" ? "chip chip-primary" : "chip";
  return <span className={s}>{status}</span>;
}

function TeamBadge({ team }: { team: MatchDto["teamA"] }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-6 h-6 rounded flex items-center justify-center h-heading text-[10px] font-bold"
            style={{ background: team.primaryColor + "22", color: team.primaryColor, border: `1px solid ${team.primaryColor}55` }}>
        {team.shortCode}
      </span>
      <span className="text-sm">{team.name}</span>
    </span>
  );
}

function MatchHeader({ match, isAdmin, onDelete }: { match: MatchDto; isAdmin: boolean; onDelete: () => void }) {
  return (
    <div className="card-elev rounded-2xl p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="label-cap">Match #{match.matchNumber}</div>
          <div className="h-heading text-3xl mt-1 flex items-center gap-3 flex-wrap">
            {match.teamA.name}
            <span className="text-white/30 text-xl">vs</span>
            {match.teamB.name}
          </div>
          {match.venue && <div className="text-white/50 text-sm mt-1 flex items-center gap-1"><Calendar size={12} /> {match.venue}</div>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <MatchStatusChip status={match.status} />
          {match.status === "COMPLETED" && (
            <div>
              <div className="stat-num text-4xl text-primary">{match.teamAFormatWins} - {match.teamBFormatWins}</div>
              <div className="label-cap text-[10px] text-right">Winner: {match.winner?.name || "—"}</div>
            </div>
          )}
          {isAdmin && (
            <button className="btn btn-ghost text-xs" onClick={onDelete} data-testid="delete-match">
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FormatCard({ match, format, players, isAdmin, onChange }: {
  match: MatchDto; format: MatchFormatDto; players: PlayerDto[]; isAdmin: boolean; onChange: () => Promise<void>;
}) {
  const [assign, setAssign] = useState(false);
  const [score, setScore] = useState(false);
  const [sideA, setSideA] = useState<string[]>(format.sideAPlayers.map((p) => p.id));
  const [sideB, setSideB] = useState<string[]>(format.sideBPlayers.map((p) => p.id));
  const [sA, setSA] = useState(format.scoreA);
  const [sB, setSB] = useState(format.scoreB);

  const teamAPlayers = players.filter((p) => p.teamId === match.teamA.id);
  const teamBPlayers = players.filter((p) => p.teamId === match.teamB.id);

  const need = format.formatType === "MENS_SINGLES" || format.formatType === "WOMENS_SINGLES" ? 1 : 2;
  const filter = (t: string) =>
    (t === "A" ? teamAPlayers : teamBPlayers).filter((p) => {
      if (format.formatType === "MENS_SINGLES" || format.formatType === "MENS_DOUBLES" || format.formatType === "MENS_DOUBLES_TWO") return p.gender === "MALE";
      if (format.formatType === "WOMENS_SINGLES") return p.gender === "FEMALE";
      return true; // mixed
    });

  const submitAssign = async () => {
    try {
      await api.post(`/admin/matches/formats/${format.id}/assign`, { sideAPlayerIds: sideA, sideBPlayerIds: sideB });
      toast.success("Players assigned");
      setAssign(false);
      await onChange();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.response?.data || "Failed");
    }
  };
  const submitScore = async () => {
    try {
      await api.post(`/admin/matches/formats/${format.id}/result`, { scoreA: sA, scoreB: sB });
      toast.success("Result recorded");
      setScore(false);
      await onChange();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.response?.data || "Failed");
    }
  };

  return (
    <div className={`card-elev rounded-xl p-5 border ${format.completed ? "border-primary/30" : "border-white/10"}`} data-testid={`format-card-${format.formatOrder}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="chip chip-primary">{FORMAT_SHORT[format.formatType]}</span>
            <span className="h-heading text-lg">{FORMAT_LABEL[format.formatType]}</span>
          </div>
          <div className="label-cap text-[10px] mt-1">Format #{format.formatOrder}</div>
        </div>
        {format.completed ? (
          <div className="text-right">
            <div className="stat-num text-2xl text-primary">{format.scoreA} - {format.scoreB}</div>
            <div className="label-cap text-[10px] mt-1">Winner: {format.winner?.shortCode}</div>
          </div>
        ) : (
          <span className="chip">Pending</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="border border-white/10 rounded-lg p-3">
          <div className="label-cap mb-2 text-[9px]" style={{ color: match.teamA.primaryColor }}>{match.teamA.shortCode}</div>
          {format.sideAPlayers.length > 0 ? format.sideAPlayers.map((p) => (
            <div key={p.id} className="text-white/80 text-xs" data-testid={`p-a-${p.id}`}>{p.fullName}</div>
          )) : <div className="text-white/30 text-xs italic">— not assigned —</div>}
        </div>
        <div className="border border-white/10 rounded-lg p-3">
          <div className="label-cap mb-2 text-[9px]" style={{ color: match.teamB.primaryColor }}>{match.teamB.shortCode}</div>
          {format.sideBPlayers.length > 0 ? format.sideBPlayers.map((p) => (
            <div key={p.id} className="text-white/80 text-xs" data-testid={`p-b-${p.id}`}>{p.fullName}</div>
          )) : <div className="text-white/30 text-xs italic">— not assigned —</div>}
        </div>
      </div>
      {isAdmin && (
        <div className="flex gap-2 mt-3">
          {!format.completed && (
            <>
              <button className="btn btn-ghost text-xs" onClick={() => setAssign(!assign)} data-testid={`assign-${format.formatOrder}`}>
                {format.sideAPlayers.length ? "Change players" : "Assign players"}
              </button>
              {format.sideAPlayers.length > 0 && format.sideBPlayers.length > 0 && (
                <button className="btn btn-primary text-xs" onClick={() => setScore(!score)} data-testid={`record-${format.formatOrder}`}>
                  Record result
                </button>
              )}
            </>
          )}
        </div>
      )}
      {assign && (
        <div className="mt-4 p-4 rounded-lg border border-white/10 bg-black/30 space-y-3">
          <PlayerPicker label={`${match.teamA.shortCode} side (need ${need})`} options={filter("A")} value={sideA} setValue={setSideA} max={need} />
          <PlayerPicker label={`${match.teamB.shortCode} side (need ${need})`} options={filter("B")} value={sideB} setValue={setSideB} max={need} />
          <button className="btn btn-primary text-xs" onClick={submitAssign} data-testid={`submit-assign-${format.formatOrder}`}>
            <Check size={12} /> Save assignment
          </button>
        </div>
      )}
      {score && (
        <div className="mt-4 p-4 rounded-lg border border-white/10 bg-black/30 flex items-end gap-3 flex-wrap">
          <div>
            <label className="label-cap block mb-1">{match.teamA.shortCode} score</label>
            <input type="number" className="input w-24" value={sA} onChange={(e) => setSA(+e.target.value)} data-testid={`score-a-${format.formatOrder}`} />
          </div>
          <div className="text-white/40">—</div>
          <div>
            <label className="label-cap block mb-1">{match.teamB.shortCode} score</label>
            <input type="number" className="input w-24" value={sB} onChange={(e) => setSB(+e.target.value)} data-testid={`score-b-${format.formatOrder}`} />
          </div>
          <button className="btn btn-primary text-xs" onClick={submitScore} data-testid={`submit-score-${format.formatOrder}`}>Save result</button>
        </div>
      )}
    </div>
  );
}

function PlayerPicker({ label, options, value, setValue, max }: { label: string; options: PlayerDto[]; value: string[]; setValue: (v: string[]) => void; max: number }) {
  const toggle = (id: string) => {
    if (value.includes(id)) setValue(value.filter((x) => x !== id));
    else if (value.length < max) setValue([...value, id]);
  };
  return (
    <div>
      <div className="label-cap mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
        {options.map((p) => {
          const sel = value.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`chip text-[10px] ${sel ? "chip-primary" : ""}`}
              data-testid={`pick-${p.id}`}
            >
              {p.fullName} · {p.gender[0]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CreateMatchDialog({ teams, onClose, onCreated }: { teams: TeamDto[]; onClose: () => void; onCreated: () => void }) {
  const [teamA, setTeamA] = useState(teams[0]?.id || "");
  const [teamB, setTeamB] = useState(teams[1]?.id || "");
  const [when, setWhen] = useState(new Date().toISOString().slice(0, 16));
  const [venue, setVenue] = useState("Center Court");
  const submit = async () => {
    if (teamA === teamB) return toast.error("Teams must differ");
    try {
      await api.post("/admin/matches", { teamAId: teamA, teamBId: teamB, scheduledAt: new Date(when).toISOString(), venue });
      toast.success("Match created");
      onCreated();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="card-elev rounded-2xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="label-cap">Fixtures</div>
        <h3 className="h-heading text-2xl mt-1 mb-4">Schedule Match</h3>
        <div className="space-y-3">
          <div>
            <label className="label-cap block mb-1">Team A</label>
            <select className="input" value={teamA} onChange={(e) => setTeamA(e.target.value)} data-testid="new-team-a">
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-cap block mb-1">Team B</label>
            <select className="input" value={teamB} onChange={(e) => setTeamB(e.target.value)} data-testid="new-team-b">
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-cap block mb-1">Scheduled at</label>
            <input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} data-testid="new-when" />
          </div>
          <div>
            <label className="label-cap block mb-1">Venue</label>
            <input className="input" value={venue} onChange={(e) => setVenue(e.target.value)} data-testid="new-venue" />
          </div>
          <div className="flex gap-2 pt-2">
            <button className="btn btn-ghost flex-1 justify-center" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary flex-1 justify-center" onClick={submit} data-testid="submit-new-match">Create</button>
          </div>
        </div>
      </div>
    </div>
  );
}
