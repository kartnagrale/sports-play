"use client";

import { useEffect, useState } from "react";
import { api, BidDto } from "@/lib/api";
import { formatCr } from "@/lib/format";

export default function AuctionHistoryPage() {
  const [bids, setBids] = useState<BidDto[]>([]);
  useEffect(() => {
    api.get<BidDto[]>("/auction/history").then((r) => setBids(r.data));
  }, []);
  return (
    <div className="p-10">
      <div className="mb-8">
        <div className="label-cap">Archive</div>
        <h1 className="h-heading text-5xl font-bold mt-1">Auction History</h1>
        <p className="text-white/50 mt-2">Every bid in chronological order across all players.</p>
      </div>
      <div className="card-elev rounded-2xl p-6">
        <table className="w-full text-sm">
          <thead className="text-left label-cap text-[10px]">
            <tr className="border-b border-white/10">
              <th className="py-3 pr-4">Time</th>
              <th className="py-3 pr-4">Player</th>
              <th className="py-3 pr-4">Team</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bids.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-white/40">No bids yet.</td></tr>
            )}
            {bids.map((b) => (
              <tr key={b.id} className={`border-b border-white/5 ${!b.active ? "opacity-40 line-through" : ""}`}>
                <td className="py-3 pr-4 text-white/50">{new Date(b.createdAt).toLocaleString()}</td>
                <td className="py-3 pr-4">{b.playerName}</td>
                <td className="py-3 pr-4 h-heading text-primary">{b.teamName}</td>
                <td className="py-3 pr-4"><span className={`chip ${b.active ? "chip-primary" : ""}`}>{b.active ? "Active" : "Undone"}</span></td>
                <td className="py-3 pr-4 text-right h-heading">{formatCr(Number(b.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
