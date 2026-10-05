import type { Report } from "@/shared/types/api";

/** Share of a brand's mentions that are positive, 0–1; null if it was never named. */
export function positiveShare(report: Report, brandId: string): number | null {
  const tones = report.prompts.flatMap((result) =>
    result.answers.flatMap((answer) => answer.mentions.filter((m) => m.brandId === brandId).map((m) => m.tone)),
  );
  return tones.length ? tones.filter((tone) => tone === "positive").length / tones.length : null;
}
