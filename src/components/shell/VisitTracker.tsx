"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Counts screen visits for the admin "most used features" chart. */
export function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const feature = pathname.split("/")[1];
    if (!feature) return;
    const body = JSON.stringify({ feature });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/visit", new Blob([body], { type: "application/json" }));
    else void fetch("/api/visit", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  }, [pathname]);
  return null;
}
