import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Pilot } from "../types";

/**
 * Reads a pilot report's file from `frontend/pilots/<slug>.json`, where `backend/pilot` writes it.
 * Null when there is none. The slug comes from the address, so only plain names are read.
 */
export async function loadPilot(slug: string): Promise<Pilot | null> {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) return null;
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), "pilots", `${slug}.json`), "utf8")) as Pilot;
  } catch {
    return null;
  }
}
