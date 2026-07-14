"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, AuctionStateDto, PlayerDto } from "@/lib/api";
import { createAuctionSocket } from "@/lib/ws";
import { useAuth } from "@/lib/auth";
import { formatCr } from "@/lib/format";
import { toast } from "sonner";
import type { Client } from "@stomp/stompjs";
import {
  Play, Pause, Undo2, Hammer, XCircle, Shuffle, SkipForward, ListChecks, Timer, Pencil,
} from "lucide-react";
import BidPanel from "@/components/auction/BidPanel";
import CoinTossDialog from "@/components/auction/CoinTossDialog";
import BasePriceDialog from "@/components/auction/BasePriceDialog";

const BID_INCREMENT = 500_000;

export default function AuctionPage() {
  const { user } = useAuth();
  const [state, setState] = useState<AuctionStateDto | null>(null);
  const [flash, setFlash] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerDto[]>([]);
  const [coinTossOpen, setCoinTossOpen] = useState(false);
  const [editBasePriceFor, setEditBasePriceFor] = useState<PlayerDto | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const clientRef = useRef<Client | null>(null);
  const isAdmin = user?.role === "ADMIN";
  const isOwner = user?.role === "TEAM_OWNER";

  // Countdown ticker
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch state + available player list. Stable identity so effects can depend on it.
  const load = useCallback(async () => {
    const [s, p] = await Promise.all([
      api.get<AuctionStateDto>("/auction/state"),
      api.get<PlayerDto[]>("/players"),
    ]);
    setState(s.data);
    setAvailablePlayers(p.data.filter((x) => x.status === "AVAILABLE" || x.status === "UNSOLD"));
  }, []);

  const handleEvent = useCallback((evt: { type: string; data: any }) => {
    if (evt.type === "STATE") {
      setState(evt.data);
      api
        .get<PlayerDto[]>("/players")
        .then((r) =>
          setAvailablePlayers(r.data.filter((x) => x.status === "AVAILABLE" || x.status === "UNSOLD"))
        )
        .catch((err) => console.warn("failed to reload players", err));
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
  }, []);

  useEffect(() => {
    load().catch((err) => console.warn("initial load failed", err));
    const client = createAuctionSocket(handleEvent);
    clientRef.current = client;
    return () => {
      client.deactivate();
    };
  }, [load, handleEvent]);

  const doAdminAction = async (path: string, body?: any) => {
    try {
      await api.post(`/admin/auction/${path}`, body);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.response?.data || "Action failed");
    }
  };

  if (!state) {
    return <div className="p-10 text-white/40 h-heading uppercase tracking-widest">Loading auction...</div>;
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
        <AuctionHeader status={state.status} secondsLeft={secondsLeft} timerLow={timerLow} remaining={state.remainingPlayers} showTimer={!!current} />

        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-12 lg:col-span-8 space-y-6">
            <LivePlayerCard
              status={state.status}
              current={current}
              highest={highest}
              secondsLeft={secondsLeft}
              timerLow={timerLow}
              flash={flash}
              isAdmin={isAdmin}
              onEditBasePrice={setEditBasePriceFor}
            />

            {current && state.status === "RUNNING" && (isAdmin || isOwner) && (
              <BidPanel
                minNext={minNext}
                current={current}
                teams={state.teams}
                userTeamId={user?.teamId}
                isAdmin={isAdmin}
              />
            )}

            {isAdmin && (
              <AdminControlPanel
                status={state.status}
                availablePlayers={availablePlayers}
                onAction={doAdminAction}
                onOpenCoinToss={() => setCoinTossOpen(true)}
              />
            )}

            <BidHistoryList bids={state.bidHistory} />
          </section>

          <aside className="col-span-12 lg:col-span-4 space-y-4">
            <div>
              <div className="label-cap mb-2">Teams · Purse</div>
              <div className="space-y-3">
                {state.teams.map((t) => (
                  <TeamPurseCard key={t.id} team={t} leadingTeamId={highest?.teamId} />
                ))}
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

/* ------------------------------ sub-components ------------------------------ */

function AuctionHeader({
  status, secondsLeft, timerLow, remaining, showTimer,
}: { status: string; secondsLeft: number | null; timerLow: boolean; remaining: number; showTimer: boolean }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <div className="label-cap">Live Broadcast</div>
        <h1 className="h-heading text-5xl font-bold mt-1" data-testid="auction-heading">Auction Arena</h1>
      </div>
      <div className="flex items-center gap-3">
        <StatusPill status={status} />
        {status === "RUNNING" && secondsLeft !== null && showTimer && (
          <span className={`chip ${timerLow ? "chip-live" : "chip-primary"}`} data-testid="auction-timer">
            <Timer size={12} /> {secondsLeft}s
          </span>
        )}
        <span className="chip">
          <ListChecks size={12} /> {remaining} players left
        </span>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "RUNNING" ? "chip chip-live" :
    status === "PAUSED" ? "chip chip-primary" :
    status === "COMPLETED" ? "chip chip-primary" :
    "chip";
  return (
    <span className={cls} data-testid="auction-status">
      {status === "RUNNING" && <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />}
      {status.replaceAll("_", " ")}
    </span>
  );
}

function LivePlayerCard({
  status, current, highest, secondsLeft, timerLow, flash, isAdmin, onEditBasePrice,
}: {
  status: string;
  current: PlayerDto | null | undefined;
  highest: any;
  secondsLeft: number | null;
  timerLow: boolean;
  flash: boolean;
  isAdmin: boolean;
  onEditBasePrice: (p: PlayerDto) => void;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border ${status === "RUNNING" ? "border-primary/40 live-glow" : "border-white/10"} ${flash ? "flash" : ""}`}
      data-testid="live-auction-card"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.28,
        }}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,9,10,0.4) 0%, rgba(8,9,10,0.92) 80%)" }} />

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
                      onClick={() => onEditBasePrice(current)}
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
              <TimerOrLeader status={status} secondsLeft={secondsLeft} timerLow={timerLow} highest={highest} />
            </div>
          </>
        ) : (
          <EmptyPlayerState status={status} />
        )}
      </div>
    </div>
  );
}

function TimerOrLeader({ status, secondsLeft, timerLow, highest }: any) {
  if (status === "RUNNING" && secondsLeft !== null) {
    return (
      <div>
        <div className="label-cap">Time Left</div>
        <div className={`stat-num text-4xl mt-1 ${timerLow ? "text-danger animate-pulse" : "text-secondary"}`}>
          {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="label-cap">Leading</div>
      <div className="h-heading text-2xl mt-1" data-testid="leading-team">{highest ? highest.teamName : "—"}</div>
    </div>
  );
}

function EmptyPlayerState({ status }: { status: string }) {
  const msg = status === "COMPLETED" ? "Auction Complete" : "Ready to start next player";
  return (
    <div className="text-center py-16">
      <div className="label-cap">No player on block</div>
      <div className="h-heading text-3xl mt-2 text-white/60">{msg}</div>
    </div>
  );
}

function AdminControlPanel({
  status, availablePlayers, onAction, onOpenCoinToss,
}: {
  status: string;
  availablePlayers: PlayerDto[];
  onAction: (path: string, body?: any) => Promise<void>;
  onOpenCoinToss: () => void;
}) {
  return (
    <div className="card-elev rounded-2xl p-6" data-testid="admin-controls">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="label-cap">Admin</div>
          <h3 className="h-heading text-xl mt-1">Auction Controls</h3>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {status !== "RUNNING" ? (
          <button className="btn btn-primary" onClick={() => onAction("start")} data-testid="admin-start">
            <Play size={16} /> Start
          </button>
        ) : (
          <button className="btn btn-warn" onClick={() => onAction("pause")} data-testid="admin-pause">
            <Pause size={16} /> Pause
          </button>
        )}
        {status === "PAUSED" && (
          <button className="btn btn-primary" onClick={() => onAction("resume")} data-testid="admin-resume">
            <Play size={16} /> Resume
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => onAction("undo")} data-testid="admin-undo">
          <Undo2 size={16} /> Undo Bid
        </button>
        <button className="btn btn-primary" onClick={() => onAction("sell")} data-testid="admin-sell">
          <Hammer size={16} /> Sell (Highest)
        </button>
        <button className="btn btn-danger" onClick={() => onAction("unsold")} data-testid="admin-unsold">
          <XCircle size={16} /> Mark Unsold
        </button>
        <button className="btn btn-ghost" onClick={() => onAction("next")} data-testid="admin-next">
          <SkipForward size={16} /> Next Player
        </button>
        <button className="btn btn-cyan" onClick={onOpenCoinToss} data-testid="admin-coin-toss">
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
              onClick={() => onAction("set-current", { playerId: p.id })}
              data-testid={`pick-player-${p.id}`}
            >
              {p.fullName} · {p.gender[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BidHistoryList({ bids }: { bids: AuctionStateDto["bidHistory"] }) {
  return (
    <div className="card-elev rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="label-cap">Live feed</div>
          <h3 className="h-heading text-xl mt-1">Bidding History</h3>
        </div>
        <span className="chip">{bids.length} total</span>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto" data-testid="bid-history">
        {bids.length === 0 && <div className="text-white/40 text-sm">No bids yet.</div>}
        {bids.map((b) => (
          <div key={b.id} className={`flex items-center justify-between border-b border-white/5 py-2 ${!b.active ? "opacity-40 line-through" : ""}`}>
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
  );
}

function TeamPurseCard({ team, leadingTeamId }: { team: AuctionStateDto["teams"][number]; leadingTeamId?: string }) {
  const spent = Number(team.purseTotal) - Number(team.purseRemaining);
  const pct = (spent / Number(team.purseTotal)) * 100;
  const isLeading = leadingTeamId === team.id;
  return (
    <div
      className={`rounded-2xl p-4 border transition-colors ${isLeading ? "border-primary bg-primary/5" : "border-white/10 bg-bg-elev"}`}
      data-testid={`purse-card-${team.shortCode}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center h-heading font-bold"
          style={{ background: team.primaryColor + "22", color: team.primaryColor, border: `1px solid ${team.primaryColor}55` }}
        >
          {team.shortCode}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{team.name}</div>
          <div className="label-cap text-[10px]">Slots {team.totalPlayers}/12</div>
        </div>
        {isLeading && <span className="chip chip-primary">Leading</span>}
      </div>
      <div className="mt-3">
        <div className="flex items-baseline justify-between">
          <div className="stat-num text-xl text-primary">{formatCr(Number(team.purseRemaining))}</div>
          <div className="label-cap text-[10px]">left</div>
        </div>
        <div className="h-1.5 mt-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: team.primaryColor }} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
          <div className="flex justify-between border border-white/10 rounded px-2 py-1">
            <span className="text-white/50">M</span>
            <span className="h-heading">{team.maleCount}/9</span>
          </div>
          <div className="flex justify-between border border-white/10 rounded px-2 py-1">
            <span className="text-white/50">F</span>
            <span className="h-heading">{team.femaleCount}/3</span>
          </div>
        </div>
      </div>
    </div>
  );
}
