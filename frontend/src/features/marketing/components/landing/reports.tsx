import { ChartScatter } from "lucide-react";
import { useTranslations } from "next-intl";
import { DEMO_REPORT } from "@/mocks/demo";
import { outOf100, rankedBrands } from "@/shared/helpers/scores";
import { REPORT_CHANNELS, SECTION } from "../../constants";
import { positiveShare } from "../../helpers/demo";
import { Panel, Section, SectionIntro } from "./section";

const SIZE = { width: 560, height: 420 };
const PAD = { top: 16, right: 20, bottom: 44, left: 52 };
const TICKS = [0, 25, 50, 75, 100];

/** Reports: every brand placed by score and tone (the sample clinic's data), and the three ways a report reaches people. */
export function Reports() {
  const t = useTranslations("Landing.reports");
  const brands = rankedBrands(DEMO_REPORT).flatMap(({ brand, score, isYou }) => {
    const tone = positiveShare(DEMO_REPORT, brand.id);
    return tone === null ? [] : [{ brand, isYou, score: outOf100(score.visibility), tone: Math.round(tone * 100) }];
  });
  const x = (value: number) => PAD.left + (value / 100) * (SIZE.width - PAD.left - PAD.right);
  const y = (value: number) => PAD.top + (1 - value / 100) * (SIZE.height - PAD.top - PAD.bottom);

  return (
    <Section id={SECTION.reports} labelledBy="reports-title">
      <SectionIntro id="reports-title" icon={ChartScatter} pill={t("pill")} title={t("title")} sub={t("sub")} />
      <div data-reveal className="grid gap-3 rounded-2xl border bg-muted/40 p-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <figure className="flex flex-col gap-2 p-2 sm:p-4">
          <svg viewBox={`0 0 ${SIZE.width} ${SIZE.height}`} role="img" aria-labelledby="quadrant-title" className="w-full">
            <title id="quadrant-title">{t("chartLabel")}</title>
            {TICKS.map((tick) => (
              <g key={tick} fontSize="11" fill="var(--color-muted-foreground)">
                <line x1={x(tick)} x2={x(tick)} y1={PAD.top} y2={SIZE.height - PAD.bottom} stroke="var(--color-border)" strokeDasharray={tick === 50 ? undefined : "3 4"} />
                <line x1={PAD.left} x2={SIZE.width - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--color-border)" strokeDasharray={tick === 50 ? undefined : "3 4"} />
                <text x={x(tick)} y={SIZE.height - PAD.bottom + 16} textAnchor="middle">
                  {tick}
                </text>
                <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">
                  {tick}%
                </text>
              </g>
            ))}
            <g fontSize="11" fontWeight="500" fill="var(--color-muted-foreground)" textAnchor="middle">
              <text x={x(25)} y={y(100) + 14}>{t("quadrants.niche")}</text>
              <text x={x(75)} y={y(100) + 14}>{t("quadrants.leaders")}</text>
              <text x={x(25)} y={y(0) - 8}>{t("quadrants.behind")}</text>
              <text x={x(75)} y={y(0) - 8}>{t("quadrants.mixed")}</text>
            </g>
            <text x={x(50)} y={SIZE.height - 6} textAnchor="middle" fontSize="12" fill="var(--color-foreground)">
              {t("xAxis")}
            </text>
            <text transform={`translate(14 ${y(50)}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="var(--color-foreground)">
              {t("yAxis")}
            </text>
            {brands.map(({ brand, isYou, score, tone }) => (
              <g key={brand.id}>
                <circle
                  cx={x(score)}
                  cy={y(tone)}
                  r="9"
                  fill={isYou ? "var(--color-you)" : "var(--color-rival-strong)"}
                  stroke="var(--color-background)"
                  strokeWidth="2"
                />
                <text x={x(score) + 14} y={y(tone) + 4} fontSize="12" fontWeight={isYou ? 600 : 400} fill="var(--color-foreground)">
                  {brand.name}
                </text>
              </g>
            ))}
          </svg>
          <figcaption className="text-center text-xs text-muted-foreground">{t("sample")}</figcaption>
        </figure>

        <Panel className="flex flex-col justify-center gap-8 p-6 sm:p-10">
          {REPORT_CHANNELS.map(({ key, icon: Icon }) => (
            <div key={key} className="flex flex-col gap-2 border-l-2 pl-5">
              <h3 className="flex items-center gap-2 font-semibold">
                <Icon aria-hidden className="size-4 text-muted-foreground" />
                {t(`items.${key}.title`)}
              </h3>
              <p className="text-pretty text-muted-foreground">{t(`items.${key}.text`)}</p>
            </div>
          ))}
        </Panel>
      </div>
    </Section>
  );
}
