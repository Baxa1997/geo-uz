"use client";

import { useEffect, useState } from "react";

/** Asked once per page. */
let probe: Promise<string[]> | null = null;
const KNOWN = ["chatgpt", "gemini"] as const;
type Known = (typeof KNOWN)[number];

/**
 * The assistants the backend asks customers' questions now (its `/health` `engines`, set by `ANSWER_ENGINES`):
 * ChatGPT alone since 21 Nov 2026, while Gemini with Google Search is paused for Google's terms. ChatGPT until it
 * answers, or when it can't be reached (mocks).
 */
export function useAnswerEngines(): Known[] {
  const [engines, setEngines] = useState<Known[]>(["chatgpt"]);
  useEffect(() => {
    probe ??= fetch("/api/backend/health")
      .then((response) => (response.ok ? response.json() : null))
      .then((health: { engines?: string[] } | null) => health?.engines ?? [])
      .catch(() => []);
    let live = true;
    void probe.then((names) => {
      const known = KNOWN.filter((engine) => names.includes(engine));
      if (live && known.length > 0) setEngines(known);
    });
    return () => {
      live = false;
    };
  }, []);
  return engines;
}
