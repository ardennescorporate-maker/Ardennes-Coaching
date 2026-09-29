"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, History, Plus, Square, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { Pip } from "@/components/pip/Pip";
import { Markdown } from "@/components/markdown/Markdown";
import { ChipGroup } from "@/components/ui/Chip";
import { useRewards } from "@/components/rewards/Rewards";
import { STARTERS, TUTOR_LEVELS, TUTOR_MODES, type TutorLevel, type TutorMode } from "@/lib/domain/tutor";
import { deleteChatAction, rateReplyAction } from "./actions";

type Msg = { id: string | null; role: "user" | "assistant"; content: string; rating: number | null };

export function Tutor(props: {
  username: string;
  subjects: string[];
  initialSubject: string;
  chatId: string | null;
  initialMessages: Msg[];
  chats: { id: string; title: string; subject: string }[];
  prefill: string;
}) {
  const router = useRouter();
  const celebrate = useRewards();
  const [subject, setSubject] = useState(props.initialSubject);
  const [mode, setMode] = useState<TutorMode>("Explain");
  const [level, setLevel] = useState<TutorLevel>("Standard");
  const [messages, setMessages] = useState<Msg[]>(props.initialMessages);
  const [chatId, setChatId] = useState(props.chatId);
  const [input, setInput] = useState(props.prefill);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setError("");
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { id: null, role: "user", content: message, rating: null }, { id: null, role: "assistant", content: "", rating: null }]);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId, subject, mode, level, message }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Pip couldn't answer right now. Try again in a moment.");
      }
      const newChat = res.headers.get("x-chat-id");
      const msgId = res.headers.get("x-message-id");
      const reward = res.headers.get("x-reward");
      // Keep the URL as is: changing it would remount this component mid-stream.
      if (newChat && newChat !== chatId) setChatId(newChat);
      if (reward) celebrate(JSON.parse(decodeURIComponent(reward)), "First question today!");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + chunk };
          return copy;
        });
      }
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { ...copy[copy.length - 1], id: msgId };
        return copy;
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          if (last.role === "assistant" && !last.content) copy.pop();
          return copy;
        });
      } else {
        setError((e as Error).message);
        setMessages((m) => (m[m.length - 1]?.role === "assistant" && !m[m.length - 1].content ? m.slice(0, -1) : m));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setChatId(null);
    setError("");
    router.push("/tutor");
  }

  async function rate(i: number, r: 1 | -1) {
    const m = messages[i];
    if (!m.id) return;
    setMessages((ms) => ms.map((x, j) => (j === i ? { ...x, rating: r } : x)));
    await rateReplyAction(m.id, r);
  }

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-4">
      <section className="card card-pad flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Pip mood={busy ? "think" : "wave"} size={64} animation={busy ? "tilt" : "bob"} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-extrabold">Pip · AI Tutor</h2>
            <p className="text-sm text-ink-3">Explanations, worked solutions and feedback on your working, matched to your syllabus.</p>
          </div>
          <button className="icon-btn" onClick={() => setShowHistory((s) => !s)} aria-expanded={showHistory} aria-label="Chat history">
            <History size={19} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={newChat}>
            <Plus size={16} /> New chat
          </button>
        </div>
        {showHistory && (
          <ul className="max-h-60 overflow-y-auto rounded-xl bg-surface-2 p-2">
            {props.chats.length === 0 && <li className="p-2 text-sm text-ink-3">No saved chats yet.</li>}
            {props.chats.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <Link href={`/tutor?chat=${c.id}`} className={`min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-sm font-bold hover:bg-surface ${c.id === chatId ? "text-blue" : ""}`}>
                  {c.title} <span className="font-semibold text-ink-3">· {c.subject}</span>
                </Link>
                <button
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:text-bad"
                  aria-label={`Delete chat ${c.title}`}
                  onClick={async () => {
                    await deleteChatAction(c.id);
                    if (c.id === chatId) newChat();
                    else router.refresh();
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
          <label className="block">
            <span className="label">Subject</span>
            <select className="field" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={Boolean(chatId) && messages.length > 0}>
              {props.subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="min-w-0">
            <span className="label">Mode</span>
            <ChipGroup label="Mode" options={TUTOR_MODES} value={mode} onChange={setMode} className="!flex-nowrap overflow-x-auto pb-1" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="label !mb-0">Level</span>
          <ChipGroup label="Level" options={TUTOR_LEVELS} value={level} onChange={setLevel} />
        </div>
      </section>

      <section aria-label="Conversation" aria-live="polite" className="flex min-h-[40vh] flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <Pip mood="wave" size={130} />
            <p className="bubble bubble-bottom max-w-lg text-left">
              Hi {props.username}, I&apos;m Pip! Ask me about a concept, paste a question you&apos;re stuck on, or share your working and I&apos;ll find the mistake.
            </p>
            <div className="mt-2 flex max-w-2xl flex-wrap justify-center gap-2">
              {STARTERS[mode].map((s) => (
                <button
                  key={s}
                  className="chip"
                  onClick={() => {
                    if (s.endsWith(":") || s.endsWith("\n")) {
                      setInput(s + " ");
                      inputRef.current?.focus();
                    } else void send(`${s} (${subject})`);
                  }}
                >
                  {s.replace(/\n+$/, "")}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-blue px-4 py-2.5 font-semibold text-white shadow-[0_3px_0_var(--blue-deep)]">{m.content}</div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-1 flex-none">
                <Pip mood={busy && i === messages.length - 1 ? (m.content ? "talk" : "think") : "happy"} size={40} animation="none" label="" />
              </span>
              <div className="min-w-0 max-w-[88%]">
                <div className="card !rounded-2xl !rounded-tl-md px-4 py-3">
                  {m.content ? <Markdown>{m.content}</Markdown> : <TypingDots />}
                </div>
                {m.id && !busy && (
                  <div className="mt-1.5 flex gap-1.5">
                    <button className={`chip !min-h-8 !px-2.5 !text-xs ${m.rating === 1 ? "is-selected" : ""}`} onClick={() => rate(i, 1)} aria-pressed={m.rating === 1}>
                      <ThumbsUp size={13} /> Helpful
                    </button>
                    <button className={`chip !min-h-8 !px-2.5 !text-xs ${m.rating === -1 ? "is-selected" : ""}`} onClick={() => rate(i, -1)} aria-pressed={m.rating === -1}>
                      <ThumbsDown size={13} /> Wrong or unclear
                    </button>
                  </div>
                )}
              </div>
            </div>
          ),
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-bold text-bad">
            {error}
          </p>
        )}
        <div ref={endRef} />
      </section>

      <form
        className="card sticky bottom-3 flex items-end gap-2 !p-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label className="sr-only" htmlFor="tutor-input">
          Message Pip
        </label>
        <textarea
          id="tutor-input"
          ref={inputRef}
          rows={1}
          value={input}
          maxLength={6000}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder={`Ask Pip about ${subject}…`}
          className="max-h-48 min-h-[46px] flex-1 resize-none bg-transparent px-2 py-2.5 font-semibold outline-none [field-sizing:content]"
        />
        {busy ? (
          <button type="button" className="btn btn-danger" onClick={() => abortRef.current?.abort()} aria-label="Stop Pip">
            <Square size={16} fill="currentColor" /> Stop
          </button>
        ) : (
          <button type="submit" className="btn btn-primary !px-3" disabled={!input.trim()} aria-label="Send">
            <ArrowUp size={20} />
          </button>
        )}
      </form>
      <p className="-mt-2 text-center text-xs text-ink-3">Enter to send · Shift+Enter for a new line · Pip can make mistakes, so check important facts.</p>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-1 py-1.5" aria-label="Pip is thinking">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-blue" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}
