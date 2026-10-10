import { CircleCheck, ListChecks, TriangleAlert, type LucideIcon } from "lucide-react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { ActionTitle } from "@/shared/components/actions/action-title";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import { labelFor } from "@/shared/helpers/labels";
import { formatPercent } from "@/shared/helpers/numbers";
import { headlineMetrics, missingSources, outOfTen, promptsWithoutYou, rankedBrands, scoreOf, standing, topCompetitor } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Action, Report } from "@/shared/types/api";
import { groupsAgainstLeader, openActions } from "../helpers/report";

/** The summary names this many of the sites the client is missing from, this many first steps, and this many findings a card. */
const SITES_NAMED = 3;
const FIRST_ACTIONS = 3;
const FINDINGS_SHOWN = 4;

interface Finding {
  key: string;
  /** Good news or a problem; the place without competitors to compare with is neither, and not told. */
  tone: "good" | "bad" | "neutral";
  text: string;
}

/** One of the summary's three cards: what went well, what needs attention, what to do first. */
function Card({ icon: Icon, tone, title, children }: { icon: LucideIcon; tone: "good" | "bad" | "do"; title: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl p-4 ring-1 ring-foreground/10",
        tone === "good" && "bg-[color-mix(in_oklab,var(--positive)_7%,var(--card))]",
        tone === "bad" && "bg-[color-mix(in_oklab,var(--negative)_6%,var(--card))]",
        tone === "do" && "bg-card",
      )}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon aria-hidden className={cn("size-4 shrink-0", tone === "good" ? "text-positive" : tone === "bad" ? "text-negative" : "text-foreground")} />
        {title}
      </h3>
      {children}
    </div>
  );
}

/**
 * The report's answer on one screen, for the reader who reads nothing else: where the client stands in a
 * sentence (`verdict`; left out under a cover that says it), then three cards side by side: what went well,
 * what needs attention (each a sentence with its number), and the three things to do first. The change of
 * visibility is told among them unless a cover above shows it (`trend`). Everything after this section is
 * the evidence.
 */
