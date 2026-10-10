import { ArrowUpRight } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { InfoTip } from "@/shared/components/info-tip";
import { SourceTypeDot } from "@/shared/components/scores/source-type-dot";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { cn } from "@/shared/helpers/utils";
import type { Source, SourceType } from "@/shared/types/api";
import { ChangeMark } from "./change-mark";
import { Initial, Mark } from "./parts";

/**
 * The top of a cited site's page, as on Peec's domain page: the site's mark, its name and a link that
 * opens it, then its facts in a strip across the whole panel, each with an ⓘ. Kind; how many answers cite
 * it; their share, with its change since the previous check; whether the client is listed there (for the
 * client's own site and a competitor's, whose site it is instead); and how many of its pages an answer
 * cites. A site the latest check didn't cite shows when it was last cited instead.
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
  const types = useTranslations("SourceTypes.short");
  const about = useTranslations("SourceTypes.about");
  const common = useTranslations("Common");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const open = type !== "own" && type !== "competitor";

  const facts: { key: string; label: string; hint: string; value: React.ReactNode }[] = [
    {
      key: "type",
      label: t("facts.type"),
      hint: t("hints.type"),
      value: (
        // The short name in a pill, as Peec's; the hint says what the kind covers
        <Hint text={about(type)} focusable={false} className="max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-sm">
          <SourceTypeDot type={type} className="size-2.5" />
          <span className="truncate">{types(type)}</span>
        </Hint>
      ),
    },
    ...(source ? [{ key: "answers", label: t("facts.answers"), hint: t("hints.answers"), value: <span className="tabular-nums">{source.count}</span> }] : []),
    {
      key: "used",
      label: t("facts.used"),
      hint: t("hints.used"),
      value: (
        <span className="inline-flex items-center gap-2 tabular-nums">
          {formatPercent(now / 100, locale)}
          {before !== null && <ChangeMark now={now} before={before} />}
        </span>
      ),
    },
    ...(source
      ? [
          open
            ? {
                key: "listed",
                label: t("facts.listed"),
                hint: t("hints.listed"),
                value: <Mark value={source.brandListed} yes={sources("isListed")} no={sources("notListed")} className="text-[0.9375rem] [&>svg]:size-4" />,
              }
            : {
                key: "owner",
                label: t("facts.owner"),
                hint: t("hints.owner"),
                value: owner ? t("competitorSite", { name: owner }) : t("ownSite"),
              },
          {
            key: "citations",
            label: t("facts.citations"),
            hint: t("hints.citations"),
            value: <span className="tabular-nums">{formatDecimal(source.pages.reduce((sum, page) => sum + page.count, 0) / Math.max(1, source.count), locale)}</span>,
          },
        ]
      : lastCited
        ? [{ key: "lastCited", label: t("facts.lastCited"), hint: t("hints.lastCited"), value: formatLongDate(lastCited, locale, timeZone) }]
        : []),
  ];

  return (
    <>
      <div className="flex min-w-0 items-center gap-3.5">
        <Initial text={domain} className="size-11 rounded-xl bg-background text-lg ring-1 ring-border" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="min-w-0 truncate text-xl leading-7 font-semibold tracking-tight">{domain}</p>
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex w-fit items-center gap-0.5 rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t("visit")}
            <ArrowUpRight aria-hidden className="size-3.5" />
          </a>
        </div>
      </div>

      {/* Across the whole panel, as on Peec: out of the page's padding, a line above and below */}
      <div className="@container -mx-4 overflow-hidden border-y sm:-mx-5">
        {/* Every cell draws its left and top border; the ones on the outer edges fall outside and are clipped */}
        <dl className={cn("-mt-px -ml-px grid grid-cols-2", facts.length === 5 ? "@3xl:grid-cols-5" : facts.length === 4 ? "@2xl:grid-cols-4" : "@2xl:grid-cols-3")}>
          {facts.map(({ key, label, hint, value }, index) => (
            <div
              key={key}
              // An odd last fact fills the rest of its line while the facts stand two to a line
              className={cn(
                "flex min-w-0 flex-col gap-1.5 border-t border-l px-4 py-3.5 sm:px-5",
                index === facts.length - 1 && facts.length % 2 === 1 && (facts.length === 5 ? "col-span-2 @3xl:col-span-1" : "col-span-2 @2xl:col-span-1"),
              )}
            >
              <dt className="flex items-center gap-1 text-sm text-muted-foreground">
                {label}
                <InfoTip label={common("about")}>{hint}</InfoTip>
              </dt>
              <dd className="flex min-h-7 min-w-0 items-center text-[0.9375rem]">
                <span className="min-w-0 truncate">{value}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
