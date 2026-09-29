"use client";
import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { Pip } from "@/components/pip/Pip";
import { Card, CardHeader } from "@/components/ui/Card";
import { SUBJECTS } from "@/lib/domain/catalog";
import { createEmptyDeckAction, generateDeckAction } from "./actions";
import { compressFormImages } from "@/lib/compress-image";

export function CreateDeck({ subjects, prefill, prefillSubject }: { subjects: string[]; prefill: string; prefillSubject: string }) {
  const [mode, setMode] = useState<"ai" | "empty">("ai");
  const [error, setError] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const allSubjects = [...subjects, ...SUBJECTS.filter((s) => !subjects.includes(s))];

  if (pending && mode === "ai")
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-8 text-center" aria-live="polite">
          <Pip mood="think" size={130} animation="tilt" />
          <p className="font-display text-xl font-bold">Pip is making your flashcards…</p>
        </div>
      </Card>
    );

  return (
    <Card>
      <CardHeader
        title="New deck"
        action={
          <div role="tablist" className="flex gap-1 rounded-xl bg-surface-2 p-1">
            <button role="tab" aria-selected={mode === "ai"} className={`rounded-lg px-3 py-1.5 text-sm font-extrabold ${mode === "ai" ? "bg-surface shadow-sm" : "text-ink-3"}`} onClick={() => setMode("ai")}>
              Generate with Pip
            </button>
            <button role="tab" aria-selected={mode === "empty"} className={`rounded-lg px-3 py-1.5 text-sm font-extrabold ${mode === "empty" ? "bg-surface shadow-sm" : "text-ink-3"}`} onClick={() => setMode("empty")}>
              Empty deck
            </button>
          </div>
        }
      />
      <form
        className="grid gap-4"
        action={(fd) =>
          start(async () => {
            setError("");
            const r = mode === "ai" ? await generateDeckAction(await compressFormImages(fd, "files")) : await createEmptyDeckAction(fd);
            if (r?.error) setError(r.error);
          })
        }
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_220px_140px]">
          <label className="block">
            <span className="label">Deck name</span>
            <input name="name" required maxLength={80} className="field" placeholder="e.g. Calculus rules" />
          </label>
          <label className="block">
            <span className="label">Subject</span>
            <select name="subject" className="field" defaultValue={prefillSubject || subjects[0]}>
              {allSubjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          {mode === "ai" && (
            <label className="block">
              <span className="label">Cards</span>
              <input name="count" type="number" min={5} max={40} defaultValue={15} className="field num" />
            </label>
          )}
        </div>
        {mode === "ai" && (
          <>
            <label className="block">
              <span className="label">Your notes</span>
              <textarea name="notes" className="field" rows={6} maxLength={30000} defaultValue={prefill} placeholder="Paste notes, a textbook summary or a list of key terms…" />
            </label>
            <label className="field flex cursor-pointer items-center gap-2 text-ink-2">
              <Upload size={18} aria-hidden />
              <span className="truncate">{files.length ? files.join(", ") : "Add files: .txt, .md, .csv, PDF or photos of notes"}</span>
              <input name="files" type="file" multiple accept=".txt,.md,.csv,text/*,application/pdf,image/*" className="sr-only" onChange={(e) => setFiles([...(e.target.files ?? [])].map((f) => f.name))} />
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-bold text-bad">
            {error}
          </p>
        )}
        <div>
          <button className="btn btn-primary" disabled={pending}>
            {mode === "ai" ? "Generate flashcards" : pending ? "Creating…" : "Create deck"}
          </button>
        </div>
      </form>
    </Card>
  );
}
