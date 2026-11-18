"use client";

import { useEffect, useState } from "react";

/** Asked once per page however many PDF buttons it has. */
let probe: Promise<boolean> | null = null;

/**
 * Whether the backend can make a report's PDF (its `/health` says `pdf`: a browser is installed and the report
 * page is at an address it can reach). Null until it answers; false when it can't or isn't reachable (mocks):
 * the PDF buttons then open the print window, as before.
 */
export function usePdfAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    probe ??= fetch("/api/backend/health")
      .then((response) => (response.ok ? response.json() : null))
      .then((health: { pdf?: boolean } | null) => health?.pdf === true)
      .catch(() => false);
    let live = true;
    void probe.then((value) => live && setAvailable(value));
    return () => {
      live = false;
    };
  }, []);
  return available;
}
