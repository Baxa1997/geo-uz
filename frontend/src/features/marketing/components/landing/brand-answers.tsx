import { CheckCircleIcon as CheckCircle } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { MinusCircleIcon as MinusCircle } from "@phosphor-icons/react/dist/ssr/MinusCircle";
import { WarningCircleIcon as WarningCircle } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { useTranslations } from "next-intl";
import { DEMO_BRAND_VIEW, DEMO_REPORT } from "@/mocks/demo";
import { BrandViewCard } from "@/shared/components/brand-view";
import { cn } from "@/shared/helpers/utils";
import { SECTION } from "../../constants";
import { Panel, ProductFrame, Section, SectionHead } from "./section";

/** The three marks a statement gets against the website, in the card's order, each with what to do about it. */
const MARKS = [
  { key: "confirmed", icon: CheckCircle, color: "text-positive" },
  { key: "contradicted", icon: WarningCircle, color: "text-negative" },
  { key: "unverified", icon: MinusCircle, color: "text-muted-foreground" },
] as const;

/**
 * What the assistants say when asked about the business by name: the app's own card with the sample
 * clinic's answers, each statement marked against its website, and beside it what each mark means.
 */
export function BrandAnswers() {
  const t = useTranslations("Landing.brand");

  return (
    <Section id={SECTION.brand} labelledBy="brand-title">
      <SectionHead id="brand-title" kicker={t("kicker")} title={t("title")} text={t("text")} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-6">
        <ProductFrame title={t("frame.title")} text={t("frame.text")}>
          <BrandViewCard views={DEMO_BRAND_VIEW} brand={DEMO_REPORT.project.brand.name} text={t("cardText")} className="shadow-xs" />
        </ProductFrame>
        <ul data-reveal className="flex flex-col gap-3">
          {MARKS.map(({ key, icon: Icon, color }) => (
            <li key={key}>
              <Panel className="flex gap-4 p-5">
                <Icon aria-hidden weight="fill" className={cn("mt-0.5 size-5 shrink-0", color)} />
                <span className="flex flex-col gap-1">
                  <span className="font-semibold">{t(`marks.${key}.title`)}</span>
                  <span className="text-sm text-pretty text-muted-foreground">{t(`marks.${key}.text`)}</span>
                </span>
              </Panel>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
