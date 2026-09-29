"use client";
import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { useRewards } from "@/components/rewards/Rewards";
import { logStudyAction } from "./actions";

export function LogStudyForm({ subjects, onDone, dark }: { subjects: string[]; onDone?: () => void; dark?: boolean }) {
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [fileName, setFileName] = useState("");
  const [pending, start] = useTransition();
  const celebrate = useRewards();
  return (
    <form
      className={`grid gap-3 rounded-2xl p-4 sm:grid-cols-[1fr_120px] ${dark ? "bg-white/10" : "bg-surface-2"}`}
      action={(fd) =>
        start(async () => {
          const r = await logStudyAction(fd);
          if (r.ok) {
            celebrate(r.reward, `Logged ${r.minutes} minutes of study`);
            setMsg({ ok: `Verified! ${r.minutes} minutes logged.` });
            setFileName("");
            onDone?.();
          } else setMsg(r.review ? { ok: r.error } : { error: r.error });
        })
      }
    >
      <label className="block">
        <span className={`label ${dark ? "!text-white/80" : ""}`}>Subject</span>
        <select name="subject" className="field" required>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={`label ${dark ? "!text-white/80" : ""}`}>Minutes</span>
        <input name="minutes" type="number" min={10} max={240} defaultValue={45} required className="field num" />
      </label>
      <label className="block sm:col-span-2">
        <span className={`label ${dark ? "!text-white/80" : ""}`}>Evidence</span>
        <span className="field flex cursor-pointer items-center gap-2 text-ink-2">
          <Upload size={18} aria-hidden />
          <span className="truncate">{fileName || "Photo of notes, screenshot, PDF, DOC or TXT"}</span>
          <input
            name="evidence"
            type="file"
            required
            accept="image/*,.pdf,.doc,.docx,.txt"
            capture="environment"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
        </span>
        <span className={`mt-1 block text-xs ${dark ? "text-white/70" : "text-ink-3"}`}>Pip checks photos to keep leaderboards fair. Files stay private to you.</span>
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Pip is checking…" : "Log verified study"}
        </button>
        {msg && (
          <p role={msg.error ? "alert" : "status"} className={`rounded-xl px-3 py-1.5 text-sm font-bold ${msg.error ? "bg-bad-soft text-bad" : "bg-good-soft text-good"}`}>
            {msg.error ?? msg.ok}
          </p>
        )}
      </div>
    </form>
  );
}
