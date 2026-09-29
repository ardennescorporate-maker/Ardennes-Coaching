"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Pip } from "@/components/pip/Pip";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <Pip mood="think" size={130} animation="tilt" />
      <h2 className="text-2xl font-extrabold">Something went wrong on this page</h2>
      <p className="text-ink-2">Try again. If it keeps happening, send us a bug report and we&apos;ll fix it.{error.digest ? ` (Reference: ${error.digest})` : ""}</p>
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/feedback" className="btn btn-secondary">
          Report a bug
        </Link>
      </div>
    </div>
  );
}
