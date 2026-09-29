import Link from "next/link";
import { PipFace } from "@/components/pip/Pip";

export function Logo({ href = "/home", compact }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-xl" aria-label="StudyPilot home">
      <span className="grid h-11 w-11 flex-none place-items-center overflow-hidden rounded-[14px] border-2 border-blue bg-blue-soft">
        <PipFace size={38} />
      </span>
      {!compact && <span className="font-display text-[22px] font-extrabold tracking-tight text-ink">StudyPilot</span>}
    </Link>
  );
}
