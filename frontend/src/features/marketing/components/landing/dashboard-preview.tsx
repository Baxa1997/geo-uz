import {
  CalendarDays,
  CircleAlert,
  FileText,
  Globe,
  LayoutDashboard,
  ListChecks,
  MessageCircleQuestion,
  MessagesSquare,
  Tag,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { DEMO_REPORT } from "@/mocks/demo";
import { EngineIcon } from "@/shared/components/engine-icon";
import { BrandTable } from "@/shared/components/scores/brand-table";
import { HeadlineKpis } from "@/shared/components/scores/headline-kpis";
import { SourceTypesChart } from "@/shared/components/scores/source-types-chart";
import { TopDomains } from "@/shared/components/scores/top-domains";
import { TrendPanel } from "@/shared/components/scores/trend-panel";
import { seriesBrands, totalAnswers } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";

/** The app's sidebar, sections included (features/workspace keeps the real one). */
const NAV = [
  { key: "overview", icon: LayoutDashboard },
  { key: "prompts", icon: MessageCircleQuestion, heading: "monitor" },
  { key: "answers", icon: MessagesSquare },
  { key: "competitors", icon: Users },
  { key: "sources", icon: Globe },
  { key: "wrongFacts", icon: CircleAlert, heading: "improve" },
  { key: "actions", icon: ListChecks },
  { key: "reports", icon: FileText, heading: "share" },
] as const;

/**
 * The hero's picture of the product: the app's Overview with the sample clinic's report, built
 * from the same components the app uses, and moving by itself (the chart reads out week after
 * week). It is an illustration, so it is one image to screen readers and nothing in it can be
 * clicked or focused.
 */
export function DashboardPreview() {
  const t = useTranslations("Landing.preview");
  const sidebar = useTranslations("Sidebar");
  const table = useTranslations("BrandTable");
  const overview = useTranslations("Overview");
  const report = DEMO_REPORT;
  const { brand } = report.project;
  const brands = seriesBrands(report.project);

  return (
    <div
      role="img"
      aria-label={t("label", { brand: brand.name })}
      className="overflow-hidden rounded-2xl border bg-background text-left shadow-2xl shadow-black/10"
    >
      <div aria-hidden inert className="grid select-none lg:grid-cols-[13.5rem_minmax(0,1fr)]">
        <div className="hidden flex-col gap-3 border-r bg-sidebar p-3 lg:flex">
          <div className="flex items-center gap-2.5 rounded-xl border bg-background p-2 shadow-xs">
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
              {brand.name.charAt(0)}
            </span>
            <span className="truncate text-sm font-semibold">{brand.name}</span>
          </div>
          <ul className="flex flex-col gap-0.5 text-sm">
            {NAV.map((item, index) => (
              <li key={item.key} className="flex flex-col gap-0.5">
                {"heading" in item && (
                  <span className="px-2.5 pt-2 pb-0.5 text-xs font-medium text-foreground/50">
                    {sidebar(`groups.${item.heading}`)}
                  </span>
                )}
                <span
                  className={cn(
                    "flex h-8 items-center gap-2.5 rounded-lg px-2.5",
                    index === 0 ? "bg-black/[0.06] font-medium" : "text-foreground/70",
                  )}
                >
                  <item.icon className="size-4" />
                  {sidebar(item.key)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="@container flex min-w-0 flex-col gap-3 bg-muted/40 p-3 sm:p-4">
          {/* On a phone the chart comes first: the filters would push it below the fold */}
          <ul className="hidden flex-wrap gap-2 text-sm font-medium sm:flex">
            <Chip className="bg-background shadow-xs">
              <span className="flex size-4 items-center justify-center rounded bg-you text-[0.6rem] text-white">
                {brand.name.charAt(0)}
              </span>
              {brand.name}
            </Chip>
            <Chip>
              <CalendarDays className="size-3.5" />
              {t("range", { weeks: report.history.length })}
            </Chip>
            <Chip>
              <Tag className="size-3.5" />
              {t("allTopics")}
            </Chip>
            <Chip>
              <EngineIcon engine="chatgpt" className="size-3.5" />
              ChatGPT
            </Chip>
            <Chip className="ml-auto hidden border-transparent text-muted-foreground @2xl:flex">
              <span className="relative flex size-2">
                <span className="absolute inset-0 rounded-full bg-positive opacity-60 motion-safe:animate-ping" />
                <span className="relative size-2 rounded-full bg-positive" />
              </span>
              {t("sample")}
            </Chip>
          </ul>

          <HeadlineKpis report={report} />
          <div className="grid gap-3 @3xl:grid-cols-2">
            <TrendPanel autoplay title={overview("trendTitle")} history={report.history} brands={brands} />
            <BrandTable history={report.history} brands={brands} title={table("titleShort")} description={table("description")} />
            <TopDomains sources={report.topSources} totalAnswers={totalAnswers(report.prompts)} youId={brand.id} limit={5} />
            <SourceTypesChart sources={report.topSources} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <li className={cn("flex h-7 items-center gap-1.5 rounded-lg border px-2 text-foreground/80", className)}>{children}</li>
  );
}
