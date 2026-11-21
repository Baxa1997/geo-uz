// The five areas a report reads the client on, in the report's order. Since 21 Nov 2026 each is read by its own
// counts (report spec Phase 0 item 0.2 took the 0–100 condition score and its statuses away), and nothing here
// rates them.
import type { ReportArea, Source } from "@/shared/types/api";

export const REPORT_AREAS: ReportArea[] = ["visibility", "competition", "coverage", "sources", "accuracy"];

/** A site a business can get listed on: neither its own nor a competitor's. */
export const isListable = (source: Pick<Source, "type">) => source.type !== "own" && source.type !== "competitor";
