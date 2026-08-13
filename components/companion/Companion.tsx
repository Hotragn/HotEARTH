"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PaperPlaneRight, Sparkle, X } from "@phosphor-icons/react";
import {
  COMPANION_NAME,
  SYSTEM_PROMPT,
  buildUserPrompt,
  retrieve,
  scriptedAnswer,
  type KnowledgeCard,
} from "@/lib/companion";
import { RobotFace } from "./robotArt";
import {
  MODEL_LABEL,
  loadEngine,
  streamReply,
  webgpuAvailable,
  type MlcEngine,
} from "./engine";

type EngineStatus = "scripted" | "loading" | "ready" | "unsupported" | "error";

interface ChatMessage {
  role: "user" | "bot";
  text: string;
  cards?: KnowledgeCard[];
}

const INTRO: ChatMessage = {
  role: "bot",
  text: `Hi, I'm ${COMPANION_NAME}. Ask me about any of the worlds here or how to get around. I run locally in your browser and answer only from this app's own data, so I keep it honest.`,
};

/**
 * Site-wide companion. Mounted once in the root layout, so it rides along on
 * every world. It answers from the app's grounded knowledge base: instantly via
 * deterministic scripted replies, and, once the user opts in, phrased by a small
 * open-source model running in-browser (WebGPU). It is always labelled as a
 * small local model that can be wrong.
 */
export default function Companion() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INTRO]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<EngineStatus>("scripted");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const engineRef = useRef<MlcEngine | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the transcript pinned to the latest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  // Focus the field when the panel opens; Escape closes.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const wake = async () => {
    if (!webgpuAvailable()) {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");
    setProgress(0);
    try {
      engineRef.current = await loadEngine((p) => setProgress(p));
      setStatus("ready");
    } catch {
      engineRef.current = null;
      setStatus("error");
    }
  };

  const send = async () => {
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setBusy(true);

    // Always ground the answer in retrieved cards, model or not.
    const cards = retrieve(question, 4);

    if (status === "ready" && engineRef.current) {
      // Model phrases the answer from the grounded context; stream it in.
      const idx = await new Promise<number>((resolve) => {
        setMessages((m) => {
          resolve(m.length);
          return [...m, { role: "bot", text: "", cards }];
        });
      });
      try {
        let acc = "";
        for await (const delta of streamReply(
          engineRef.current,
          SYSTEM_PROMPT,
          buildUserPrompt(question, cards),
        )) {
          acc += delta;
          setMessages((m) => {
            const next = [...m];
            next[idx] = { role: "bot", text: acc, cards };
            return next;
          });
        }
        if (!acc.trim()) throw new Error("empty");
      } catch {
        // Fall back to the deterministic answer if generation fails midway.
        const reply = scriptedAnswer(question);
        setMessages((m) => {
          const next = [...m];
          next[idx] = { role: "bot", text: reply.text, cards: reply.cards };
          return next;
        });
      }
    } else {
      const reply = scriptedAnswer(question);
      setMessages((m) => [
        ...m,
        { role: "bot", text: reply.text, cards: reply.cards },
      ]);
    }
    setBusy(false);
  };

  const navCards = (cards?: KnowledgeCard[]) =>
    (cards ?? []).filter((c) => c.href).slice(0, 3);

  return (
    <>
      {/* launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close companion" : `Open ${COMPANION_NAME}, the guide`}
        aria-expanded={open}
        // This button owns the bottom-right corner on every tab. Anything
        // else placed there is unclickable underneath it: see
        // `.corner-safe-right` in app/globals.css, which exists because eleven
        // attribution footers were hidden behind this exact button.
        className="hud-panel pointer-events-auto fixed bottom-4 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full text-solar shadow-lg transition-transform duration-200 hover:scale-105 sm:bottom-5 sm:right-5"
      >
        {open ? <X size={22} weight="light" /> : <RobotFace size={34} mood="idle" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`${COMPANION_NAME}, your guide`}
          className="pointer-events-auto fixed bottom-20 right-4 z-[60] flex w-[min(92vw,22rem)] flex-col overflow-hidden rounded-2xl border border-line bg-abyss/95 backdrop-blur-md animate-menu-in sm:right-5"
          style={{ maxHeight: "min(70dvh, 34rem)" }}
        >
          {/* header */}
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="text-solar">
              <RobotFace size={30} mood={busy ? "talk" : status === "loading" ? "think" : "idle"} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ice">{COMPANION_NAME}</p>
              <p className="truncate text-[11px] text-faint">
                {status === "ready"
                  ? "small local model, can be wrong"
                  : status === "loading"
                    ? `waking up… ${Math.round(progress * 100)}%`
                    : "guiding from this app's data"}
              </p>
            </div>
          </div>

          {/* transcript */}
          <div ref={scrollRef} className="hud-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug ${
                    m.role === "user"
                      ? "bg-solar/15 text-ice"
                      : "bg-white/[0.05] text-ice/90"
                  }`}
                >
                  {m.text || (busy && i === messages.length - 1 ? "…" : m.text)}
                  {navCards(m.cards).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {navCards(m.cards).map((c) => (
                        <Link
                          key={c.id}
                          href={c.href!}
                          onClick={() => setOpen(false)}
                          className="rounded-full border border-line bg-white/[0.04] px-2.5 py-1 text-[11px] text-dim transition-colors hover:text-ice"
                        >
                          {c.title} →
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* opt-in / status strip */}
          {status === "scripted" && (
            <button
              type="button"
              onClick={wake}
              className="flex items-center gap-2 border-t border-line px-4 py-2 text-left text-[11px] text-dim transition-colors hover:text-ice"
            >
              <Sparkle size={14} weight="light" className="shrink-0 text-solar" />
              <span>
                Wake my brain for smarter answers. Downloads {MODEL_LABEL} into your browser, keyless.
              </span>
            </button>
          )}
          {status === "loading" && (
            <div className="border-t border-line px-4 py-2">
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-solar transition-[width] duration-300"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
          )}
          {status === "unsupported" && (
            <p className="border-t border-line px-4 py-2 text-[11px] text-faint">
              Your browser has no WebGPU, so I'll keep answering from the app's data directly.
            </p>
          )}
          {status === "error" && (
            <p className="border-t border-line px-4 py-2 text-[11px] text-faint">
              Couldn't load the model. Still here, answering from the app's data.
            </p>
          )}

          {/* composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-center gap-2 border-t border-line px-3 py-2.5"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about any world…"
              aria-label="Ask the companion"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-ice placeholder:text-faint focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              aria-label="Send"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-solar transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              <PaperPlaneRight size={16} weight="fill" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