export function ExecutiveSummary({
  report,
  actions,
  actionsSection,
  moreHref = "#actions",
  verdict = true,
  trend = true,
}: {
  report: Report;
  actions: Action[];
  actionsSection: number;
  /** Where "all the recommendations" leads: the section below, or the report's page from Hisobotlar. */
  moreHref?: string;
  verdict?: boolean;
  trend?: boolean;
}) {
  const t = useTranslations("Report.summary");
  const headline = useTranslations("Headline");
  const messages = useMessages();
  const locale = useLocale();
  const { brand, competitors } = report.project;
  const you = scoreOf(report.scores, brand.id);
  if (!you) return null;

  const percent = (value: number) => formatPercent(value / 100, locale);
  const rival = topCompetitor(competitors, report.scores);
  const metrics = report.history.length > 1 ? headlineMetrics(report.history, brand.id) : [];
  const change = metrics.find(({ metric }) => metric === "visibility")?.change ?? null;
  const points = change === null ? 0 : Math.round(Math.abs(change));
  const voiceChange = Math.round(metrics.find(({ metric }) => metric === "shareOfVoice")?.change ?? 0);
  // The questions whose answers name the client at least once: good news to set beside the ones it misses
  const namedIn = report.prompts.filter((result) => result.answers.some((answer) => answer.mentions.some((mention) => mention.brandId === brand.id))).length;
  const place = standing(report.scores, brand.id, "visibility");
  const ranked = rankedBrands(report);
  const leader = ranked[0];
  const next = ranked.find((row) => !row.isYou);
  const without = promptsWithoutYou(report.prompts, brand.id, competitors.map((competitor) => competitor.id)).length;
  const weakest = groupsAgainstLeader(report, (prompt) => prompt.topic)[0];
  const missing = missingSources(report.topSources, competitors);
  const first = openActions(actions).slice(0, FIRST_ACTIONS);
  const before = report.history.at(-2)?.collectedAt;
  const doneThisWeek = before
    ? actions.filter((action) => action.doneAt && Date.parse(action.doneAt) > Date.parse(before) && Date.parse(action.doneAt) <= Date.parse(report.method.collectedAt)).length
    : 0;

  const findings: Finding[] = [
    ...(trend && change !== null && points > 0
      ? [{ key: "trend", tone: change > 0 ? "good" : "bad", text: t(change > 0 ? "trendUp" : "trendDown", { points }) } as const]
      : []),
    ...(namedIn > 0 ? [{ key: "named", tone: "good", text: t("namedIn", { count: namedIn, total: report.prompts.length }) } as const] : []),
    ...(voiceChange !== 0
      ? [{ key: "voice", tone: voiceChange > 0 ? "good" : "bad", text: t(voiceChange > 0 ? "voiceUp" : "voiceDown", { points: Math.abs(voiceChange) }) } as const]
      : []),
    ...(you.sentiment !== null && you.sentiment >= 67
      ? [{ key: "tone", tone: "good", text: t("tonePositive", { score: Math.round(you.sentiment) }) } as const]
      : you.sentiment !== null && you.sentiment <= 33
        ? [{ key: "tone", tone: "bad", text: t("toneNegative", { score: Math.round(you.sentiment) }) } as const]
        : []),
    !place || competitors.length === 0 || !leader
      ? { key: "rank", tone: "neutral", text: t("rankOnly") }
      : place.rank === 1
        ? {
            key: "rank",
            tone: "good",
            text: next ? t("rankFirst", { of: place.of, next: next.brand.name, nextValue: formatPercent(next.score.visibility, locale) }) : t("rankOnly"),
          }
        : {
            key: "rank",
            tone: "bad",
            text: t("rankBehind", {
              rank: place.rank,
              of: place.of,
              leader: leader.brand.name,
              leaderValue: formatPercent(leader.score.visibility, locale),
              gap: Math.round((leader.score.visibility - you.visibility) * 100),
            }),
          },
    {
      key: "missing",
      tone: without > 0 ? "bad" : "good",
      text: [
        without > 0 ? t("missing", { count: without, total: report.prompts.length }) : t("missingNone"),
        // The topic to start with, when a competitor is ahead there
        weakest?.leader && weakest.leader.value > weakest.you
          ? t("weakTopic", {
              topic: labelFor(messages.Topics, weakest.key),
              value: percent(weakest.you),
              leader: weakest.leader.name,
              leaderValue: percent(weakest.leader.value),
            })
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    },
    missing.length > 0
      ? {
          key: "sources",
          tone: "bad",
          text: t("sources", {
            count: missing.length,
            sites: missing
              .slice(0, SITES_NAMED)
              .map((source) => source.domain)
              .join(", "),
          }),
        }
      : { key: "sources", tone: "good", text: t("sourcesNone") },
    report.wrongFacts.length > 0
      ? { key: "facts", tone: "bad", text: t("facts", { count: report.wrongFacts.length }) }
      : { key: "facts", tone: "good", text: t("factsNone") },
    ...(doneThisWeek > 0 ? [{ key: "done", tone: "good", text: t("doneWeek", { count: doneThisWeek }) } as const] : []),
  ];
  const good = findings.filter((finding) => finding.tone === "good").slice(0, FINDINGS_SHOWN);
  const bad = findings.filter((finding) => finding.tone === "bad").slice(0, FINDINGS_SHOWN);

  const list = (items: Finding[], Icon: LucideIcon, color: string) => (
    <ul className="flex flex-col gap-2.5">
      {items.map(({ key, text }) => (
        <li key={key} className="flex items-start gap-2.5 text-sm">
          <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", color)} />
          <span className="min-w-0 text-pretty">{text}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-4">
      {verdict && (
        <p className="rounded-xl bg-muted px-4 py-4 text-base font-medium text-pretty sm:px-5 sm:text-lg">
          {rival
            ? headline("summary", {
                you: outOfTen(you.visibility),
                percent: formatPercent(you.visibility, locale),
                competitor: rival.brand.name,
                them: outOfTen(rival.score.visibility),
              })
            : headline("summaryAlone", { you: outOfTen(you.visibility), percent: formatPercent(you.visibility, locale) })}
        </p>
      )}

      {/* Three cards side by side once there is room: on paper too */}
      <div className="@container">
        <div className="grid gap-3 @2xl:grid-cols-3">
          <Card icon={CircleCheck} tone="good" title={t("good")}>
            {good.length > 0 ? list(good, CircleCheck, "text-positive") : <p className="text-sm text-pretty text-muted-foreground">{t("goodNone")}</p>}
          </Card>
          <Card icon={TriangleAlert} tone="bad" title={t("attention")}>
            {bad.length > 0 ? list(bad, TriangleAlert, "text-negative") : <p className="text-sm text-pretty text-muted-foreground">{t("attentionNone")}</p>}
          </Card>
          <Card icon={ListChecks} tone="do" title={t("first")}>
            {first.length === 0 ? (
              <p className="text-sm text-pretty text-muted-foreground">{t("noActions")}</p>
            ) : (
              <>
                <ol className="flex flex-col gap-3">
                  {first.map((action, index) => (
                    <li key={action.id} className="flex items-start gap-2.5 text-sm">
                      <span aria-hidden className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background tabular-nums">
                        {index + 1}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-medium text-pretty">
                          <ActionTitle action={action} />
                        </span>
                        {/* Two wrong facts would otherwise read the same */}
                        {action.kind === "fact" && <span className="text-pretty text-muted-foreground">“{action.claim}”</span>}
                        <ImpactBadge impact={action.impact} />
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="mt-auto text-xs text-muted-foreground">
                  <a href={moreHref} className="underline-offset-4 hover:underline">
                    {t("more", { section: actionsSection })}
                  </a>
                </p>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
