import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { LightbulbIcon as Lightbulb } from "@phosphor-icons/react/dist/ssr/Lightbulb";
import { WarningIcon as TriangleAlert } from "@phosphor-icons/react/dist/ssr/Warning";
import { useMessages, useTranslations } from "next-intl";
import { labelFor } from "@/shared/helpers/labels";
import { useCountWords } from "@/shared/hooks/use-count-words";
import { cn } from "@/shared/helpers/utils";
import type { Action, Report, WaveResponse } from "@/shared/types/api";
import { sectionNumber } from "../constants";
import { answerNumbers } from "../helpers/evidence";
import { outlook, type Level, type Opportunity, type Risk } from "../helpers/risks";
import { EvidenceLinks } from "./evidence";
import { ReportCard } from "./report-parts";
import type { AppIcon } from "@/shared/types/icon";

/** A level's dot: a risk grows redder with its level, an opportunity greener. */
const DOTS: Record<"risk" | "opportunity", Record<Level, string>> = {
  risk: { high: "bg-negative", medium: "bg-progress", low: "bg-muted-foreground/50" },
  opportunity: { high: "bg-positive", medium: "bg-positive/60", low: "bg-muted-foreground/50" },
};

interface Line {
  key: string;
  level: Level;
  title: string;
  detail: string;
  action: number | null;
  evidence: string[];
}

/**
 * The report's register of risks and opportunities, side by side: what may cost the client customers and
 * where it can gain, each entry a sentence with its numbers, a line on what it means, its level, and the
 * action of the plan that answers it, and the answers it stands on (Phase 0 item 0.5), each a link to it in the
 * evidence section. It is what the plan in the next section is made for.
 */
export function Risks({ report, actions, wave }: { report: Report; actions: Action[]; wave: WaveResponse }) {
  const t = useTranslations("Report.risks");
  const messages = useMessages();
  const { risks, opportunities } = outlook(report, actions, wave);
  const numbers = answerNumbers(wave.wave);
  const words = useCountWords();
  const topics = (keys: string[]) => keys.map((key) => t("quote", { text: labelFor(messages.Topics, key) })).join(", ");
  const language = (key: string) => (key === "uz" || key === "ru" || key === "en" ? t(`languages.${key}`) : key);

  const risk = (entry: Risk): Pick<Line, "title" | "detail"> => {
    switch (entry.kind) {
      case "facts":
        return { title: t("items.facts.title", { count: entry.count }), detail: t("items.facts.detail", { claim: entry.claim }) };
      case "lostTopics":
        return { title: t("items.lostTopics.title", { count: entry.topics.length, topics: topics(entry.topics) }), detail: t("items.lostTopics.detail", { leader: words.names(entry.leaders) }) };
      case "leaderGap":
        return { title: t("items.leaderGap.title", { leader: entry.leader, named: entry.leaderNamed, you: entry.you, answers: entry.answers }), detail: t("items.leaderGap.detail") };
      case "rivalRising":
        return { title: t("items.rivalRising.title", { name: entry.name, points: entry.points, named: entry.named, answers: entry.answers }), detail: t("items.rivalRising.detail") };
      case "falling":
        return { title: t("items.falling.title", { points: entry.points, named: entry.named, answers: entry.answers }), detail: t("items.falling.detail") };
      case "tone":
        return { title: t("items.tone.title", { negative: entry.negative, mentions: entry.mentions }), detail: t("items.tone.detail") };
    }
  };

  const opportunity = (entry: Opportunity): Pick<Line, "title" | "detail"> => {
    switch (entry.kind) {
      case "listings":
        return {
          title: t("items.listings.title", { count: entry.count, answers: entry.answers, sites: entry.sites.map((site) => `${site.domain} (${words.fraction(site.cited, entry.answers)})`).join(", ") }),
          detail: t("items.listings.detail"),
        };
      case "closeTopics":
        return { title: t("items.closeTopics.title", { count: entry.topics.length, topics: topics(entry.topics) }), detail: t("items.closeTopics.detail", { gap: entry.gap }) };
      case "ownSite":
        return { title: t("items.ownSite.title", { you: entry.you, rival: words.names(entry.rivals), rivalCited: entry.rivalCited, answers: entry.answers }), detail: t("items.ownSite.detail") };
      case "rivalFalling":
        return { title: t("items.rivalFalling.title", { name: entry.name, points: entry.points }), detail: t("items.rivalFalling.detail") };
      case "language":
        return {
          title: t("items.language.title", {
            weak: language(entry.weak),
            weakNamed: entry.weakNamed,
            weakAnswers: entry.weakAnswers,
            strong: language(entry.strong),
            strongNamed: entry.strongNamed,
            strongAnswers: entry.strongAnswers,
          }),
          detail: t("items.language.detail", { weak: language(entry.weak) }),
        };
    }
  };

  const sides: { key: "risk" | "opportunity"; icon: AppIcon; title: string; empty: string; lines: Line[] }[] = [
    {
      key: "risk",
      icon: TriangleAlert,
      title: t("risks"),
      empty: t("risksNone"),
      lines: risks.map((entry) => ({ key: entry.kind, level: entry.level, action: entry.action, evidence: entry.evidence, ...risk(entry) })),
    },
    {
      key: "opportunity",
      icon: Lightbulb,
      title: t("opportunities"),
      empty: t("opportunitiesNone"),
      lines: opportunities.map((entry) => ({ key: entry.kind, level: entry.level, action: entry.action, evidence: entry.evidence, ...opportunity(entry) })),
    },
  ];

  return (
    <div className="@container">
      <div className="grid items-start gap-4 @3xl:grid-cols-2">
        {sides.map(({ key, icon: Icon, title, empty, lines }) => (
          <ReportCard key={key} className="flex flex-col">
            <h3 className={cn("flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold", key === "risk" ? "bg-negative/8" : "bg-positive/8")}>
              <Icon aria-hidden className={cn("size-4 shrink-0", key === "risk" ? "text-negative" : "text-positive")} />
              {title}
              {lines.length > 0 && <span className="font-normal text-muted-foreground tabular-nums">· {lines.length}</span>}
            </h3>
            {lines.length === 0 ? (
              <p className="px-4 py-3 text-sm text-pretty text-muted-foreground">{empty}</p>
            ) : (
              <ol className="divide-y">
                {lines.map((line, index) => (
                  <li key={line.key} className="flex items-start gap-3 px-4 py-3 print:break-inside-avoid">
                    <span aria-hidden className="mt-0.5 w-4 shrink-0 text-sm text-muted-foreground tabular-nums">{index + 1}.</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <p className="text-sm font-medium text-pretty">{line.title}</p>
                      <p className="text-sm text-pretty text-muted-foreground">{line.detail}</p>
                      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span aria-hidden className={cn("size-2 rounded-full", DOTS[key][line.level])} />
                          {t(`levels.${key}.${line.level}`)}
                        </span>
                        <EvidenceLinks ids={line.evidence} numbers={numbers} />
                        {line.action !== null && (
                          <a href="#actions" className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                            <ArrowRight aria-hidden className="size-3" />
                            {t("action", { number: line.action, section: sectionNumber("actions") })}
                          </a>
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </ReportCard>
        ))}
      </div>
    </div>
  );
}
