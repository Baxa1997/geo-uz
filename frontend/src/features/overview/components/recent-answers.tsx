import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { ArrowLink } from "@/shared/components/arrow-link";
import { EngineIcon } from "@/shared/components/engine-icon";
import { LinkRow } from "@/shared/components/link-row";
import { Panel } from "@/shared/components/panel";
import { Link } from "@/i18n/navigation";
import { engineOf, TIME_ZONE } from "@/shared/constants";
import { answerExcerpt } from "@/shared/helpers/answer-excerpt";
import { formatShortDate } from "@/shared/helpers/dates";
import type { Report } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";

const SHOWN = 6;
const SOURCES_SHOWN = 3;

/**
 * The latest answers, one row each: the question and how the answer opens, the tracked brands it
 * names, the sites it cites, where it put the client, and the date. Each opens on the Answers page.
 */
export function RecentAnswers({
  report,
  brands,
  answersHref,
}: {
  report: Report;
  brands: SeriesBrand[];
  answersHref: (promptId?: string) => string;
}) {
  const t = useTranslations("Overview.recent");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const youId = report.project.brand.id;
  const byId = new Map(brands.map((brand) => [brand.id, brand]));
  // One answer per question, so the list spans the questions
  const rows = report.prompts.flatMap((result) => (result.answers[0] ? [{ result, answer: result.answers[0] }] : [])).slice(0, SHOWN);
  const date = formatShortDate(report.method.collectedAt, locale, timeZone);

  return (
    <Panel title={t("title")} hint={t("hint")} actions={<ArrowLink href={answersHref()}>{t("all")}</ArrowLink>}>
      <div className="@container">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground [&>th]:py-2.5 [&>th]:font-medium">
              <th scope="col" className="px-4">
                {t("answer")}
              </th>
              <th scope="col" className="hidden w-36 px-3 @2xl:table-cell">
                {t("brands")}
              </th>
              <th scope="col" className="hidden w-28 px-3 @xl:table-cell">
                {t("sources")}
              </th>
              <th scope="col" className="w-20 px-3 @md:w-24">
                {t("position")}
              </th>
              <th scope="col" className="hidden w-24 px-4 @lg:table-cell">
                {t("date")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(({ result, answer }) => {
              const own = answer.mentions.find((mention) => mention.brandId === youId);
              const named = answer.mentions.flatMap((mention) => byId.get(mention.brandId) ?? []);
              const domains = [...new Set(answer.citations.map((citation) => citation.domain))];
              return (
                <LinkRow key={result.prompt.id} href={answersHref(result.prompt.id)} className="align-top transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={answersHref(result.prompt.id)} className="flex min-w-0 items-start gap-2.5 outline-none focus-visible:underline">
                      <EngineIcon engine={engineOf(report.method.engine)} className="mt-0.5 text-muted-foreground" />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-medium text-pretty">{result.prompt.text}</span>
                        <span className="truncate text-muted-foreground">{answerExcerpt(answer.text)}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="hidden px-3 py-3 @2xl:table-cell">
                    {named.length ? (
                      <ul className="flex flex-wrap gap-1">
                        {named.map((brand) => (
                          <li
                            key={brand.id}
                            title={brand.name}
                            className="flex h-6 items-center gap-1 rounded-md bg-muted px-1.5 text-[0.7rem] font-semibold"
                          >
                            <span aria-hidden className="size-2 rounded-full" style={{ background: brand.color }} />
                            <span aria-hidden>{brand.name.charAt(0).toUpperCase()}</span>
                            <span className="sr-only">{brand.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="hidden px-3 py-3 @xl:table-cell">
                    {domains.length ? (
                      <span className="flex items-center gap-1" title={domains.join(", ")}>
                        {domains.slice(0, SOURCES_SHOWN).map((domain) => (
                          <span
                            key={domain}
                            aria-hidden
                            className="flex size-6 items-center justify-center rounded-full bg-muted text-[0.65rem] font-semibold text-muted-foreground uppercase ring-2 ring-card"
                          >
                            {domain.charAt(0)}
                          </span>
                        ))}
                        {domains.length > SOURCES_SHOWN && (
                          <span aria-hidden className="pl-0.5 text-xs text-muted-foreground">
                            +{domains.length - SOURCES_SHOWN}
                          </span>
                        )}
                        <span className="sr-only">{domains.join(", ")}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-medium tabular-nums">
                    {own ? (
                      <>
                        <span aria-hidden className="font-normal text-muted-foreground">
                          #
                        </span>
                        {own.position}
                      </>
                    ) : (
                      <span className="font-normal text-muted-foreground" title={t("notNamed")}>
                        <span aria-hidden>—</span>
                        <span className="sr-only">{t("notNamed")}</span>
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground @lg:table-cell">{date}</td>
                </LinkRow>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
