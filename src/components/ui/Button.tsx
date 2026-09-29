import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

export type ButtonVariant = "primary" | "gold" | "secondary" | "ghost" | "danger" | "danger-solid";
type Common = { variant?: ButtonVariant; size?: "sm" | "md" | "lg"; block?: boolean; icon?: ReactNode };

export function buttonClass({ variant = "secondary", size = "md", block }: Common = {}, extra?: string) {
  return cx("btn", `btn-${variant}`, size !== "md" && `btn-${size}`, block && "btn-block", extra);
}

export function Button({ variant, size, block, icon, className, children, type = "button", ...rest }: Common & ComponentProps<"button">) {
  return (
    <button type={type} className={buttonClass({ variant, size, block }, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, block, icon, className, children, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass({ variant, size, block }, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
