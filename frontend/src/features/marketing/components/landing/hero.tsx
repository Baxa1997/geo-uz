import { useTranslations } from "next-intl";
import { SECTION } from "../../constants";
import { SectionLink } from "../section-link";
import { SiteForm } from "../site-form";
import { DashboardPreview } from "./dashboard-preview";

const EXAMPLES = ["e1", "e2", "e3", "e4"] as const;

/**
 * What the product is, and the one thing to do: a label (the assistants asked, the free first check), the
 * headline, a sentence that says in plain words what a visitor gets, and the website field itself, which
 * starts the free check (login by email first). Under it the product: the dashboard preview with the
 * sample clinic's report, labelled as sample data. The headline is never animated: it is what the page
 * paints first. Nothing here sits under a blur or a mask, and nothing moves forever.
 */
export function Hero() {
  const t = useTranslations("Landing.hero");
  const examples = useTranslations("Landing.siteExamples");

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 pt-12 pb-10 text-center sm:px-8 sm:pt-20">
        <SectionLink
          hash={SECTION.engines}
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
