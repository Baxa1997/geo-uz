import { ArrowRight, Eye, ListOrdered, Smile, type LucideIcon } from "lucide-react";
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
 * Centered headline with the three metrics as chips and two buttons, then the product itself:
 * the dashboard preview, with the free check's website field floating over its lower edge.
 * The parts arrive one after another, the preview's chart plays by itself and the field types
 * example addresses. The headline is never animated: it is what the page paints first.
 *
 * Nothing here sits under a blur filter, and nothing moves forever: the glows are soft because they
 * are gradients and they stand still, the preview fades into the page under a painted gradient, and
 * the live dot rings a few times and rests. A filter or a mask over moving content is redone by the
 * graphics card on every frame, and an endless animation keeps the whole page redrawing.
 */
export function Hero() {
  const t = useTranslations("Landing.hero");
  const examples = useTranslations("Landing.siteExamples");
  const chip = (Icon: LucideIcon) =>
    function MetricChip(chunks: React.ReactNode) {
      return (
        <span className="mx-0.5 inline-flex items-center gap-1.5 rounded-lg border bg-background px-2 py-0.5 align-baseline text-base font-medium whitespace-nowrap text-foreground shadow-xs">
          <Icon aria-hidden className="size-4 text-muted-foreground" />
          {chunks}
        </span>
      );
    };

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* Dotted texture and two glows behind the headline. They start below the navbar: its gray links need a plain background to stay readable */}
      <div aria-hidden className="absolute inset-x-0 top-20 -z-10 h-[34rem] overflow-hidden">
        {/* The texture stands still, so its fading mask is worked out once */}
        <div className="absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[1.25rem_1.25rem] mask-t-from-80% mask-t-to-100% mask-b-from-40% mask-b-to-100%" />
        {/* Each glow is a wide ellipse of gradient that reaches nothing at its own edge, inside the box: no blur, no mask, nothing cut off */}
        <div className="absolute top-0 left-1/2 h-[25rem] w-[40rem] -translate-x-[80%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_15%,transparent)_25%,transparent)]" />
        <div className="absolute top-2 left-1/2 h-[23rem] w-[34rem] -translate-x-[5%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--you)_15%,transparent)_25%,transparent)]" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 border-x px-4 pt-12 pb-12 text-center sm:px-8 sm:pt-20">
        <SectionLink
          hash={SECTION.local}
          className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm font-medium shadow-xs transition-colors hover:bg-muted/50 motion-safe:animate-rise"
        >
          <span aria-hidden className="relative flex size-2">
            <span className="absolute inset-0 rounded-full bg-brand opacity-60 motion-safe:animate-ring" />
            <span className="relative size-2 rounded-full bg-brand" />
          </span>
          {t("pill")}
        </SectionLink>
        <h1 id="hero-title" className="text-4xl/[1.05] font-semibold tracking-tight text-balance sm:text-6xl/[1.05] lg:text-7xl/[1.05]">
          {t("title")} <span className="block text-muted-foreground">{t("titleMuted")}</span>
        </h1>
        <p className="max-w-2xl text-lg/8 text-pretty text-muted-foreground motion-safe:animate-rise [animation-delay:80ms]">
          {t.rich("subtitle", { visibility: chip(Eye), position: chip(ListOrdered), tone: chip(Smile) })}
        </p>
        <div className="mt-2 flex w-full flex-col gap-3 motion-safe:animate-rise [animation-delay:160ms] sm:w-auto sm:flex-row">
          <SectionLink
            hash={SECTION.demo}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 bg-background px-5 text-base shadow-xs")}
          >
            {t("demo")}
          </SectionLink>
          <SectionLink
            hash={SECTION.check}
            className={cn(buttonVariants({ variant: "brand", size: "lg" }), "h-12 px-5 text-base")}
          >
            {t("start")}
            <ArrowRight aria-hidden data-icon="inline-end" />
          </SectionLink>
        </div>
      </div>

      <div className="mx-auto max-w-7xl border-x px-4 pb-16 motion-safe:animate-rise [animation-delay:260ms] sm:px-8 sm:pb-24">
        {/* The preview fades into the page towards the bottom, where the free check's field sits on top of it */}
        <div className="relative max-h-[33rem] overflow-hidden sm:max-h-[44rem]">
          <DashboardPreview />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-linear-to-t from-(--page) to-transparent sm:h-[45%]" />
        </div>
        <div
          id={SECTION.check}
          className="relative mx-auto -mt-16 flex max-w-xl scroll-mt-28 flex-col gap-3 rounded-3xl border bg-background p-4 shadow-2xl shadow-black/10 sm:-mt-44 sm:p-5"
        >
          <p className="font-medium">{t("checkTitle")}</p>
          <SiteForm examples={EXAMPLES.map((key) => examples(key))} />
          <MonoLabel className="text-muted-foreground">{t("micro")}</MonoLabel>
        </div>
      </div>
    </section>
  );
}
