"use client";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import type { FormState } from "./actions";

export function Submit({ children, variant = "primary" }: { children: ReactNode; variant?: "primary" | "gold" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn btn-${variant} btn-lg btn-block`} disabled={pending} aria-busy={pending}>
      {pending ? "One moment…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
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

export function CodeInput({ name = "code", invalid }: { name?: string; invalid?: boolean }) {
  return (
    <input
      name={name}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      required
      aria-invalid={invalid}
      aria-label="6-digit code"
      placeholder="••••••"
      className="field num text-center text-3xl tracking-[0.5em]"
    />
  );
}
