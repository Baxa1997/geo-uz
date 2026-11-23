import { UsersThreeIcon as Users } from "@phosphor-icons/react/dist/ssr/UsersThree";
import { useTranslations } from "next-intl";
import { ArrowLink } from "@/shared/components/arrow-link";
import { answersNaming } from "@/shared/helpers/scores";
import type { Report } from "@/shared/types/api";

/** How many of the businesses AI names most the strip lists. */
const SHOWN = 3;

/**
 * Strip above the Overview when AI names businesses that aren't tracked more often than any competitor that is (the
 * user, 23 Nov 2026: the competitors confirmed at the first check were named once in ten answers, while the answers
 * named 27 others). It names the three named most, each with its count of answers, and opens the competitors page's
 * suggestions, where each can be tracked.
 */
export function RivalsNotice({ report, href }: { report: Report; href: string }) {
  const t = useTranslations("Overview");
  const tracked = Math.max(0, ...report.project.competitors.map((brand) => report.prompts.reduce((sum, result) => sum + answersNaming(result, brand.id), 0)));
  const ahead = report.untrackedBrands.filter((brand) => !brand.dismissed && brand.answers > tracked).slice(0, SHOWN);
  if (ahead.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-progress/40 bg-progress/10 px-4 py-3">
      <p className="flex min-w-0 flex-1 items-start gap-2.5 text-sm font-medium text-pretty">
        <Users aria-hidden className="mt-0.5 size-4 shrink-0 text-progress" />
        {t("rivalsNotice", { names: ahead.map((brand) => t("rivalsName", { name: brand.name, count: brand.answers })).join(", ") })}
      </p>
      <ArrowLink href={href}>{t("rivalsAction")}</ArrowLink>
    </div>
  );
}
