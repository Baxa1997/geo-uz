import { ArrowRight, Lightbulb } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { formatPercent } from "@/shared/helpers/numbers";
import type { Source } from "@/shared/types/api";

/**
 * What a cited site means for the client, in a sentence under its facts: a site it could be on and isn't
 * (with who is there, and a link to the fix that says how to get listed), a site it is on (in how many of
 * the answers citing it the client is named), its own site (cited without being named?), a competitor's
 * site (not a place to get listed: a page to answer with one's own), or a site ChatGPT stopped citing.
 */
export function SourceVerdict({
  domain,
  source,
  share,
  named,
  rivals,
  owner,
  collectedAt,
  lastCited,
  actionHref,
}: {
  domain: string;
  /** The site in the latest check; undefined when that check didn't cite it. */
  source: Source | undefined;
  /** Share of answers citing it, 0–1. */
  share: number;
  /** Of the answers citing it, how many name the client. */
  named: number;
  /** Tracked competitors named on its pages. */
  rivals: string[];
  /** The competitor whose site it is. */
  owner: string | null;
  collectedAt: string;
  /** The latest check that cited it, when the latest one didn't. */
  lastCited: string | null;
  /** The recommended fix "get listed on this site", when there is one. */
  actionHref?: string;
}) {
  const t = useTranslations("SourcePage.verdict");
  const common = useTranslations("Common");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const date = (iso: string) => formatLongDate(iso, locale, timeZone);
  const citing = source?.count ?? 0;

  let main: string;
  let more: string | null = null;
  if (!source) {
    main = t("lost", { date: date(collectedAt), last: date(lastCited ?? collectedAt) });
  } else if (source.type === "own") {
    main = t("own", { citing });
    more = citing > named ? t("ownUnnamed", { unnamed: citing - named }) : t("ownNamed");
  } else if (source.type === "competitor") {
    main = t("competitor", { name: owner ?? domain, citing });
  } else if (source.brandListed) {
    main = t("listed", { domain, citing, named });
  } else {
    main = t("missing", { domain, share: formatPercent(share, locale) });
    more = rivals.length > 0 ? t("rivals", { rivals: rivals.join(", ") }) : null;
  }

  return (
    <section aria-label={common("takeaway")} className="flex flex-wrap items-start gap-x-4 gap-y-2 rounded-xl bg-muted px-4 py-3.5">
      <div className="flex min-w-0 flex-1 basis-72 items-start gap-3">
        <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="min-w-0 text-sm text-pretty">
          <span className="font-medium">{main}</span>
          {more && <span className="text-muted-foreground"> {more}</span>}
        </p>
      </div>
      {actionHref && (
        <Link
          href={actionHref}
          className="ml-7 inline-flex shrink-0 items-center gap-1 rounded-md text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 sm:ml-0"
        >
          {t("action")}
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      )}
    </section>
  );
}
