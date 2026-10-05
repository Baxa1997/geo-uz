import { useTranslations } from "next-intl";
import { ArrowLink } from "@/shared/components/arrow-link";
import { NamedBrandChips } from "@/shared/components/scores/named-brand-chips";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link } from "@/i18n/navigation";
import { namedBrands, promptsWithoutYou } from "@/shared/helpers/scores";
import type { Report } from "@/shared/types/api";

const SHOWN = 4;

/** Questions where ChatGPT names competitors and not the client: the first things to work on. Each opens its answers. */
export function MissingCard({
  report,
  answersHref,
}: {
  report: Report;
  /** The Answers page, or one question's answers there. */
  answersHref: (promptId?: string) => string;
}) {
  const t = useTranslations("Overview");
  const sidebar = useTranslations("Sidebar");
  const { brand, competitors } = report.project;
  const brands = [brand, ...competitors];
  const missing = promptsWithoutYou(
    report.prompts,
    brand.id,
    competitors.map((competitor) => competitor.id),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("missingTitle")}</CardTitle>
        <CardDescription>
          {missing.length > 0
            ? t("missingDescription", { count: missing.length, total: report.prompts.length })
            : t("missingNone")}
        </CardDescription>
        <CardAction>
          <ArrowLink href={answersHref()}>{sidebar("answers")}</ArrowLink>
        </CardAction>
      </CardHeader>
      {missing.length > 0 && (
        <CardContent>
          <ul className="flex flex-col divide-y">
            {missing.slice(0, SHOWN).map((result) => (
              <li key={result.prompt.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                <Link
                  href={answersHref(result.prompt.id)}
                  className="line-clamp-2 text-sm text-pretty underline-offset-4 hover:underline"
                >
                  <span className="mr-1.5 align-[1px] text-[0.65rem] font-semibold text-muted-foreground uppercase">
                    {result.prompt.language}
                  </span>
                  {result.prompt.text}
                </Link>
                <NamedBrandChips named={namedBrands(result, brands, brand.id)} youId={brand.id} />
              </li>
            ))}
          </ul>
          {missing.length > SHOWN && (
            <p className="mt-3 text-xs text-muted-foreground">{t("missingMore", { count: missing.length - SHOWN })}</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
