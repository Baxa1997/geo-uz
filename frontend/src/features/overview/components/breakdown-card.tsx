import { useLocale, useMessages, useTranslations } from "next-intl";
import { Panel } from "@/shared/components/panel";
import { BarRows } from "@/shared/components/scores/bar-rows";
import { Link } from "@/i18n/navigation";
import { labelFor } from "@/shared/helpers/labels";
import { formatPercent } from "@/shared/helpers/numbers";
import { sliceShare, slicesBy, type Slice } from "@/shared/helpers/scores";
import type { PromptLanguage, PromptResult, ReportFilters } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";

/** The card lists this many topics, strongest first, and twice as many in two columns once it is wide; its large view lists them all. */
const TOPICS_SHOWN = 6;

interface Row {
  slice: Slice;
  label: string;
  /** The client's visibility in the group, 0–1. */
  you: number;
  /** The brand named most in the group; undefined when the answers name nobody. */
  leader?: { brand: SeriesBrand; share: number };
  /** The Questions page narrowed to the group. */
  href: string;
}

/**
 * Where the client is visible and where it isn't: its visibility on each topic's questions and in each
 * question language, as bars, each with the brand that leads there. Our plain version of Peec's
 * "performance matrix", and the one split no other tool has: Uzbek against Russian. Under the languages,
 * where the card would stand empty, it says the strongest and weakest topic and the two languages in
 * words; ⤢ lists every topic with its counts. A wide card (the user's correction of Oct 10: "make the full
 * page, not too many spacing") runs the topics in two columns and shows twice as many.
 */
