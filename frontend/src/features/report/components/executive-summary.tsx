import { ArrowDown, ArrowUp, CircleCheck, Minus, TriangleAlert } from "lucide-react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { ActionTitle } from "@/shared/components/actions/action-title";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import { labelFor } from "@/shared/helpers/labels";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { headlineMetrics, missingSources, outOfTen, promptsWithoutYou, rankedBrands, scoreOf, standing, topCompetitor } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Action, Report } from "@/shared/types/api";
import { groupsAgainstLeader, openActions } from "../helpers/report";

/** The summary names this many of the sites the client is missing from, and this many first steps. */
const SITES_NAMED = 3;
const FIRST_ACTIONS = 3;

interface Finding {
  key: string;
  /** Good news, a problem, or neither. */
  tone: "good" | "bad" | "neutral";
  text: string;
}

/**
 * The report's answer on one screen, for the reader who reads nothing else: where the client stands in a
 * sentence with the trend and the place among the brands, the findings that matter (each a sentence with
 * its number, marked as good news or a problem), and the three things to do first. Everything after this
 * section is the evidence.
 */
export function ExecutiveSummary({ report, actions, actionsSection }: { report: Report; actions: Action[]; actionsSection: number }) {
  const t = useTranslations("Report.summary");
  const headline = useTranslations("Headline");
  const standings = useTranslations("Standing");
  const messages = useMessages();
  const locale = useLocale();
  const { brand, competitors } = report.project;
  const you = scoreOf(report.scores, brand.id);
  if (!you) return null;

  const percent = (value: number) => formatPercent(value / 100, locale);
  const rival = topCompetitor(competitors, report.scores);
  const change = report.history.length > 1 ? (headlineMetrics(report.history, brand.id).find(({ metric }) => metric === "visibility")?.change ?? null) : null;
  const amount = change === null ? null : formatDecimal(Math.abs(change), locale);
  const status = change === null ? "first" : amount === "0" ? "steady" : change > 0 ? "up" : "down";
  const place = standing(report.scores, brand.id, "visibility");
  const ranked = rankedBrands(report);
  const leader = ranked[0];
  const next = ranked.find((row) => !row.isYou);
  const without = promptsWithoutYou(report.prompts, brand.id, competitors.map((competitor) => competitor.id)).length;
  const weakest = groupsAgainstLeader(report, (prompt) => prompt.topic)[0];
  const missing = missingSources(report.topSources, competitors);
  const first = openActions(actions).slice(0, FIRST_ACTIONS);

  const findings: Finding[] = [
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
  ];

  const StatusIcon = status === "up" ? ArrowUp : status === "down" ? ArrowDown : Minus;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl bg-muted px-4 py-4 sm:px-5">
        <p className="text-base font-medium text-pretty sm:text-lg">
          {rival
            ? headline("summary", {
                you: outOfTen(you.visibility),
                percent: formatPercent(you.visibility, locale),
                competitor: rival.brand.name,
                them: outOfTen(rival.score.visibility),
              })
            : headline("summaryAlone", { you: outOfTen(you.visibility), percent: formatPercent(you.visibility, locale) })}
          {change !== null && amount !== null && (
            <span className="font-normal text-muted-foreground"> {amount === "0" ? standings("same") : standings(change > 0 ? "better" : "worse", { amount })}</span>
          )}
        </p>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">{t("trend")}</dt>
            <dd
              className={cn(
                "inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 font-medium ring-1 ring-foreground/10",
                status === "up" && "text-better",
                status === "down" && "text-worse",
              )}
            >
              <StatusIcon aria-hidden className="size-3.5" />
              {t(`status.${status}`)}
            </dd>
          </div>
          {place && place.of > 1 && (
            <div className="flex items-center gap-2">
              <dt className="text-muted-foreground">{t("place")}</dt>
              <dd className="font-medium tabular-nums">{t("placeValue", place)}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2.5">
          <h3 className="text-sm font-semibold">{t("findings")}</h3>
          <ul className="flex flex-col gap-2.5">
            {findings.map(({ key, tone, text }) => {
              const Icon = tone === "good" ? CircleCheck : tone === "bad" ? TriangleAlert : Minus;
              return (
                <li key={key} className="flex items-start gap-2.5 text-sm">
                  <Icon
                    aria-hidden
                    className={cn("mt-0.5 size-4 shrink-0", tone === "good" ? "text-positive" : tone === "bad" ? "text-negative" : "text-muted-foreground")}
                  />
                  <span className="min-w-0 text-pretty">{text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col gap-2.5">
          <h3 className="text-sm font-semibold">{t("first")}</h3>
          {first.length === 0 ? (
            <p className="text-sm text-pretty text-muted-foreground">{t("noActions")}</p>
          ) : (
            <>
              <ol className="flex flex-col gap-2.5">
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
              <p className="text-xs text-muted-foreground">
                <a href="#actions" className="underline-offset-4 hover:underline">
                  {t("more", { section: actionsSection })}
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
