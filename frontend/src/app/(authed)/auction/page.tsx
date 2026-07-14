"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, AuctionStateDto, TeamDto, PlayerDto, BidDto } from "@/lib/api";
import { createAuctionSocket } from "@/lib/ws";
import { useAuth } from "@/lib/auth";
import { formatCr } from "@/lib/format";
import { toast } from "sonner";
import type { Client } from "@stomp/stompjs";
import {
  Play, Pause, Undo2, Hammer, XCircle, Shuffle, SkipForward, ListChecks, Timer, Pencil,
} from "lucide-react";

const BID_INCREMENT = 500_000;

export default function AuctionPage() {
  const { user } = useAuth();
  const [state, setState] = useState<AuctionStateDto | null>(null);
  const [flash, setFlash] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerDto[]>([]);
  const [coinTossOpen, setCoinTossOpen] = useState(false);
  const [editBasePriceFor, setEditBasePriceFor] = useState<PlayerDto | null>(null);
  const [now, setNow] = useState(Date.now());
  const clientRef = useRef<Client | null>(null);
  const isAdmin = user?.role === "ADMIN";
  const isOwner = user?.role === "TEAM_OWNER";

  // Tick every second for countdown timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    const [s, p] = await Promise.all([
      api.get<AuctionStateDto>("/auction/state"),
      api.get<PlayerDto[]>("/players"),
    ]);
    setState(s.data);
    setAvailablePlayers(p.data.filter((x) => x.status === "AVAILABLE" || x.status === "UNSOLD"));
  };

  useEffect(() => {
    load();
    const client = createAuctionSocket((evt) => {
      if (evt.type === "STATE") {
        setState(evt.data);
        api.get<PlayerDto[]>("/players").then((r) =>
          setAvailablePlayers(r.data.filter((x) => x.status === "AVAILABLE" || x.status === "UNSOLD"))
        );
      } else if (evt.type === "BID_PLACED") {
        setFlash(true);
        setTimeout(() => setFlash(false), 900);
        toast.success(`${evt.data.teamName} bid ${formatCr(evt.data.amount)}`);
      } else if (evt.type === "PLAYER_SOLD") {
        toast.success(`${evt.data.player} → ${evt.data.teamName} @ ${formatCr(evt.data.amount)}`);
      } else if (evt.type === "PLAYER_UNSOLD") {
        toast(`${evt.data.player} unsold`);
      } else if (evt.type === "BID_UNDONE") {
        toast(`Undone: ${evt.data.teamName} ${formatCr(evt.data.amount)}`);
      } else if (evt.type === "COIN_TOSS") {
        toast.success(`Coin toss winner: ${evt.data.winnerTeamName}`, { duration: 5000 });
      }
    });
    clientRef.current = client;
    return () => { client.deactivate(); };
  }, []);

  const doAdminAction = async (path: string, body?: any) => {
    try {
      await api.post(`/admin/auction/${path}`, body);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.response?.data || "Action failed");
    }
  };

  if (!state) {
    return (
      <div className="p-10 text-white/40 h-heading uppercase tracking-widest">Loading auction...</div>
    );
  }

  const current = state.currentPlayer;
  const highest = state.highestBid;
  const minNext = highest ? Number(highest.amount) + BID_INCREMENT : Number(current?.basePrice || 0);
  const secondsLeft = state.bidDeadline
    ? Math.max(0, Math.floor((new Date(state.bidDeadline).getTime() - now) / 1000))
    : null;
  const timerLow = secondsLeft !== null && secondsLeft <= 10;

  return (
    <div className="min-h-screen">
      <div className="p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="label-cap">Live Broadcast</div>
            <h1 className="h-heading text-5xl font-bold mt-1" data-testid="auction-heading">
              Auction Arena
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status={state.status} />
            {state.status === "RUNNING" && secondsLeft !== null && current && (
              <span className={`chip ${timerLow ? "chip-live" : "chip-primary"}`} data-testid="auction-timer">
                <Timer size={12} /> {secondsLeft}s
              </span>
            )}
            <span className="chip">
              <ListChecks size={12} /> {state.remainingPlayers} players left
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Center: Live Player Card */}
          <section className="col-span-12 lg:col-span-8 space-y-6">
            <div
              className={`relative overflow-hidden rounded-3xl border ${
                state.status === "RUNNING" ? "border-primary/40 live-glow" : "border-white/10"
              } ${flash ? "flash" : ""}`}
              data-testid="live-auction-card"
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "url(https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.28,
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(8,9,10,0.4) 0%, rgba(8,9,10,0.92) 80%)",
                }}
              />

              <div className="relative z-10 p-8 md:p-10 min-h-[420px] flex flex-col justify-end">
                {current ? (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="chip chip-live">
                        <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                        On the block
                      </span>
                      <span className="chip">{current.gender}</span>
                      {current.skillLevel && <span className="chip">{current.skillLevel}</span>}
                    </div>
                    <h2 className="h-heading text-6xl md:text-7xl font-bold leading-none" data-testid="current-player-name">
                      {current.fullName}
                    </h2>
                    <div className="mt-6 grid grid-cols-3 gap-6">
                      <div>
                        <div className="label-cap">Base Price</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="stat-num text-2xl">{formatCr(Number(current.basePrice))}</div>
                          {isAdmin && (
                            <button
                              onClick={() => setEditBasePriceFor(current)}
                              className="text-white/40 hover:text-primary"
                              title="Edit base price"
                              data-testid="edit-base-price-btn"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="label-cap">Current Bid</div>
                        <div className="stat-num text-4xl mt-1 text-primary drop-shadow-glow" data-testid="current-bid-amount">
                          {highest ? formatCr(Number(highest.amount)) : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="label-cap">
                          {state.status === "RUNNING" && secondsLeft !== null ? "Time Left" : "Leading"}
                        </div>
                        {state.status === "RUNNING" && secondsLeft !== null ? (
                          <div className={`stat-num text-4xl mt-1 ${timerLow ? "text-danger animate-pulse" : "text-secondary"}`}>
                            {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
                          </div>
                        ) : (
                          <div className="h-heading text-2xl mt-1" data-testid="leading-team">
                            {highest ? highest.teamName : "—"}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <div className="label-cap">No player on block</div>
                    <div className="h-heading text-3xl mt-2 text-white/60">
                      {state.status === "COMPLETED" ? "Auction Complete" : "Ready to start next player"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bid actions */}
            {current && state.status === "RUNNING" && (isAdmin || isOwner) && (
              <BidPanel
                minNext={minNext}
                current={current}
                teams={state.teams}
                userTeamId={user?.teamId}
                isAdmin={isAdmin}
              />
            )}

            {/* Admin control panel */}
            {isAdmin && (
              <div className="card-elev rounded-2xl p-6" data-testid="admin-controls">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="label-cap">Admin</div>
                    <h3 className="h-heading text-xl mt-1">Auction Controls</h3>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {state.status !== "RUNNING" ? (
                    <button className="btn btn-primary" onClick={() => doAdminAction("start")} data-testid="admin-start">
                      <Play size={16} /> Start
                    </button>
                  ) : (
                    <button className="btn btn-warn" onClick={() => doAdminAction("pause")} data-testid="admin-pause">
                      <Pause size={16} /> Pause
                    </button>
                  )}
                  {state.status === "PAUSED" && (
                    <button className="btn btn-primary" onClick={() => doAdminAction("resume")} data-testid="admin-resume">
                      <Play size={16} /> Resume
                    </button>
                  )}
                  <button className="btn btn-ghost" onClick={() => doAdminAction("undo")} data-testid="admin-undo">
                    <Undo2 size={16} /> Undo Bid
                  </button>
                  <button className="btn btn-primary" onClick={() => doAdminAction("sell")} data-testid="admin-sell">
                    <Hammer size={16} /> Sell (Highest)
                  </button>
                  <button className="btn btn-danger" onClick={() => doAdminAction("unsold")} data-testid="admin-unsold">
                    <XCircle size={16} /> Mark Unsold
                  </button>
                  <button className="btn btn-ghost" onClick={() => doAdminAction("next")} data-testid="admin-next">
                    <SkipForward size={16} /> Next Player
                  </button>
                  <button className="btn btn-cyan" onClick={() => setCoinTossOpen(true)} data-testid="admin-coin-toss">
                    <Shuffle size={16} /> Coin Toss
                  </button>
                </div>

                <div className="mt-6">
                  <div className="label-cap mb-2">Pick a specific player</div>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {availablePlayers.slice(0, 40).map((p) => (
                      <button
                        key={p.id}
                        className="chip hover:border-primary/60 hover:text-primary"
                        onClick={() => doAdminAction("set-current", { playerId: p.id })}
                        data-testid={`pick-player-${p.id}`}
                      >
                        {p.fullName} · {p.gender[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bid history */}
            <div className="card-elev rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="label-cap">Live feed</div>
                  <h3 className="h-heading text-xl mt-1">Bidding History</h3>
                </div>
                <span className="chip">{state.bidHistory.length} total</span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto" data-testid="bid-history">
                {state.bidHistory.length === 0 && (
                  <div className="text-white/40 text-sm">No bids yet.</div>
                )}
                {state.bidHistory.map((b) => (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between border-b border-white/5 py-2 ${
                      !b.active ? "opacity-40 line-through" : ""
                    }`}
                  >
                    <div>
                      <div className="text-sm">
                        <span className="text-white/60">{b.playerName}</span>
                        <span className="text-white/40 mx-1">·</span>
                        <span className="h-heading text-primary">{b.teamName}</span>
                      </div>
                      <div className="text-white/30 text-[10px]">{new Date(b.createdAt).toLocaleTimeString()}</div>
                    </div>
                    <div className="h-heading text-lg">{formatCr(Number(b.amount))}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Right: teams panel */}
          <aside className="col-span-12 lg:col-span-4 space-y-4">
            <div>
              <div className="label-cap mb-2">Teams · Purse</div>
              <div className="space-y-3">
                {state.teams.map((t) => {
                  const spent = Number(t.purseTotal) - Number(t.purseRemaining);
                  const pct = (spent / Number(t.purseTotal)) * 100;
                  const isLeading = highest?.teamId === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`rounded-2xl p-4 border transition-colors ${
                        isLeading
                          ? "border-primary bg-primary/5"
                          : "border-white/10 bg-bg-elev"
                      }`}
                      data-testid={`purse-card-${t.shortCode}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center h-heading font-bold"
                          style={{ background: t.primaryColor + "22", color: t.primaryColor, border: `1px solid ${t.primaryColor}55` }}
                        >
                          {t.shortCode}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{t.name}</div>
                          <div className="label-cap text-[10px]">Slots {t.totalPlayers}/12</div>
                        </div>
                        {isLeading && <span className="chip chip-primary">Leading</span>}
                      </div>
                      <div className="mt-3">
                        <div className="flex items-baseline justify-between">
                          <div className="stat-num text-xl text-primary">{formatCr(Number(t.purseRemaining))}</div>
                          <div className="label-cap text-[10px]">left</div>
                        </div>
                        <div className="h-1.5 mt-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.primaryColor }} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                          <div className="flex justify-between border border-white/10 rounded px-2 py-1">
                            <span className="text-white/50">M</span>
                            <span className="h-heading">{t.maleCount}/9</span>
                          </div>
                          <div className="flex justify-between border border-white/10 rounded px-2 py-1">
                            <span className="text-white/50">F</span>
                            <span className="h-heading">{t.femaleCount}/3</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {coinTossOpen && (
        <CoinTossDialog
          teams={state.teams}
          onClose={() => setCoinTossOpen(false)}
          onToss={async (ids) => {
            try {
              await api.post("/admin/auction/coin-toss", { teamIds: ids });
              setCoinTossOpen(false);
            } catch (e: any) {
              toast.error(e?.response?.data?.message || "Failed");
            }
          }}
        />
      )}

      {editBasePriceFor && (
        <BasePriceDialog
          player={editBasePriceFor}
          onClose={() => setEditBasePriceFor(null)}
          onSaved={() => setEditBasePriceFor(null)}
        />
      )}
    </div>
  );
}

function BasePriceDialog({ player, onClose, onSaved }: { player: PlayerDto; onClose: () => void; onSaved: () => void }) {
  const [price, setPrice] = useState<number>(Number(player.basePrice));
  const submit = async () => {
    try {
      await api.put(`/admin/auction/players/${player.id}/base-price`, { basePrice: price });
      toast.success(`Updated base price for ${player.fullName}`);
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.response?.data || "Failed");
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="card-elev rounded-2xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="label-cap">Player pricing</div>
        <h3 className="h-heading text-2xl mt-1 mb-4">{player.fullName}</h3>
        <div>
          <label className="label-cap block mb-2">Base price (₹)</label>
          <input
            type="number"
            step={100000}
            min={100000}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="input"
            data-testid="base-price-input"
          />
          <div className="text-white/40 text-xs mt-1">{formatCr(price)}</div>
        </div>
        <div className="flex gap-2 mt-6">
          <button className="btn btn-ghost flex-1 justify-center" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1 justify-center" onClick={submit} data-testid="save-base-price">Save</button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    RUNNING: "chip chip-live",
    PAUSED: "chip chip-primary",
    NOT_STARTED: "chip",
    COMPLETED: "chip chip-primary",
  };
  return (
    <span className={map[status] || "chip"} data-testid="auction-status">
      {status === "RUNNING" && <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />}
      {status.replaceAll("_", " ")}
    </span>
  );
}

function BidPanel({
  minNext, current, teams, userTeamId, isAdmin,
}: {
  minNext: number;
  current: PlayerDto;
  teams: TeamDto[];
  userTeamId?: string | null;
  isAdmin: boolean;
}) {
  const [selectedTeam, setSelectedTeam] = useState<string>(userTeamId || teams[0]?.id || "");
  const [amount, setAmount] = useState<number>(minNext);

  useEffect(() => { setAmount(minNext); }, [minNext]);
  useEffect(() => { if (userTeamId) setSelectedTeam(userTeamId); }, [userTeamId]);

  const placeBid = async () => {
    try {
      await api.post("/auction/bid", {
        playerId: current.id,
        teamId: selectedTeam,
        amount,
      });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.response?.data || "Bid failed");
    }
  };

  return (
    <div className="card-elev rounded-2xl p-6" data-testid="bid-panel">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {isAdmin ? (
          <div>
            <label className="label-cap block mb-2">Bidding team</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="input"
              data-testid="bid-team-select"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="label-cap block mb-2">Your team</label>
            <div className="input">{teams.find(t => t.id === userTeamId)?.name || "—"}</div>
          </div>
        )}
        <div>
          <label className="label-cap block mb-2">Bid amount (₹)</label>
          <input
            type="number"
            className="input"
            value={amount}
            min={minNext}
            step={500000}
            onChange={(e) => setAmount(Number(e.target.value))}
            data-testid="bid-amount"
          />
          <div className="text-white/40 text-[11px] mt-1">Min next: {formatCr(minNext)}</div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost flex-1 justify-center"
            onClick={() => setAmount(minNext)}
            data-testid="bid-quick-min"
          >
            {formatCr(minNext)}
          </button>
          <button
            className="btn btn-primary flex-1 justify-center"
            onClick={placeBid}
            data-testid="place-bid-btn"
          >
            Place Bid
          </button>
        </div>
      </div>
    </div>
  );
}

function CoinTossDialog({
  teams, onClose, onToss,
}: {
  teams: TeamDto[];
  onClose: () => void;
  onToss: (ids: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => {
    setSelected((s) => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="card-elev rounded-2xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="label-cap">Coin toss</div>
        <h3 className="h-heading text-2xl mt-1 mb-4">Break the tie</h3>
        <p className="text-white/50 text-sm mb-4">Pick 2 or more tied teams. Winner is chosen randomly.</p>
        <div className="space-y-2">
          {teams.map((t) => (
            <label key={t.id} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(t.id)}
                onChange={() => toggle(t.id)}
                className="w-4 h-4 accent-primary"
                data-testid={`toss-check-${t.shortCode}`}
              />
              <span>{t.name}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 mt-6">
          <button className="btn btn-ghost flex-1 justify-center" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-cyan flex-1 justify-center"
            disabled={selected.length < 2}
            onClick={() => onToss(selected)}
            data-testid="toss-flip"
          >
            Flip Coin
          </button>
        </div>
      </div>
    </div>
  );
}
