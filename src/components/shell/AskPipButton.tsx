"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PipFace } from "@/components/pip/Pip";

/** Floating "Ask Pip" button; hidden on the tutor and inside lessons. */
export function AskPipButton({ label }: { label: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/tutor") || /^\/lessons\/[^/]+\/[^/]+/.test(pathname) || /^\/papers\/[^/]+/.test(pathname)) return null;
  return (
    <Link
      href="/tutor"
      className="btn btn-primary fixed right-4 bottom-4 z-40 !min-h-[54px] !rounded-full !pl-2 !pr-5 normal-case sm:right-6 sm:bottom-6"
      style={{ textTransform: "none" }}
    >
      <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-blue-soft">
        <PipFace size={36} />
      </span>
      {label}
    </Link>
  );
}
