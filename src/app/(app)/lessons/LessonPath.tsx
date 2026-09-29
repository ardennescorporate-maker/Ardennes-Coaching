"use client";
import Link from "next/link";
import { Check, Lock, Star } from "lucide-react";
import { Pip } from "@/components/pip/Pip";
import { useToast } from "@/components/ui/Toast";
import type { CourseTree } from "@/lib/server/lessons";

const OFFSETS = [0, 48, 78, 48, 0, -48, -78, -48];

export function LessonPath({ course }: { course: CourseTree }) {
  const toast = useToast();
  let i = 0;
  return (
    <div className="flex flex-col gap-6">
      {course.units.map((u, ui) => {
        const done = u.lessons.filter((l) => l.done).length;
        const complete = done === u.lessons.length;
        return (
          <section key={u.id} aria-labelledby={`unit-${u.id}`}>
            <div className="rounded-[20px] p-4 text-white sm:p-5" style={{ background: ui % 2 === 0 ? "#2F7BF5" : "#17307A", boxShadow: `0 4px 0 ${ui % 2 === 0 ? "#1B5CCB" : "#0E1F55"}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="micro text-white/80">
                    Unit {ui + 1} · {done}/{u.lessons.length} lessons
                  </p>
                  <h3 id={`unit-${u.id}`} className="font-display text-xl font-extrabold">
                    {u.title}
                  </h3>
                  <p className="text-sm text-white/85">{u.description}</p>
                </div>
                {complete && (
                  <span className="flex flex-none gap-0.5 text-yellow" aria-label="Unit complete, 3 stars">
                    {[0, 1, 2].map((s) => (
                      <Star key={s} size={20} fill="currentColor" aria-hidden />
                    ))}
                  </span>
                )}
              </div>
            </div>
            <ol className="mt-6 flex flex-col items-center gap-7">
              {u.lessons.map((l) => {
                const offset = OFFSETS[i++ % OFFSETS.length];
                const current = l.seq === course.currentSeq;
                const locked = !l.done && !current;
                const href = `/lessons/${course.slug}/${l.slug}`;
                const node = (
                  <span
                    className={`relative grid h-[72px] w-[72px] place-items-center rounded-full border-4 transition-transform ${
                      l.done
                        ? "border-yellow-deep bg-yellow text-[#3a2600] shadow-[0_6px_0_var(--yellow-deep)]"
                        : current
                          ? "border-blue-deep bg-blue text-white shadow-[0_6px_0_var(--blue-deep),0_0_0_10px_color-mix(in_srgb,var(--blue)_20%,transparent)]"
                          : "border-line bg-surface-2 text-ink-3 shadow-[0_6px_0_var(--line)]"
                    } group-hover:-translate-y-0.5 group-active:translate-y-1`}
                  >
                    {l.done ? <Check size={32} strokeWidth={3.5} aria-hidden /> : locked ? <Lock size={26} aria-hidden /> : <Star size={30} fill="currentColor" aria-hidden />}
                    {current && <span className="micro absolute -top-7 rounded-full bg-blue px-2 py-0.5 text-white shadow">START</span>}
                  </span>
                );
                const label = `${l.title}${l.done ? `, completed, ${l.stars} stars` : current ? ", current lesson" : ", locked"}`;
                return (
                  <li key={l.id} className="relative flex flex-col items-center" style={{ transform: `translateX(${offset}px)` }}>
                    {locked ? (
                      <button type="button" className="group rounded-full" aria-label={label} onClick={() => toast("Finish the lessons before this one to unlock it.")}>
                        {node}
                      </button>
                    ) : (
                      <Link href={href} className="group rounded-full" aria-label={label}>
                        {node}
                      </Link>
                    )}
                    {l.done && (
                      <span className="mt-2 flex gap-0.5 text-yellow-deep" aria-hidden>
                        {[1, 2, 3].map((s) => (
                          <Star key={s} size={14} fill={s <= l.stars ? "currentColor" : "none"} />
                        ))}
                      </span>
                    )}
                    <span className={`mt-1.5 max-w-[160px] text-center text-sm font-extrabold leading-tight ${locked ? "text-ink-3" : "text-ink"}`}>{l.title}</span>
                    {current && (
                      <span className={`absolute top-0 ${offset > 0 ? "right-full mr-3" : "left-full ml-3"} hidden sm:block`} aria-hidden>
                        <Pip mood="wave" size={80} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
