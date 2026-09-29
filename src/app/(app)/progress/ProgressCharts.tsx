"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";

type Props = {
  tiles: { hours14: number; avg: number | null; trend: number | null; accuracy: number | null; answered: number; predicted: string | null };
  minutes: { date: string; label: string; minutes: number }[];
  papers: { n: number; label: string; pct: number; title: string }[];
  subjectTime: { subject: string; hours: number }[];
  subjectPerf: { subject: string; pct: number }[];
  weak: { subject: string; topic: string; misses: number }[];
};

const TOKENS = ["--blue", "--blue-soft", "--line", "--ink", "--ink-2", "--ink-3", "--surface", "--good", "--warn", "--bad", "--yellow"] as const;
type Colors = Record<(typeof TOKENS)[number], string>;
const FALLBACK: Colors = { "--blue": "#2F7BF5", "--blue-soft": "#E4EEFF", "--line": "#DCE4F0", "--ink": "#0F1E3D", "--ink-2": "#4A5B7A", "--ink-3": "#8593AD", "--surface": "#FFFFFF", "--good": "#1FA463", "--warn": "#D99100", "--bad": "#E5484D", "--yellow": "#FFC226" };
let cache: { theme: string; colors: Colors } | null = null;

/** Resolved theme colours for SVG attributes (CSS variables don't work there), updated on theme change. */
function useColors(): Colors {
  return useSyncExternalStore(
    (cb) => {
      const o = new MutationObserver(cb);
      o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => o.disconnect();
    },
    () => {
      const theme = document.documentElement.dataset.theme ?? "light";
      if (cache?.theme !== theme) {
        const cs = getComputedStyle(document.documentElement);
        cache = { theme, colors: Object.fromEntries(TOKENS.map((t) => [t, cs.getPropertyValue(t).trim() || FALLBACK[t]])) as Colors };
      }
      return cache.colors;
    },
    () => FALLBACK,
  );
}

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number; payload: Record<string, unknown> }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border-2 border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="font-extrabold">{(p.payload.title as string) ?? label}</p>
      <p className="num text-ink-2">
        {p.value}
        {unit}
      </p>
    </div>
  );
}

