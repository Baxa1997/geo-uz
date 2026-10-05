"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "@/i18n/navigation";
import { START_STEPS, type StartStep } from "../constants";

/** A project's progress on the "Start here" checklist, kept in this browser: it only guides, it holds no data. */
export interface StartProgress {
  visited: StartStep[];
  minimized: boolean;
  dismissed: boolean;
}

const EMPTY: StartProgress = { visited: [], minimized: false, dismissed: false };
const storageKey = (projectId: string) => `geo:start:${projectId}`;

// What this tab knows, so every reader gets the same object until something changes, and the
// checklist still works for this visit when storage is blocked
const known = new Map<string, StartProgress>();
const listeners = new Set<() => void>();

function parse(raw: string): StartProgress {
  try {
    const value = JSON.parse(raw) as Partial<StartProgress>;
    return {
      visited: Array.isArray(value.visited)
        ? value.visited.filter((step): step is StartStep => START_STEPS.some(({ key }) => key === step))
        : [],
      minimized: value.minimized === true,
      dismissed: value.dismissed === true,
    };
  } catch {
    return EMPTY;
  }
}

function read(projectId: string): StartProgress {
  const cached = known.get(projectId);
  if (cached) return cached;
  let value = EMPTY;
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (raw) value = parse(raw);
  } catch {
    // Storage blocked (private window, site data off): start from nothing
  }
  known.set(projectId, value);
  return value;
}

function write(projectId: string, change: Partial<StartProgress>) {
  const value = { ...read(projectId), ...change };
  known.set(projectId, value);
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(value));
  } catch {
    // Kept for this visit only
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  // Another tab changed it: read it again
  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith("geo:start:")) {
      known.delete(event.key.slice("geo:start:".length));
      listener();
    }
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The checklist's state for a project, and the ways to change it. Empty on the server. */
export function useStartProgress(projectId: string) {
  const progress = useSyncExternalStore(subscribe, () => read(projectId), () => EMPTY);
  return {
    progress,
    setMinimized: (minimized: boolean) => write(projectId, { minimized }),
    dismiss: () => write(projectId, { dismissed: true }),
  };
}

/** Ticks a step off when its page is opened. Mounted once in the workspace, whatever the screen size. */
export function useRecordStartVisits(projectId: string | undefined) {
  const pathname = usePathname();
  useEffect(() => {
    if (!projectId) return;
    const base = `/projects/${projectId}`;
    if (pathname !== base && !pathname.startsWith(`${base}/`)) return;
    const section = pathname.slice(base.length);
    const step = START_STEPS.find(({ path }) => path === section);
    if (step && !read(projectId).visited.includes(step.key)) {
      write(projectId, { visited: [...read(projectId).visited, step.key] });
    }
  }, [projectId, pathname]);
}
