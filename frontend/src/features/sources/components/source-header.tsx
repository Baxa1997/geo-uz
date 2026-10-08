import { ArrowUpRight } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { SourceTypeDot } from "@/shared/components/scores/source-type-dot";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { cn } from "@/shared/helpers/utils";
import type { Source, SourceType } from "@/shared/types/api";
import { ChangeMark } from "./change-mark";
import { Initial, Mark } from "./parts";

/**
 * The top of a cited site's page, as on Peec's domain page: the site with a link that opens it, then its
 * facts in a row. Kind; the share of answers that cite it, with its change since the previous check and
 * the number of answers; whether the client is listed there (for the client's own site and a competitor's,
 * whose site it is instead); and how many of its pages an answer cites. A site the latest check didn't cite shows
 * when it was last cited instead. Each fact's label explains itself on hover.
 */
export function SourceHeader({
  domain,
  type,
  source,
  now,
  before,
  owner,
  lastCited,
}: {
  domain: string;
  type: SourceType;
  /** The site in the latest check; undefined when that check didn't cite it. */
  source: Source | undefined;
  /** Percent of answers citing it in the latest check, and in the one before (null on a first check). */
  now: number;
  before: number | null;
  /** The competitor whose site it is. */
  owner: string | null;
  /** The latest check that cited it, when the latest one didn't. */
  lastCited: string | null;
}) {
  const t = useTranslations("SourcePage");
  const sources = useTranslations("SourcesPage");
  const types = useTranslations("SourcesPage.types");
  const about = useTranslations("SourceTypes.about");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const open = type !== "own" && type !== "competitor";

  const facts: { key: string; label: string; hint: string; value: React.ReactNode; note?: string }[] = [
    {
      key: "type",
      label: t("facts.type"),
      hint: t("hints.type"),
      value: (
        <Hint text={about(type)} focusable={false} className="max-w-full items-center gap-2 text-sm">
          <SourceTypeDot type={type} className="size-2.5" />
          <span className="truncate">{types(type)}</span>
        </Hint>
      ),
    },
    {
      key: "used",
      label: t("facts.used"),
      hint: t("hints.used"),
      value: (
        <span className="inline-flex items-center gap-2 text-base tabular-nums">
          {formatPercent(now / 100, locale)}
          {before !== null && <ChangeMark now={now} before={before} />}
        </span>
      ),
      note: source ? t("answersCount", { count: source.count }) : undefined,
    },
    ...(source
      ? [
          open
            ? {
                key: "listed",
                label: t("facts.listed"),
                hint: t("hints.listed"),
                value: <Mark value={source.brandListed} yes={sources("isListed")} no={sources("notListed")} className="text-sm [&>svg]:size-4" />,
              }
            : {
                key: "owner",
                label: t("facts.owner"),
                hint: t("hints.owner"),
                value: <span className="text-sm">{owner ? t("competitorSite", { name: owner }) : t("ownSite")}</span>,
              },
          {
            key: "citations",
            label: t("facts.citations"),
            hint: t("hints.citations"),
            value: (
              <span className="text-base tabular-nums">
                {formatDecimal(source.pages.reduce((sum, page) => sum + page.count, 0) / Math.max(1, source.count), locale)}
              </span>
            ),
          },
        ]
      : lastCited
        ? [{ key: "lastCited", label: t("facts.lastCited"), hint: t("hints.lastCited"), value: formatLongDate(lastCited, locale, timeZone) }]
        : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <Initial text={domain} className="size-11 rounded-xl text-lg" />
        <div className="flex min-w-0 flex-col">
          <p className="text-sm text-muted-foreground">{t("label")}</p>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <p className="min-w-0 truncate text-xl font-semibold tracking-tight">{domain}</p>
            <a
              href={`https://${domain}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex shrink-0 items-center gap-0.5 rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {t("visit")}
              <ArrowUpRight aria-hidden className="size-3.5" />
            </a>
          </div>
        </div>
      </div>

      <div className="@container overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {/* Every cell draws its left and top border; the ones on the outer edges fall outside and are clipped */}
        <dl className={cn("-mt-px -ml-px grid grid-cols-2", facts.length === 4 ? "@2xl:grid-cols-4" : "@2xl:grid-cols-3")}>
          {facts.map(({ key, label, hint, value, note }, index) => (
            <div
              key={key}
              // An odd last fact fills the rest of its line on a phone
              className={cn("flex min-w-0 flex-col gap-1 border-t border-l px-4 py-3", index === facts.length - 1 && facts.length % 2 === 1 && "col-span-2 @2xl:col-span-1")}
            >
              <dt className="text-sm text-muted-foreground">
                <Hint text={hint}>{label}</Hint>
              </dt>
              <dd className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-0.5 font-medium">
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
