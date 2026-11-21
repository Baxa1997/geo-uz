import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import type { ScopeEngine, SlotTally, WaveScope } from "@/shared/types/api";
import { useSlotWords } from "../hooks/use-slot-words";

/**
 * A value as the scope card shows it, marked with its key: what `backend/tests/test_acceptance.py` reads off the
 * page. Its text is one count ("15 completed") or a count out of another ("2 of 10").
 */
function Metric({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <span data-metric={name} className="tabular-nums">
      {children}
    </span>
  );
}

/** The reasons a slot is left out or fails that the card puts into words (`backend/app/slots.py`, REASONS). */
const REASONS = ["free_check_subset", "brand_free_check_subset", "not_planned", "error", "empty_answer", "not_logged"] as const;
type Reason = (typeof REASONS)[number];
const isReason = (key: string): key is Reason => (REASONS as readonly string[]).includes(key);

/** The question languages in the order the report lists them. */
const LANGUAGE_ORDER = ["ru", "uz", "en"];
const languagesIn = (counts: Record<string, number>) => [...LANGUAGE_ORDER.filter((language) => counts[language]), ...Object.keys(counts).filter((language) => !LANGUAGE_ORDER.includes(language))];

/**
 * The scope card (report spec §4.0), the first thing under the report's title: which check this is, which
 * assistants were asked (each with its model, where its answers come from, what it was told of the customer's
 * place, and how many of its answers searched the web), what is not checked yet, the questions, and every
 * answer planned against what came back, what was left out and why. Every number is the slot log's, counted
 * by the backend (`metrics.scope`); nothing here is worked out from the answers shown further down.
 */
