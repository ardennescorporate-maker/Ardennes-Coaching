"use client";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import type { SettingsState } from "../actions";

export function Msg({ state }: { state: SettingsState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-bold text-bad-ink">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="rounded-xl bg-good-soft px-3 py-2 text-sm font-bold text-good-ink">
        {state.ok}
      </p>
    );
  return null;
}

export function Save({ children = "Save", variant = "primary" }: { children?: ReactNode; variant?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn btn-${variant}`} disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}

export function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
      <div className="min-w-0">
        <p className="font-extrabold">{title}</p>
        {hint && <p className="text-sm text-ink-3">{hint}</p>}
      </div>
      <div className="flex-none">{children}</div>
    </div>
  );
}