export function ProgressCharts(p: Props) {
  const c = useColors();
  const axis = { stroke: c["--line"], tick: { fill: c["--ink-3"], fontSize: 11, fontFamily: "var(--font-sans)" }, tickLine: false };
  const tone = (pct: number) => (pct >= 70 ? c["--good"] : pct >= 50 ? c["--warn"] : c["--bad"]);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Study hours" value={`${p.tiles.hours14}`} sub="last 14 days" />
        <Tile label="Average paper score" value={p.tiles.avg !== null ? `${p.tiles.avg}%` : "—"} sub={p.tiles.trend !== null ? `${p.tiles.trend >= 0 ? "▲" : "▼"} ${Math.abs(p.tiles.trend)} pts vs earlier papers` : "Do more papers to see a trend"} subTone={p.tiles.trend === null ? undefined : p.tiles.trend >= 0 ? "good" : "bad"} />
        <Tile label="Quiz accuracy" value={p.tiles.accuracy !== null ? `${p.tiles.accuracy}%` : "—"} sub={`${p.tiles.answered.toLocaleString()} questions answered`} />
        <Tile label="Predicted result" value={p.tiles.predicted ?? "—"} sub="from your last 3 papers" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Minutes studied per day" sub="Verified sessions, last 14 days" />
          <div className="h-60" role="img" aria-label="Bar chart of minutes studied per day">
            <ResponsiveContainer>
              <BarChart data={p.minutes} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={c["--line"]} strokeDasharray="3 3" />
                <XAxis dataKey="label" {...axis} interval={1} />
                <YAxis {...axis} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: c["--blue-soft"] }} content={<ChartTooltip unit=" min" />} />
                <Bar dataKey="minutes" fill={c["--blue"]} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <DataTable caption="Minutes studied per day" rows={p.minutes.map((d) => [d.label, `${d.minutes} min`])} />
        </Card>

        <Card>
          <CardHeader title="Practice paper scores" sub="Last 10 papers" />
          {p.papers.length === 0 ? (
            <Empty title="No papers yet" text="Your scores will appear here after your first practice paper." mood="think" />
          ) : (
            <>
              <div className="h-60" role="img" aria-label="Line chart of practice paper scores">
                <ResponsiveContainer>
                  <AreaChart data={p.papers} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c["--blue"]} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={c["--blue"]} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={c["--line"]} strokeDasharray="3 3" />
                    <XAxis dataKey="label" {...axis} />
                    <YAxis domain={[0, 100]} {...axis} axisLine={false} unit="%" />
                    <Tooltip cursor={{ stroke: c["--ink-3"], strokeDasharray: "3 3" }} content={<ChartTooltip unit="%" />} />
                    <Area type="monotone" dataKey="pct" stroke={c["--blue"]} strokeWidth={2} fill="url(#scoreFill)" dot={{ r: 4, fill: c["--blue"], stroke: c["--surface"], strokeWidth: 2 }} activeDot={{ r: 6, stroke: c["--surface"], strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <DataTable caption="Paper scores" rows={p.papers.map((x) => [`${x.label} · ${x.title}`, `${x.pct}%`])} />
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Time by subject" sub="All verified study, in hours" />
          {p.subjectTime.length === 0 ? (
            <p className="text-ink-3">Log a study session to see this.</p>
          ) : (
            <div style={{ height: Math.max(120, p.subjectTime.length * 44) }} role="img" aria-label="Bar chart of hours studied by subject">
              <ResponsiveContainer>
                <BarChart data={p.subjectTime} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="subject" width={150} {...axis} axisLine={false} />
                  <Tooltip cursor={{ fill: c["--blue-soft"] }} content={<ChartTooltip unit=" h" />} />
                  <Bar dataKey="hours" fill={c["--blue"]} radius={[0, 4, 4, 0]} barSize={20}>
                    <LabelList dataKey="hours" position="right" fill={c["--ink-2"]} fontSize={12} formatter={(v) => `${v}h`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Subject performance" sub="Average practice paper score" />
          {p.subjectPerf.length === 0 ? (
            <p className="text-ink-3">Do a practice paper to see this.</p>
          ) : (
            <div style={{ height: Math.max(120, p.subjectPerf.length * 44) }} role="img" aria-label="Bar chart of average paper score by subject">
              <ResponsiveContainer>
                <BarChart data={p.subjectPerf} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="subject" width={150} {...axis} axisLine={false} />
                  <Tooltip cursor={{ fill: c["--blue-soft"] }} content={<ChartTooltip unit="%" />} />
                  <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={20} background={{ fill: c["--blue-soft"], radius: 4 }}>
                    {p.subjectPerf.map((s) => (
                      <Cell key={s.subject} fill={tone(s.pct)} />
                    ))}
                    <LabelList dataKey="pct" position="right" fill={c["--ink-2"]} fontSize={12} formatter={(v) => `${v}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-xs text-ink-3">Green 70%+, amber 50–69%, red under 50%.</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Weak areas" sub="Topics you've missed most in lessons, quizzes and papers" />
        {p.weak.length === 0 ? (
          <p className="text-ink-3">No weak areas yet. Keep practising and Pip will spot patterns.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {p.weak.map((w) => (
              <li key={w.subject + w.topic} className="flex items-center gap-2 rounded-2xl border-2 border-line bg-surface-2 py-1 pl-3 pr-1">
                <span className="text-sm">
                  <span className="font-extrabold">{w.topic}</span> <span className="text-ink-3">· {w.subject}</span>
                </span>
                <span className="pill pill-warn num">×{w.misses}</span>
                <Link href={`/tutor?subject=${encodeURIComponent(w.subject)}&q=${encodeURIComponent(`Can you explain ${w.topic} step by step? I keep getting it wrong.`)}`} className="btn btn-secondary btn-sm !min-h-8">
                  Ask tutor
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Tile({ label, value, sub, subTone }: { label: string; value: string; sub: string; subTone?: "good" | "bad" }) {
  return (
    <div className="card card-pad">
      <p className="micro text-ink-3">{label}</p>
      <p className="num mt-1 text-3xl font-bold">{value}</p>
      <p className={`text-sm ${subTone === "good" ? "font-bold text-good" : subTone === "bad" ? "font-bold text-bad" : "text-ink-3"}`}>{sub}</p>
    </div>
  );
}

/** Screen-reader table view of a chart's data. */
function DataTable({ caption, rows }: { caption: string; rows: string[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
