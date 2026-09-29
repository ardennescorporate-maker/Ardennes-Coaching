import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

export function Field({ label, hint, error, children, className }: { label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1 block text-xs font-bold text-bad">
          {error}
        </span>
      )}
    </label>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cx("field", className)} {...rest} />;
}
export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cx("field", className)} {...rest} />;
}
export function Select({ className, ...rest }: ComponentProps<"select">) {
  return <select className={cx("field", className)} {...rest} />;
}
