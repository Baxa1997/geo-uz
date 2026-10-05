import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";
import { SECTION } from "../../constants";
import { MonoLabel } from "./mono-label";

/** Dark band: the page's last word before the dark footer. */
export function FinalCta() {
  const t = useTranslations("Landing.cta");

  return (
    <section aria-labelledby="cta-title" className="border-t">
      <div className="mx-auto max-w-7xl border-x p-2">
        <div
          data-reveal
          className="relative isolate flex flex-col items-center gap-5 overflow-hidden rounded-2xl bg-foreground px-6 py-16 text-center text-background sm:px-12 sm:py-24"
        >
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.12)_1px,transparent_0)] bg-size-[18px_18px]"
          />
          <MonoLabel className="flex items-center gap-2 text-background/85">
            <span aria-hidden className="size-1.5 rounded-full bg-background" />
            {t("eyebrow")}
          </MonoLabel>
          <h2 id="cta-title" className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl/[1.1]">
            {t("title")}
          </h2>
          <p className="max-w-xl text-lg text-pretty text-background/75">{t("text")}</p>
          <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href={{ pathname: "/", hash: SECTION.check }}
              className={cn(buttonVariants({ variant: "brand", size: "lg" }), "h-12 px-5 text-base")}
            >
              {t("button")}
              <ArrowRight aria-hidden data-icon="inline-end" />
            </Link>
            <Link
              href={{ pathname: "/", hash: SECTION.demo }}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 border-background/30 bg-transparent px-5 text-base text-background hover:bg-background/10 hover:text-background",
              )}
            >
              {t("demo")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
