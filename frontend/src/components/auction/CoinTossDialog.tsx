"use client";

import { useState } from "react";
import { TeamDto } from "@/lib/api";

interface Props {
  teams: TeamDto[];
  onClose: () => void;
  onToss: (ids: string[]) => Promise<void>;
}

export default function CoinTossDialog({ teams, onClose, onToss }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
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