export function ScopeCard({ scope }: { scope: WaveScope }) {
  const t = useTranslations("Report.scope");
  const engineNames = useTranslations("Engines");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const { slots, prompts, branded } = scope;
  const nameOf = (engine: string) => (engine === "chatgpt" || engine === "gemini" ? engineNames(engine) : engine);
  const chatgpt = scope.engines.find((engine) => engine.engine === "chatgpt");

  const words = useSlotWords();
  const located = (engine: ScopeEngine) => words.located(engine.location);

  // Why the slots left out were left out, and why the failed ones failed, each with how many
  const reasons = (tally: SlotTally, kind: "excluded" | "failed", group: "buyers" | "brand") =>
    Object.entries(kind === "excluded" ? tally.excluded_reasons : tally.failed_reasons).map(([reason, count]) => {
      const key = reason === "free_check_subset" && group === "brand" ? "brand_free_check_subset" : reason;
      return (
        <li key={reason}>
          <span className="tabular-nums">{count}</span> · {isReason(key) ? t(`reasons.${key}`, { asked: chatgpt?.asked ?? 0, questions: prompts.discovery }) : reason}
        </li>
      );
    });

  const byLanguage = (counts: Record<string, number>, metric?: string) =>
    languagesIn(counts).map((language, index) => (
      <span key={language}>
        {index > 0 && " · "}
        {language.toUpperCase()} {metric ? <Metric name={`${metric}.${language}`}>{counts[language]}</Metric> : <span className="tabular-nums">{counts[language]}</span>}
      </span>
    ));

  const rows: { key: string; label: string; value: React.ReactNode }[] = [
    {
      key: "check",
      label: t("check"),
      value: `${t(scope.wave.is_baseline ? "baseline" : "later")} · ${t("collected", { date: formatLongDate(scope.wave.collected_at, locale, timeZone) })}`,
    },
    {
      key: "assistants",
      label: t("assistants"),
      value: (
        <ul className="flex flex-col gap-1">
          {scope.engines.map((engine) => (
            <li key={engine.engine} className="text-pretty">
              <span className="font-semibold">{nameOf(engine.engine)}</span>
              {" — "}
              <Metric name={`scope.engine.${engine.engine}`}>{t("answers", { count: engine.completed })}</Metric>
              {engine.models.length > 0 && (
                <>
                  {" · "}
                  <span className="font-mono text-[0.8125rem]">{engine.models.join(", ")}</span>
                </>
              )}
              {engine.surface && ` · ${words.surface(engine.surface)}`}
              {` · ${located(engine)}${engine.location_varies ? ` (${t("varies")})` : ""} · `}
              <Metric name={`scope.searched.${engine.engine}`}>{t("searched", { searched: engine.searched, completed: engine.completed })}</Metric>
            </li>
          ))}
        </ul>
      ),
    },
    { key: "notTracked", label: t("notTracked"), value: scope.not_tracked.map((engine) => t(`notTrackedNames.${engine === "yandex" ? "yandex" : "google_ai_overviews"}`)).join(", ") },
    {
      key: "questions",
      label: t("questions"),
      value: (
        <>
          <Metric name="scope.discovery_prompts">{t("buyerQuestions", { count: prompts.discovery })}</Metric> ({byLanguage(prompts.by_language)}) · {t("brandQuestions", { count: prompts.branded })} ·{" "}
          {t("howto", { count: prompts.howto })}
        </>
      ),
    },
    {
      key: "slots",
      label: t("slots"),
      value: (
        <>
          {t("slotQuestions", { count: prompts.discovery })} × {t("slotAssistants", { count: scope.engines.length })} × {t("slotRuns", { count: scope.runs_per_prompt })} ={" "}
          <Metric name="scope.slots">{slots.slots}</Metric>: <Metric name="scope.completed">{t("completed", { count: slots.completed })}</Metric> ·{" "}
          <Metric name="scope.excluded">{t("excluded", { count: slots.excluded })}</Metric> · <Metric name="scope.failed">{t("failed", { count: slots.failed })}</Metric>
          {slots.unfinished > 0 && ` · ${t("unfinished", { count: slots.unfinished })}`}
        </>
      ),
    },
    ...(slots.excluded > 0
      ? [{ key: "excludedWhy", label: t("excludedWhy"), value: <ul data-metric="scope.excluded_reason">{reasons(slots, "excluded", "buyers")}</ul> }]
      : []),
    ...(slots.failed > 0 ? [{ key: "failedWhy", label: t("failedWhy"), value: <ul data-metric="scope.failed_reason">{reasons(slots, "failed", "buyers")}</ul> }] : []),
    { key: "languages", label: t("byLanguage"), value: byLanguage(scope.answers_by_language, "scope.language") },
    ...(branded.slots > 0
      ? [
          {
            key: "branded",
            label: t("branded"),
            value: (
              <>
                {t("brandedValue", { completed: branded.completed })}
                {(branded.excluded > 0 || branded.failed > 0) && (
                  <ul className="mt-0.5 text-muted-foreground">
                    {reasons(branded, "excluded", "brand")}
                    {reasons(branded, "failed", "brand")}
                  </ul>
                )}
              </>
            ),
          },
        ]
      : []),
    { key: "brands", label: t("brands"), value: t("brandsValue", { tracked: scope.brands_tracked, others: scope.other_names }) },
  ];

  return (
    <div data-block="scope" className="@container flex flex-col gap-1.5 print:break-inside-avoid">
      <div className="overflow-hidden rounded-[3px] border border-foreground/20">
        <p className="border-b border-foreground/20 bg-muted px-3 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("title")}</p>
        <dl className="divide-y divide-foreground/10 text-sm">
          {rows.map(({ key, label, value }) => (
            <div key={key} className="grid gap-x-4 gap-y-0.5 px-3 py-2 @md:grid-cols-[9.5rem_minmax(0,1fr)] print:break-inside-avoid">
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase @md:pt-0.5">{label}</dt>
              <dd className="min-w-0 text-pretty">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {scope.wave.reconstructed && <p className="text-xs text-pretty text-muted-foreground">{t("rebuilt")}</p>}
    </div>
  );
}
