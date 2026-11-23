"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { api } from "@/shared/api/client";

type TourMemory = {
  /** Whether this account has seen the tour, on any device. */
  seen: (id: string) => boolean;
  /** Notes the tour as seen here at once, and on the account, so no other device starts it either. */
  markSeen: (id: string) => void;
};

const Memory = createContext<TourMemory | null>(null);

/**
 * The guided tours an account has seen (the user, 23 Nov 2026: "the Touring must be showed only once ... even in
 * different devices, maybe we need to save it somewhere as an object"): read from the account (`User.seenTours`), and
 * written to it the moment a tour starts by itself (`POST /auth/me/tours`). Outside the workspace there is none, and a
 * tour falls back to the browser's own memory.
 */
export function TourMemoryProvider({ initial, children }: { initial: string[]; children: React.ReactNode }) {
  const [seenTours, setSeenTours] = useState(() => new Set(initial));
  const markSeen = useCallback((id: string) => {
    setSeenTours((current) => (current.has(id) ? current : new Set([...current, id])));
    // Kept on the account: if it fails, this browser still remembers the tour (`PageTour`), and the next one tries again
    api.markTourSeen(id).catch(() => undefined);
  }, []);
  const value = useMemo(() => ({ seen: (id: string) => seenTours.has(id), markSeen }), [seenTours, markSeen]);
  return <Memory.Provider value={value}>{children}</Memory.Provider>;
}

export function useTourMemory(): TourMemory | null {
  return useContext(Memory);
}
