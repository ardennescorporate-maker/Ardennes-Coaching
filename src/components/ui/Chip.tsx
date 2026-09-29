"use client";
import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

export function Chip({ selected, className, ...rest }: ComponentProps<"button"> & { selected?: boolean }) {
  return <button type="button" aria-pressed={selected} className={cx("chip", className)} {...rest} />;
}

/** Single-select chip group. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly NoInfer<T>[] | readonly { value: NoInfer<T>; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? o : o.label;
        return (
          <button key={v} type="button" role="radio" aria-checked={value === v} className="chip" onClick={() => onChange(v)}>
            {l}
          </button>
        );
      })}
    </div>
  );
}
