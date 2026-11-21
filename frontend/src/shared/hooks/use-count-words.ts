import { useLocale, useTranslations } from "next-intl";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import type { Tone, WaveBrand, WaveBrands } from "@/shared/types/api";

/**
 * A count as a whole percent of what it is counted over, rounded half up (12.5 is 13): `backend/app/metrics.py`'s
 * `share`, the one rounding rule for every share the report shows (Phase 0 item 0.3). In whole numbers, so no
 * floating point can tip a half. Null when there is nothing to count over.
 */
export const shareOf = (k: number, n: number): number | null => (n > 0 ? Math.floor((200 * k + n) / (2 * n)) : null);

/**
 * How the report writes the metrics' counts in words (report spec Phase 0 item 0.2): a count over what it is
 * counted from, a brand's rank among ties, its tone per mention, its place in an answer, share of voice, and
 * "N/A" where there is nothing to measure. Nothing is worked out here but a percentage from the count shown
 * beside it: every number is `backend/app/metrics.py`'s.
 */
export function useCountWords() {
  const t = useTranslations("Report.counts");
  const tones = useTranslations("Tone");
  const locale = useLocale();

  const fraction = (k: number, n: number) => `${k}/${n}`;
  const percent = (k: number, n: number) => {
    const value = shareOf(k, n);
    return value === null ? "" : formatPercent(value / 100, locale);
  };

  return {
    na: t("na"),
    fraction,
    percent,
    /** "1/15 · 7%": the count and its share, the share from the count. */
    count: (k: number, n: number) => (n > 0 ? `${fraction(k, n)} · ${percent(k, n)}` : t("na")),
    /**
     * Names as a sentence lists them: "A, B and C". Not Intl.ListFormat: browsers have no Uzbek rules for it, so a
     * list drawn in the browser would differ from the server's.
     */
    names: (names: string[]) => (names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")}${t("and")}${names.at(-1) ?? ""}`),
    /** Its place among the tracked brands by how often it is named; brands named equally often share it. */
    rank: (brand: WaveBrand) => (!brand.rank ? t("rank.none") : brand.rank.tied > 1 ? t("rank.tied", { place: brand.rank.place }) : t("rank.place", { place: brand.rank.place })),
    /** Its tone: N/A at no mention, each tone counted under three mentions, a word for them all from three. */
    tone: (brand: WaveBrand) => {
      const { tone } = brand;
      if (tone.mentions === 0) return t("na");
      if (tone.summary === "mixed") return t("tone.mixed");
      if (tone.summary) return t("tone.mostly", { tone: tones(tone.summary).toLowerCase() });
      const counts = (Object.entries(tone.counts) as [Tone, number][]).map(([key, count]) => t("tone.count", { tone: tones(key), count }));
      return t("tone.few", { counts: counts.join(", ") });
    },
    /** Its place in an answer: only from numbered lists, else "no rank (unordered)". */
    position: (brand: WaveBrand) =>
      brand.position.named === 0
        ? t("notNamed")
        : brand.position.median === null
          ? t("position.unordered")
          : t("position.numbered", { median: formatDecimal(brand.position.median, locale), k: brand.position.numbered, n: brand.position.named }),
    /** Its share of voice, or why there is none: too few mentions of the tracked brands in all. */
    shareOfVoice: (brands: WaveBrands, id: string) => {
      const share = brands.share_of_voice.shares?.[id];
      return share ? `${fraction(share.k, share.n)} · ${percent(share.k, share.n)}` : t("shareOfVoice.tooFew", { mentions: brands.share_of_voice.mentions, minimum: brands.share_of_voice.minimum });
    },
  };
}
