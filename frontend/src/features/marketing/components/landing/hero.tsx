import { ArrowRight, Eye, ListOrdered, Smile, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";
import { SECTION } from "../../constants";
import { SiteForm } from "../site-form";
import { DashboardPreview } from "./dashboard-preview";
import { MonoLabel } from "./mono-label";

const EXAMPLES = ["e1", "e2", "e3", "e4"] as const;

/**
 * Centered headline with the three metrics as chips and two buttons, then the product itself:
 * the dashboard preview, with the free check's website field floating over its lower edge.
 * The parts arrive one after another, the preview's chart plays by itself and the field types
 * example addresses. The headline is never animated: it is what the page paints first.
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
      {/* Dotted texture and two slow glows behind the headline. They start below the navbar: its gray links need a plain background to stay readable */}
      <div aria-hidden className="absolute inset-x-0 top-20 -z-10 h-[34rem] overflow-hidden mask-t-from-80% mask-t-to-100% mask-b-from-40% mask-b-to-100%">
        <div className="absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[1.25rem_1.25rem]" />
        <div className="absolute top-[-6rem] left-1/2 size-[34rem] -translate-x-[85%] rounded-full bg-brand/15 blur-3xl motion-safe:animate-drift" />
        <div className="absolute top-[-2rem] left-1/2 size-[28rem] translate-x-[5%] rounded-full bg-you/15 blur-3xl motion-safe:animate-drift [animation-delay:-7s] [animation-direction:alternate-reverse]" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 border-x px-4 pt-12 pb-12 text-center sm:px-8 sm:pt-20">
        <Link
          href={{ pathname: "/", hash: SECTION.local }}
          className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm font-medium shadow-xs transition-colors hover:bg-muted/50 motion-safe:animate-rise"
        >
          <span aria-hidden className="relative flex size-2">
            <span className="absolute inset-0 rounded-full bg-brand opacity-60 motion-safe:animate-ping" />
            <span className="relative size-2 rounded-full bg-brand" />
          </span>
          {t("pill")}
        </Link>
        <h1 id="hero-title" className="text-4xl/[1.05] font-semibold tracking-tight text-balance sm:text-6xl/[1.05] lg:text-7xl/[1.05]">
          {t("title")} <span className="block text-muted-foreground">{t("titleMuted")}</span>
        </h1>
        <p className="max-w-2xl text-lg/8 text-pretty text-muted-foreground motion-safe:animate-rise [animation-delay:80ms]">
          {t.rich("subtitle", { visibility: chip(Eye), position: chip(ListOrdered), tone: chip(Smile) })}
        </p>
        <div className="mt-2 flex w-full flex-col gap-3 motion-safe:animate-rise [animation-delay:160ms] sm:w-auto sm:flex-row">
          <Link
            href={{ pathname: "/", hash: SECTION.demo }}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 bg-background px-5 text-base shadow-xs")}
          >
            {t("demo")}
          </Link>
          <Link
            href={{ pathname: "/", hash: SECTION.check }}
            className={cn(buttonVariants({ variant: "brand", size: "lg" }), "h-12 px-5 text-base")}
          >
            {t("start")}
            <ArrowRight aria-hidden data-icon="inline-end" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl border-x px-4 pb-16 motion-safe:animate-rise [animation-delay:260ms] sm:px-8 sm:pb-24">
        {/* The preview fades out towards the bottom, where the free check's field sits on top of it */}
        <div className="max-h-[33rem] overflow-hidden mask-b-from-75% mask-b-to-100% sm:max-h-[44rem] sm:mask-b-from-55%">
          <DashboardPreview />
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
