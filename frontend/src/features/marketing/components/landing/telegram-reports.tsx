import { ArrowRight, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { DEMO_REPORT } from "@/mocks/demo";
import { Link } from "@/i18n/navigation";
import { outOf100, scoreOf, topCompetitor } from "@/shared/helpers/scores";
import { SECTION } from "../../constants";
import { Section } from "./section";

/** The weekly report as it arrives in Telegram, with the sample clinic's numbers. */
export function TelegramReports() {
  const t = useTranslations("Landing.telegram");
  const { brand, competitors } = DEMO_REPORT.project;
  const you = scoreOf(DEMO_REPORT.scores, brand.id);
  const rival = topCompetitor(competitors, DEMO_REPORT.scores);

  return (
    <Section id={SECTION.telegram} labelledBy="telegram-title" className="items-center lg:grid lg:grid-cols-2 lg:gap-16">
      <div data-reveal className="flex flex-col items-start gap-4">
        <h2 id="telegram-title" className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl/[1.1]">
          {t("title")}
        </h2>
        <p className="max-w-md text-lg text-pretty text-muted-foreground">{t("text")}</p>
        <Link
          href={{ pathname: "/", hash: SECTION.demo }}
          className="mt-2 inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-muted/50"
        >
          <span aria-hidden className="size-2 rounded-full bg-brand" />
          {t("cta")}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>

      <div data-reveal aria-hidden className="rounded-2xl border bg-muted/40 p-4 select-none sm:p-10">
        <div className="mx-auto flex max-w-sm flex-col gap-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-8 items-center justify-center rounded-full bg-telegram text-white">
              <Send className="size-4" />
            </span>
            {t("bot")}
          </p>
          <div className="flex flex-col gap-3 rounded-2xl rounded-tl-md border bg-background p-4 text-sm shadow-lg shadow-black/5">
            <p className="font-semibold">{t("heading", { brand: brand.name })}</p>
            {you && (
              <dl className="flex flex-col gap-1.5">
                <Row label={t("score")} value={`${outOf100(you.visibility)}/100`} extra={you.trend > 0 ? t("change", { points: Math.round(you.trend * 100) }) : undefined} />
                {rival && <Row label={rival.brand.name} value={`${outOf100(rival.score.visibility)}/100`} />}
                <Row label={t("facts")} value={String(DEMO_REPORT.wrongFacts.length)} />
              </dl>
            )}
            <p className="rounded-lg bg-telegram/10 px-3 py-2 text-center font-medium text-telegram">{t("open")}</p>
          </div>
          <p className="self-end text-xs text-muted-foreground">{t("time")}</p>
        </div>
      </div>
    </Section>
  );
}

function Row({ label, value, extra }: { label: string; value: string; extra?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">
        {value} {extra && <span className="font-normal text-positive">{extra}</span>}
      </dd>
    </div>
  );
}
