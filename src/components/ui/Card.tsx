import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

export function Card({ className, pad = true, ...rest }: ComponentProps<"section"> & { pad?: boolean }) {
  return <section className={cx("card", pad && "card-pad", className)} {...rest} />;
}

export function CardHeader({ title, action, sub }: { title: ReactNode; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-bold">{title}</h2>
        {sub && <p className="text-sm text-ink-3">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
