import type { ReactNode } from "react";
import { Pip, type PipMood } from "@/components/pip/Pip";

/** Empty state with Pip. */
export function Empty({ title, text, action, mood = "wave" }: { title: string; text?: ReactNode; action?: ReactNode; mood?: PipMood }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <Pip mood={mood} size={110} />
      <h3 className="text-lg font-bold">{title}</h3>
      {text && <p className="max-w-sm text-ink-2">{text}</p>}
      {action}
    </div>
  );
}
