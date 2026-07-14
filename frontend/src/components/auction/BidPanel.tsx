"use client";

import { useEffect, useState } from "react";
import { api, TeamDto, PlayerDto } from "@/lib/api";
import { formatCr } from "@/lib/format";
import { toast } from "sonner";

const BID_INCREMENT = 500_000;

interface Props {
  minNext: number;
  current: PlayerDto;
  teams: TeamDto[];
  userTeamId?: string | null;
  isAdmin: boolean;
}

export default function BidPanel({ minNext, current, teams, userTeamId, isAdmin }: Props) {
  const [selectedTeam, setSelectedTeam] = useState<string>(userTeamId || teams[0]?.id || "");
  const [amount, setAmount] = useState<number>(minNext);

  useEffect(() => {
    setAmount(minNext);
  }, [minNext]);

  useEffect(() => {
    if (userTeamId) setSelectedTeam(userTeamId);
  }, [userTeamId]);

  const placeBid = async () => {
    try {
      await api.post("/auction/bid", { playerId: current.id, teamId: selectedTeam, amount });
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
            <div className="input">{teams.find((t) => t.id === userTeamId)?.name || "—"}</div>
          </div>
        )}
        <div>
          <label className="label-cap block mb-2">Bid amount (₹)</label>
          <input
            type="number"
            className="input"
            value={amount}
            min={minNext}
            step={BID_INCREMENT}
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
