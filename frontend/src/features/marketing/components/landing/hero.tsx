import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { SparkleIcon as Sparkle } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { IconMentions, IconPlace, IconSources } from "@/shared/components/own-icons";
import type { AppIcon } from "@/shared/types/icon";
import { SECTION } from "../../constants";
import { SectionLink } from "../section-link";
import { SiteForm } from "../site-form";
import { DashboardPreview } from "./dashboard-preview";

const EXAMPLES = ["e1", "e2", "e3", "e4"] as const;

/** A metric named in the sentence, as a small card in the line: its own icon and its name (the user, 18 Nov). */
function metricChip(Icon: AppIcon) {
  function MetricChip(chunks: ReactNode) {
    return (
      <span className="mx-0.5 inline-flex items-center gap-1.5 rounded-lg border bg-background px-2 py-0.5 align-middle text-base/6 font-medium whitespace-nowrap text-foreground shadow-xs sm:text-lg/7">
        <Icon aria-hidden className="size-4 sm:size-4.5" />
        {chunks}
      </span>
    );
  }
  return MetricChip;
}

/**
 * What the product is, and the one thing to do: the indicator (what is new, live: it opens the assistants'
 * section), the headline, one short sentence with the metrics as chips in the line, and the website field
 * itself, which starts the free check (login by email first). Under it the product: the dashboard preview
 * with the sample clinic's report, labelled as sample data. The headline is never animated: it is what the
 * page paints first. Nothing here sits under a blur or a mask, and nothing moves forever: the live dot rings
 * four times and rests.
 */
export function Hero() {
  const t = useTranslations("Landing.hero");
  const examples = useTranslations("Landing.siteExamples");

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 pt-12 pb-10 text-center sm:px-8 sm:pt-20">
        {/* The indicator: what is new, as a claim the product makes true today (Google's AI answers are "soon") */}
        <SectionLink
          hash={SECTION.engines}
          className="group inline-flex max-w-full items-center gap-2.5 rounded-full border bg-background py-1 pr-3.5 pl-1 text-sm text-foreground shadow-xs transition-colors hover:border-foreground/25 motion-safe:animate-rise"
        >
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-2.5 py-1 text-xs font-semibold text-background">
            <span aria-hidden className="relative flex size-2">
              <span className="absolute inset-0 rounded-full bg-positive opacity-60 motion-safe:animate-ring" />
              <span className="relative size-2 rounded-full bg-positive" />
            </span>
            {t("badge")}
          </span>
          <Sparkle weight="fill" aria-hidden className="size-3.5 shrink-0 text-brand" />
          <span className="truncate">{t("news")}</span>
          <ArrowRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </SectionLink>
        <h1 id="hero-title" className="text-[2rem]/[1.08] font-bold tracking-[-0.04em] text-balance sm:text-5xl/[1.05] lg:text-[4rem]/[1.04]">
          {t("title")}{" "}
          {/* The accent: the line's last words in the serif italic, lighter than the sans around them */}
          <span className="block font-display font-normal tracking-[-0.02em] text-brand italic">{t("titleMuted")}</span>
        </h1>
        <p className="max-w-3xl text-lg/9 text-pretty text-muted-foreground sm:text-xl/10 motion-safe:animate-rise [animation-delay:80ms]">
          {t.rich("subtitle", {
            visibility: metricChip(IconMentions),
            position: metricChip(IconPlace),
            sources: metricChip(IconSources),
          })}
        </p>
        <div
          id={SECTION.check}
          className="mt-2 flex w-full max-w-2xl scroll-mt-28 flex-col gap-2 rounded-2xl border bg-background p-3 text-left shadow-xl shadow-brand/10 motion-safe:animate-rise [animation-delay:160ms] sm:p-4"
        >
          <SiteForm examples={EXAMPLES.map((key) => examples(key))} />
        </div>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground motion-safe:animate-rise [animation-delay:200ms]">
          <span>{t("micro")}</span>
          <span aria-hidden>·</span>
          <SectionLink hash={SECTION.demo} className="font-medium text-foreground underline-offset-4 hover:underline">
            {t("demo")}
          </SectionLink>
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 motion-safe:animate-rise [animation-delay:260ms] sm:px-8 sm:pb-24">
        {/* The preview fades into the page towards its foot */}
        <div className="relative max-h-[30rem] overflow-hidden sm:max-h-[42rem]">
          <DashboardPreview />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-linear-to-t from-(--page) to-transparent sm:h-1/3" />
        </div>
      </div>
    </section>
  );
}
