import { ArrowDown, ArrowUp, CircleCheck, Minus, Plus, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionTitle } from "@/shared/components/actions/action-title";
import { siteMovers } from "@/shared/helpers/source-movers";
import { cn } from "@/shared/helpers/utils";
import type { Action, HistoryPoint, Report } from "@/shared/types/api";
import { ReportCard } from "./report-parts";

/** Each kind of change names at most this many sites. */
const SITES = 3;
/** A competitor's visibility has to move this many points to be told. */
const NOTABLE = 3;

/** Whether a change is good or bad news for the client; a site's move is neither by itself. */
type Tone = "good" | "bad" | "neutral";

const COLORS: Record<Tone, string> = { good: "text-better", bad: "text-worse", neutral: "text-muted-foreground" };

interface Item {
  key: string;
  /** The way it moved (the mark), and what that means for the client (its color). */
  icon: LucideIcon;
  tone: Tone;
  text: React.ReactNode;
}

/** The tracked brands of a check, the most visible first. */
const ranking = (point: HistoryPoint) => [...point.scores].sort((a, b) => b.visibility - a.visibility).map((score) => score.brandId);

/**
 * What changed since the report before: the events behind the numbers, for the reader who wants to know
 * why they moved. The client's place among the brands and who passed whom, a competitor that moved a lot,
 * the sites ChatGPT started citing, cites more or less, the wrong facts found this week, and the actions
 * done this week (their effect shows in the checks after). The numbers themselves are in the next section.
 */
export function ReportChanges({ report, actions }: { report: Report; actions: Action[] }) {
  const t = useTranslations("Report.changes");
  const now = report.history.at(-1);
  const before = report.history.at(-2);
  if (!now || !before) return <p className="text-sm text-pretty text-muted-foreground">{t("first")}</p>;

  const { brand } = report.project;
  const names = new Map([brand, ...report.project.competitors].map((tracked) => [tracked.id, tracked.name]));
  const rankNow = ranking(now);
  const rankBefore = ranking(before);
  const placeNow = rankNow.indexOf(brand.id) + 1;
  const placeBefore = rankBefore.indexOf(brand.id) + 1;
  const visibility = (point: HistoryPoint, id: string) => Math.round((point.scores.find((score) => score.brandId === id)?.visibility ?? 0) * 100);

  const brands: Item[] = [
    placeNow < placeBefore
      ? { key: "place", icon: ArrowUp, tone: "good", text: t("placeUp", { before: placeBefore, now: placeNow }) }
      : placeNow > placeBefore
        ? { key: "place", icon: ArrowDown, tone: "bad", text: t("placeDown", { before: placeBefore, now: placeNow }) }
        : { key: "place", icon: Minus, tone: "neutral", text: t("placeSame", { now: placeNow }) },
    // Who passed the client this week, and whom the client passed
    ...rankNow.flatMap((id): Item[] => {
      if (id === brand.id) return [];
      const ahead = rankNow.indexOf(id) < placeNow - 1;
      const wasAhead = rankBefore.indexOf(id) < placeBefore - 1;
      const name = names.get(id) ?? "";
      if (ahead && !wasAhead) return [{ key: `passed-${id}`, icon: ArrowDown, tone: "bad", text: t("passedYou", { name }) }];
      if (!ahead && wasAhead) return [{ key: `behind-${id}`, icon: ArrowUp, tone: "good", text: t("youPassed", { name }) }];
      return [];
    }),
    // A competitor that gained or lost a lot
    ...report.project.competitors.flatMap((competitor): Item[] => {
      const change = visibility(now, competitor.id) - visibility(before, competitor.id);
      if (Math.abs(change) < NOTABLE) return [];
      return [
        {
          key: `moved-${competitor.id}`,
          icon: change > 0 ? ArrowUp : ArrowDown,
          // A competitor gaining is bad news for the client
          tone: change > 0 ? "bad" : "good",
          text: t(change > 0 ? "competitorUp" : "competitorDown", { name: competitor.name, points: Math.abs(change) }),
        },
      ];
    }),
  ];

  const movers = siteMovers(report.sourceHistory);
  const sites: Item[] = movers
    ? [
        ...movers.fresh.slice(0, SITES).map((mover): Item => ({ key: `new-${mover.key}`, icon: Plus, tone: "neutral", text: t("siteNew", { site: mover.domain, now: mover.now }) })),
        ...movers.rising.slice(0, SITES).map((mover): Item => ({ key: `up-${mover.key}`, icon: ArrowUp, tone: "neutral", text: t("siteUp", { site: mover.domain, before: mover.before, now: mover.now }) })),
        ...movers.falling.slice(0, SITES).map((mover): Item => ({ key: `down-${mover.key}`, icon: ArrowDown, tone: "neutral", text: t("siteDown", { site: mover.domain, before: mover.before, now: mover.now }) })),
      ]
    : [];

  const since = Date.parse(before.collectedAt);
  const until = Date.parse(now.collectedAt);
  const facts: Item[] = report.wrongFacts
    .filter((fact) => Date.parse(fact.foundAt) > since)
    .map((fact): Item => ({ key: `fact-${fact.claim}`, icon: TriangleAlert, tone: "bad", text: t("factNew", { claim: fact.claim }) }));
  const done: Item[] = actions
    .filter((action) => action.doneAt && Date.parse(action.doneAt) > since && Date.parse(action.doneAt) <= until)
    .map((action): Item => ({ key: `done-${action.id}`, icon: CircleCheck, tone: "good", text: <ActionTitle action={action} /> }));

  const groups = [
    { key: "brands", items: brands, empty: "" },
    { key: "sources", items: sites, empty: t("sitesNone") },
    { key: "facts", items: facts, empty: t("factsNone") },
    { key: "done", items: done, empty: t("doneNone"), note: done.length > 0 ? t("doneNote") : undefined },
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map(({ key, items, empty, ...rest }) => (
        <ReportCard key={key} className="flex flex-col gap-3 p-4">
          <h3 className="text-sm font-semibold">{t(`groups.${key}`)}</h3>
          {items.length === 0 ? (
            <p className="text-sm text-pretty text-muted-foreground">{empty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map(({ key, icon: Icon, tone, text }) => (
                <li key={key} className="flex items-start gap-2.5 text-sm">
                  <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", COLORS[tone])} />
                  <span className="min-w-0 text-pretty">{text}</span>
                </li>
              ))}
            </ul>
          )}
          {"note" in rest && rest.note && <p className="text-xs text-pretty text-muted-foreground">{rest.note}</p>}
        </ReportCard>
      ))}
    </div>
  );
}
