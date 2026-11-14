import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/helpers/utils";
import { SECTION } from "../../constants";
import { SiteForm } from "../site-form";
import { DashboardPreview } from "./dashboard-preview";
import { MonoLabel } from "./mono-label";
import { SectionLink } from "../section-link";

const EXAMPLES = ["e1", "e2", "e3", "e4"] as const;

/**
 * Centered headline, a sentence that says in plain words what we measure, and two buttons, then the product itself:
 * the dashboard preview, with the free check's website field floating over its lower edge.
 * The parts arrive one after another, the preview's chart plays by itself and the field types
 * example addresses. The headline is never animated: it is what the page paints first.
 *
 * Plain paper, a label in small capitals, a heavy sans headline whose last words are set in a serif
 * italic. Nothing here sits under a blur filter or a mask, and nothing moves
 * forever: the preview fades into the page under a painted gradient. A filter or a mask over moving
 * content is redone by the graphics card on every frame, and an endless animation keeps the whole page
 * redrawing.
 */
export function Hero() {
  const t = useTranslations("Landing.hero");
  const examples = useTranslations("Landing.siteExamples");

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 pt-12 pb-12 text-center sm:px-8 sm:pt-24">
        <SectionLink
          hash={SECTION.local}
          className="inline-flex items-center gap-3 font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:text-foreground motion-safe:animate-rise"
        >
          <span aria-hidden className="hidden h-px w-8 bg-brand/40 sm:block" />
          {t("pill")}
          <span aria-hidden className="hidden h-px w-8 bg-brand/40 sm:block" />
        </SectionLink>
        <h1 id="hero-title" className="text-4xl/[1.05] font-bold tracking-[-0.04em] text-balance sm:text-6xl/[1.05] lg:text-[5.25rem]/[1.02]">
          {t("title")}{" "}
          {/* The accent: the line's last words in the serif italic, lighter than the sans around them */}
          <span className="block font-display font-normal tracking-[-0.02em] text-brand italic">{t("titleMuted")}</span>
        </h1>
        <p className="max-w-3xl text-lg/8 text-pretty text-muted-foreground sm:text-xl/9 motion-safe:animate-rise [animation-delay:80ms]">
          {t("subtitle")}
        </p>
        <div className="mt-2 flex w-full flex-col gap-3 motion-safe:animate-rise [animation-delay:160ms] sm:w-auto sm:flex-row">
          <SectionLink
            hash={SECTION.demo}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-13 bg-background px-6 text-base font-semibold")}
          >
            {t("demo")}
          </SectionLink>
          <SectionLink
            hash={SECTION.check}
            className={cn(buttonVariants({ variant: "brand", size: "lg" }), "h-13 px-6 text-base font-semibold")}
          >
            {t("start")}
            <ArrowRight aria-hidden data-icon="inline-end" />
          </SectionLink>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 motion-safe:animate-rise [animation-delay:260ms] sm:px-8 sm:pb-24">
        {/* The preview fades into the page towards the bottom, where the free check's field sits on top of it */}
        <div className="relative max-h-[33rem] overflow-hidden sm:max-h-[44rem]">
          <DashboardPreview />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-linear-to-t from-(--page) to-transparent sm:h-[45%]" />
        </div>
        <div
          id={SECTION.check}
          className="relative mx-auto -mt-16 flex max-w-xl scroll-mt-28 flex-col gap-3 rounded-2xl border bg-background p-4 shadow-xl shadow-brand/15 sm:-mt-44 sm:p-5"
        >
          <p className="font-medium">{t("checkTitle")}</p>
          <SiteForm examples={EXAMPLES.map((key) => examples(key))} />
          <MonoLabel className="text-muted-foreground">{t("micro")}</MonoLabel>
        </div>
      </div>
    </section>
  );
}
