import { Pip } from "@/components/pip/Pip";

export default function Loading() {
  return (
    <div className="flex flex-col items-center gap-3 py-20" aria-live="polite" aria-busy="true">
      <Pip mood="think" size={100} animation="tilt" label="" />
      <p className="font-bold text-ink-3">Loading…</p>
    </div>
  );
}
