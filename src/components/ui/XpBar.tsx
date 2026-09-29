import { cx } from "@/lib/cx";

export function XpBar({ value, max, label, className }: { value: number; max: number; label?: string; className?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className={cx("xpbar", className)}
      role="progressbar"
      aria-label={label ?? "XP progress"}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ProgressBar({ value, max, label, className }: { value: number; max: number; label?: string; className?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cx("progress", className)} role="progressbar" aria-label={label ?? "Progress"} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
