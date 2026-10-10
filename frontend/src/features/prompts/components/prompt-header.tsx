import { useLocale, useMessages, useTimeZone, useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { UzFlag } from "@/shared/components/uz-flag";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate, formatShortDate } from "@/shared/helpers/dates";
import { labelFor } from "@/shared/helpers/labels";
import { isTracked } from "@/shared/helpers/prompts";
import { cn } from "@/shared/helpers/utils";
import type { Project, Prompt } from "@/shared/types/api";
import { PromptArchiveButton } from "./prompt-archive-button";

/**
 * The top of a question's page, as on Peec's prompt page: the question in full with a button that archives
 * it (or tracks it again), then its facts in a strip across the whole panel: when it was added, its topic,
 * the language it is asked in, the city it is asked from (with the flag, as Peec's location), and whether it
 * is tracked, waiting for its first check or archived, as a colored chip. Each fact's label says on hover
 * what the fact means for the results.
 */
export function PromptHeader({
  prompt,
  project,
  asked,
  nextRunAt,
  full,
}: {
  prompt: Prompt;
  project: Project;
  /** Whether a check has asked it yet. */
  asked: boolean;
  nextRunAt: string | null;
  /** The plan's questions are all in use: an archived question can't be tracked again. */
  full: boolean;
}) {
  const t = useTranslations("PromptPage");
  const messages = useMessages();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const status = !isTracked(prompt) ? "archived" : asked ? "tracked" : "queued";

  const facts: { key: string; label: string; hint: string; value: React.ReactNode; note?: string }[] = [
    { key: "added", label: t("facts.added"), hint: t("hints.added"), value: formatLongDate(prompt.createdAt, locale, timeZone) },
    { key: "topic", label: t("facts.topic"), hint: t("hints.topic"), value: labelFor(messages.Topics, prompt.topic) },
    { key: "language", label: t("facts.language"), hint: t("hints.language"), value: t(`languages.${prompt.language}`) },
    {
      key: "city",
      label: t("facts.city"),
      hint: t("hints.city"),
      value: (
        <span className="inline-flex min-w-0 items-center gap-2">
          <UzFlag />
          <span className="truncate">{labelFor(messages.Cities, prompt.location)}</span>
        </span>
      ),
    },
    {
      key: "status",
      label: t("facts.status"),
      hint: t(`hints.status.${status}`),
      value: (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-sm",
            status === "tracked" ? "bg-positive/10 text-positive" : "bg-muted text-muted-foreground",
          )}
        >
          <span aria-hidden className={cn("size-1.5 rounded-full", status === "tracked" ? "bg-positive" : "bg-muted-foreground/60")} />
          {t(`status.${status}`)}
        </span>
      ),
      note:
        status === "archived" && prompt.archivedAt
          ? t("status.archivedOn", { date: formatLongDate(prompt.archivedAt, locale, timeZone) })
          : nextRunAt
            ? t("status.nextRun", { date: formatShortDate(nextRunAt, locale, timeZone) })
            : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <p lang={prompt.language} className="min-w-0 flex-1 basis-80 text-xl leading-7 font-semibold tracking-tight text-pretty">
          {prompt.text}
        </p>
        <PromptArchiveButton projectId={project.id} prompt={prompt} full={full} />
      </div>

      {/* Across the whole panel, as on Peec: out of the page's padding, a line above and below */}
      <div data-tour="header" className="@container -mx-4 overflow-hidden border-y sm:-mx-5">
        {/* Every cell draws its left and top border; the ones on the outer edges fall outside and are clipped */}
        <dl className="-mt-px -ml-px grid grid-cols-2 @xl:grid-cols-3 @4xl:grid-cols-5">
          {facts.map(({ key, label, hint, value, note }, index) => (
            <div
              key={key}
              // The fifth fact fills the rest of its line at two and three per line
              className={cn("flex min-w-0 flex-col gap-1.5 border-t border-l px-4 py-3.5 sm:px-5", index === facts.length - 1 && "col-span-2 @4xl:col-span-1")}
            >
              <dt className="text-sm text-muted-foreground">
                <Hint text={hint}>{label}</Hint>
              </dt>
              <dd className="flex min-h-7 min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.9375rem]">
                <span className="flex min-w-0 truncate">{value}</span>
                {note && <span className="text-xs text-muted-foreground">{note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
