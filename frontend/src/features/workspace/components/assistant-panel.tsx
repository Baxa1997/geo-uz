"use client";

import { ArrowUp, ChevronRight, Maximize2, MessageCircle, Minimize2, Sparkles, SquarePen, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { cn } from "@/shared/helpers/utils";
import { ASSISTANT_SUGGESTIONS } from "../constants";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const iconButton =
  "flex size-8 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-black/[0.05] hover:text-foreground";

/**
 * GEO AI side panel. Design only for now: there is no assistant behind it yet, so every
 * question gets a "this is a demo" reply. Full screen on phones, beside the page from lg up.
 */
export function AssistantPanel({ initialQuestion, onClose }: { initialQuestion?: string; onClose: () => void }) {
  const t = useTranslations("Assistant");
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>(() =>
    initialQuestion
      ? [
          { role: "user", text: initialQuestion },
          { role: "assistant", text: t("demoReply") },
        ]
      : [],
  );

  function ask(text: string) {
    const question = text.trim();
    if (!question) return;
    setMessages((list) => [...list, { role: "user", text: question }, { role: "assistant", text: t("demoReply") }]);
    setDraft("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(draft);
  }

  return (
    <aside
      aria-label={t("label")}
      onKeyDown={(event) => event.key === "Escape" && onClose()}
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-sidebar lg:static lg:z-auto lg:h-svh lg:shrink-0",
        expanded ? "lg:w-[40rem]" : "lg:w-[26rem]",
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] bg-size-[16px_16px]">
        <header className="flex h-14 shrink-0 items-center gap-1 px-4">
          <p className="flex-1 font-semibold">{t("newChat")}</p>
          <button type="button" onClick={() => setMessages([])} aria-label={t("new")} title={t("new")} className={iconButton}>
            <SquarePen aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? t("shrink") : t("expand")}
            title={expanded ? t("shrink") : t("expand")}
            className={cn(iconButton, "hidden lg:flex")}
          >
            {expanded ? <Minimize2 aria-hidden className="size-4" /> : <Maximize2 aria-hidden className="size-4" />}
          </button>
          <button type="button" onClick={onClose} aria-label={t("close")} title={t("close")} className={iconButton}>
            <X aria-hidden className="size-4" />
          </button>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-3 pt-6 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
                <Sparkles aria-hidden className="size-6" />
              </span>
              <p className="mt-2 text-lg font-semibold">{t("hello")}</p>
              <p className="max-w-xs text-sm text-pretty text-muted-foreground">{t("intro")}</p>
              <ul className="mt-3 flex w-full flex-col gap-2">
                {ASSISTANT_SUGGESTIONS.map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => ask(t(`suggestions.${key}`))}
                      className="flex w-full items-center gap-3 rounded-xl border bg-background p-3 text-left text-sm shadow-xs transition-colors hover:bg-muted/40"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <MessageCircle aria-hidden className="size-4 text-muted-foreground" />
                      </span>
                      <span className="flex-1">{t(`suggestions.${key}`)}</span>
                      <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ol aria-live="polite" className="flex flex-col gap-3 pt-2">
              {messages.map((message, index) => (
                <li
                  key={index}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm text-pretty",
                    message.role === "user"
                      ? "self-end rounded-br-md bg-foreground text-background"
                      : "self-start rounded-bl-md border bg-background shadow-xs",
                  )}
                >
                  {message.text}
                </li>
              ))}
            </ol>
          )}
        </div>

        <form onSubmit={submit} className="m-3 mt-0 flex flex-col gap-2 rounded-2xl border bg-background p-3 shadow-sm">
          <label htmlFor="assistant-input" className="sr-only">
            {t("placeholder")}
          </label>
          <textarea
            id="assistant-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(draft);
              }
            }}
            rows={2}
            autoFocus
            placeholder={t("placeholder")}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">↵ {t("send")}</span>
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label={t("send")}
              className="flex size-8 items-center justify-center rounded-full bg-foreground text-background transition-colors disabled:bg-foreground/25"
            >
              <ArrowUp aria-hidden className="size-4" />
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}