export function BreakdownCard({
  results,
  brands,
  questionsHref,
}: {
  results: PromptResult[];
  /** The tracked brands, the client first. */
  brands: SeriesBrand[];
  /** The Questions page under one more filter. */
  questionsHref: (filter: ReportFilters) => string;
}) {
  const t = useTranslations("Overview.breakdown");
  const messages = useMessages();
  const locale = useLocale();
  const percent = (share: number) => formatPercent(share, locale);
  const youId = brands.find((brand) => brand.isYou)?.id ?? "";
  const ids = brands.map((brand) => brand.id);

  const row = (slice: Slice, label: string, href: string): Row => ({
    slice,
    label,
    href,
    you: sliceShare(slice, youId),
    // The client comes first among the brands, so it wins a tie
    leader: brands
      .map((brand) => ({ brand, share: sliceShare(slice, brand.id) }))
      .filter(({ share }) => share > 0)
      .sort((a, b) => b.share - a.share)[0],
  });
  const topics = slicesBy(results, (prompt) => prompt.topic, ids)
    .map((slice) => row(slice, labelFor(messages.Topics, slice.key), questionsHref({ topic: slice.key })))
    .sort((a, b) => b.you - a.you);
  const languages = slicesBy(results, (prompt) => prompt.language, ids)
    .map((slice) => row(slice, t(`lang.${slice.key as PromptLanguage}`), questionsHref({ language: slice.key as PromptLanguage })))
    .sort((a, b) => b.you - a.you);

  const best = topics[0];
  const worst = topics.at(-1);
  const uz = languages.find(({ slice }) => slice.key === "uz");
  const ru = languages.find(({ slice }) => slice.key === "ru");
  const takeaway = [
    best && worst && best.you !== worst.you
      ? t("takeawayTopics", { best: best.label, bestValue: percent(best.you), worst: worst.label, worstValue: percent(worst.you) })
      : null,
    uz && ru ? t("takeawayLanguages", { uz: percent(uz.you), ru: percent(ru.you) }) : null,
  ].filter((sentence) => sentence !== null);

  /**
   * One list of bars under its column headings. The card may show only the first `limit` rows; with
   * `columns`, a wide card runs the list in two columns and shows `limit` rows in each.
   */
  function list(heading: string, all: Row[], detailed: boolean, limit = all.length, columns = false) {
    const rows = all.slice(0, columns ? limit * 2 : limit);
    const shown = Math.min(limit, all.length);
    return (
      <section className="@container flex min-w-0 flex-col">
        {/* Column headings over the bars: whose number ends the row, and who the name beside it is */}
        <div className="flex items-center gap-x-5 px-3 pt-3 text-xs text-muted-foreground">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h3 className="min-w-0 flex-1 truncate px-2.5 font-medium text-foreground">
              {heading}
              {/* Says when only the strongest ones are listed: the rest are behind ⤢ */}
              {shown < all.length && (
                <span className={columns && rows.length === all.length ? "font-normal text-muted-foreground tabular-nums @7xl/breakdown:hidden" : "font-normal text-muted-foreground tabular-nums"}>
                  {" "}
                  · {shown}
                  {columns && rows.length < all.length && <span className="hidden @7xl/breakdown:inline">–{rows.length}</span>}/{all.length}
                </span>
              )}
            </h3>
            <span className="hidden w-40 shrink-0 @md:block">{t("leader")}</span>
            <span className="w-11 shrink-0 text-right">{t("you")}</span>
          </div>
          {/* The same headings over the second column */}
          {columns && rows.length > limit && (
            <div aria-hidden className="hidden min-w-0 flex-1 items-center gap-3 @7xl/breakdown:flex">
              <span className="min-w-0 flex-1" />
              <span className="w-40 shrink-0">{t("leader")}</span>
              <span className="w-11 shrink-0 text-right">{t("you")}</span>
            </div>
          )}
        </div>
        <BarRows
          className={columns ? "p-3 pt-2 @7xl/breakdown:block @7xl/breakdown:columns-2 @7xl/breakdown:gap-x-5 @7xl/breakdown:[&>li]:mb-1.5 @7xl/breakdown:[&>li]:break-inside-avoid" : "p-3 pt-2"}
          rows={rows.map(({ slice, label, you, leader, href }, index) => ({
            key: slice.key,
            // The second column's rows wait for a wide card
            className: index >= limit ? "hidden @7xl/breakdown:flex" : undefined,
            // Against the whole scale, not the best row: 20% mustn't look like a full bar
            size: you,
            value: percent(you),
            label: (
              <Link href={href} className="truncate underline-offset-4 hover:underline">
                {label}
              </Link>
            ),
            mark: (
              <span className="hidden w-40 shrink-0 items-center gap-1.5 text-xs @md:flex">
                {!leader ? (
                  <span className="text-muted-foreground">
                    <span aria-hidden>—</span>
                    <span className="sr-only">{t("nobody")}</span>
                  </span>
                ) : leader.brand.isYou ? (
                  <span className="rounded-md bg-you-soft px-1.5 py-0.5 font-medium ring-1 ring-you/40">{t("you")}</span>
                ) : (
                  <>
                    <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: leader.brand.color }} />
                    <span className="truncate">{leader.brand.name}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">{percent(leader.share)}</span>
                  </>
                )}
              </span>
            ),
            // The leader in words where its column doesn't fit (a phone)
            detail: detailed ? (
              <>
                {t("detail", { prompts: slice.prompts, answers: slice.answers, named: slice.named[youId] ?? 0 })}
                {leader && (
                  <span className="@md:hidden">
                    {" "}
                    {leader.brand.isYou ? t("detailYouLead") : t("detailLeader", { leader: leader.brand.name, value: percent(leader.share) })}
                  </span>
                )}
              </>
            ) : undefined,
          }))}
        />
      </section>
    );
  }

  return (
    <Panel
      title={t("title")}
      hint={t("hint")}
      expand={{
        takeaway: takeaway.length > 0 ? takeaway.map((sentence) => <p key={sentence}>{sentence}</p>) : undefined,
        guide: <p>{t("guide")}</p>,
        // One under the other, the two languages first: each list keeps its leader column at full width
        content: (
          <div className="flex flex-col divide-y">
            {list(t("languages"), languages, true)}
            {list(t("topics"), topics, true)}
          </div>
        ),
      }}
    >
      {/* Side by side while there is room; the topics take more of it, and two columns once the card is wide */}
      <div className="@container/breakdown">
        <div className="grid divide-y @3xl/breakdown:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @3xl/breakdown:divide-x @3xl/breakdown:divide-y-0 @7xl/breakdown:grid-cols-[minmax(0,1fr)_30rem]">
          {list(t("topics"), topics, false, TOPICS_SHOWN, true)}
          <div className="flex min-w-0 flex-col">
            {list(t("languages"), languages, false)}
            {/* What the bars say, in the room the two languages leave under them */}
            {takeaway.length > 0 && <p className="mx-3 mt-auto mb-3 rounded-lg bg-muted px-3 py-2.5 text-sm text-pretty">{takeaway.join(" ")}</p>}
          </div>
        </div>
      </div>
    </Panel>
  );
}
