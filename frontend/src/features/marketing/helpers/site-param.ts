import { normalizeDomain } from "@/shared/helpers/domain";

/** The ?site= value as typed, and as a bare domain ("https://www.X.uz/" → "x.uz"). */
export function parseSiteParam(value: string | string[] | undefined) {
  const raw = typeof value === "string" ? value : "";
  return { raw, domain: normalizeDomain(raw) };
}
