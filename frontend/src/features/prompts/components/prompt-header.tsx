import { useLocale, useMessages, useTimeZone, useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate, formatShortDate } from "@/shared/helpers/dates";
import { labelFor } from "@/shared/helpers/labels";
import { isTracked } from "@/shared/helpers/prompts";
import { cn } from "@/shared/helpers/utils";
import type { Project, Prompt } from "@/shared/types/api";
import { PromptArchiveButton } from "./prompt-archive-button";

/**
 * The top of a question's page: the question in full with a button that archives it (or tracks it again),
 * then its facts in a row, as on Peec's prompt page: when it was added, its topic, the language it is
 * asked in, the city it is asked for, and whether it is tracked, waiting for its first check or archived.
 * Each fact's label says on hover what the fact means for the results.
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
    { key: "city", label: t("facts.city"), hint: t("hints.city"), value: labelFor(messages.Cities, prompt.location) },
    {
      key: "status",
      label: t("facts.status"),
      hint: t(`hints.status.${status}`),
      value: (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2 rounded-full", status === "tracked" ? "bg-positive" : "bg-muted-foreground/50")} />
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
        <div className="flex min-w-0 flex-1 basis-80 flex-col gap-1">
          <p className="text-sm text-muted-foreground">{t("label")}</p>
          <p lang={prompt.language} className="text-xl font-semibold tracking-tight text-pretty">
            {prompt.text}
          </p>
        </div>
        <PromptArchiveButton projectId={project.id} prompt={prompt} full={full} />
      </div>

      <div className="@container overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {/* Every cell draws its left and top border; the ones on the outer edges fall outside and are clipped */}
        <dl className="-mt-px -ml-px grid grid-cols-2 @xl:grid-cols-3 @4xl:grid-cols-5">
          {facts.map(({ key, label, hint, value, note }, index) => (
            <div
              key={key}
              // The fifth fact fills the rest of its line at two and three per line
              className={cn("flex min-w-0 flex-col gap-1 border-t border-l px-4 py-3", index === facts.length - 1 && "col-span-2 @4xl:col-span-1")}
            >
              <dt className="text-sm text-muted-foreground">
                <Hint text={hint}>{label}</Hint>
              </dt>
              <dd className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-medium">
                <span className="min-w-0 truncate">{value}</span>
                {note && <span className="text-xs font-normal text-muted-foreground">{note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
