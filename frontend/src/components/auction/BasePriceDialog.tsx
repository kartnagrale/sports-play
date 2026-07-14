"use client";

import { useState } from "react";
import { api, PlayerDto } from "@/lib/api";
import { formatCr } from "@/lib/format";
import { toast } from "sonner";

interface Props {
  player: PlayerDto;
  onClose: () => void;
  onSaved: () => void;
}

export default function BasePriceDialog({ player, onClose, onSaved }: Props) {
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
          <button className="btn btn-primary flex-1 justify-center" onClick={submit} data-testid="save-base-price">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
