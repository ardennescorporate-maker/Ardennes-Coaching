import Link from "next/link";
import type { T } from "@/lib/i18n/messages";

export function BetaBanner({ t }: { t: T }) {
  return (
    <div className="border-b-2 border-[color-mix(in_srgb,var(--yellow)_45%,transparent)] bg-yellow-soft px-4 py-2 text-center text-[13px] font-bold text-ink sm:px-6">
      <span className="beta-tag mr-2">BETA</span>
      {t("shell.betaBanner")}{" "}
      <Link href="/feedback" className="whitespace-nowrap font-extrabold text-blue-deep underline underline-offset-2 dark:text-blue-ink">
        {t("shell.sendFeedback")}
      </Link>
    </div>
  );
}
