"use client";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Pip } from "@/components/pip/Pip";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { XpBar } from "@/components/ui/XpBar";
import { levelProgress } from "@/lib/domain/levels";

export type RewardLike = { awarded: number; xp: number; level: number; leveledUp: boolean; badges?: { id: string; title: string }[] } | null | undefined;

const Ctx = createContext<(r: RewardLike, message?: string) => void>(() => {});

/** Shows "+N XP" toasts, badge toasts and the level-up modal, then refreshes the shell. */
export function RewardsProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const router = useRouter();
  const [level, setLevel] = useState<{ level: number; xp: number } | null>(null);

  const celebrate = useCallback(
    (r: RewardLike, message = "Nice work!") => {
      if (!r) return;
      if (r.awarded > 0) toast(message, r.awarded);
      r.badges?.forEach((b, i) => setTimeout(() => toast(`Badge unlocked: ${b.title}`), 600 * (i + 1)));
      if (r.leveledUp) setLevel({ level: r.level, xp: r.xp });
      router.refresh();
    },
    [toast, router],
  );

  const lp = level ? levelProgress(level.xp) : null;
  return (
    <Ctx.Provider value={celebrate}>
      {children}
      <Modal open={Boolean(level)} onClose={() => setLevel(null)} title="Level up" hideClose>
        {level && lp && (
          <div className="flex flex-col items-center gap-3 text-center">
            <Pip mood="cheer" size={150} />
            <p className="micro text-blue-ink">Level up</p>
            <h2 className="font-display text-3xl font-extrabold">Level {level.level}! You&apos;re flying now.</h2>
            <div className="w-full">
              <XpBar value={lp.into} max={lp.span} />
              <p className="num mt-1 text-sm text-ink-3">{lp.toNext.toLocaleString()} XP to Level {level.level + 1}</p>
            </div>
            <button type="button" className="btn btn-gold btn-lg btn-block" onClick={() => setLevel(null)} autoFocus>
              Keep going
            </button>
          </div>
        )}
      </Modal>
    </Ctx.Provider>
  );
}

export const useRewards = () => useContext(Ctx);
