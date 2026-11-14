import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";
import { cache } from "react";
import { setPageLocale } from "@/i18n/page-locale";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate, formatMonth } from "@/shared/helpers/dates";
import { changesTables, PilotChanges } from "../components/pilot-changes";
import { PilotClosing } from "../components/pilot-closing";
import { PilotFacts, PilotReasons } from "../components/pilot-causes";
import { PilotDecisions, PilotPlan } from "../components/pilot-decisions";
import { PilotLeaders, PilotPeers, PilotQuestions } from "../components/pilot-evidence";
import { PilotCover, PilotSummary } from "../components/pilot-summary";
import { PrintButton } from "../components/print-button";
import { pilotSerif } from "../fonts";
import { loadPilot } from "../helpers/load-pilot";

type Props = PageProps<"/[locale]/pilots/[slug]">;

const getPilot = cache(async (slug: string) => (await loadPilot(slug)) ?? notFound());

/** The report's own colors: a paper, so the same in the light and the dark theme. */
const PALETTE = {
  "--p-navy": "#1c2e6e",
  "--p-ink": "#14171f",
  "--p-body": "#3d4350",
  "--p-mute": "#737a88",
  "--p-line": "#d9dce3",
  "--p-soft": "#f1f2f6",
  "--p-tint": "#e8ecf7",
  "--p-bar": "#8e96a6",
  "--p-bar-soft": "#c6cad4",
  "--p-bad": "#b03020",
  "--p-bad-tint": "#f9eeeb",
  "--p-good": "#1f7a4f",
  "--p-warn": "#97690a",
  "--p-warn-bar": "#c8961e",
} as CSSProperties;

/** A text as a CSS string: for the lines a printed page carries at its head and foot. */
const cssString = (text: string) => `"${text.replace(/[\\"]/g, "\\$&").replace(/[\n\r<]/g, " ")}"`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setPageLocale(locale);
  const pilot = await getPilot(slug);
  const t = await getTranslations({ locale: pilot.language, namespace: "Pilot" });
  // A client's report is sent as a link: it isn't for search engines
  return { title: t("metaTitle", { brand: pilot.brand.name }), robots: { index: false, follow: false } };
}

/**
 * A pilot report (`/pilots/<slug>`): one measurement of how ChatGPT answers a category's questions,
 * written up for one business as a document to forward and print. Public, no login, no sidebar.
 *
 * It is read from `frontend/pilots/<slug>.json`, which `backend/pilot` writes and a person may edit. The
 * report speaks the language of its file, whatever the address's language. In order: the cover with the
 * one number; the summary a reader may stop at; from a client's second report on, what changed since the
 * one before (`pilot.previous`); then the evidence (what was asked, whom ChatGPT
 * recommends, the closest competitors), the reasons (sources, the facts ChatGPT needs), the decisions,
 * the plan with the figures to compare next time, and the limits. Figures and tables are numbered in
 * that order. On paper every section starts a page, which carries the report's name at its head and its
 * number at its foot (`@page pilot` in globals.css; the lines' texts come from here).
 */
export default async function PilotPage({ params }: Props) {
  const { locale, slug } = await params;
  setPageLocale(locale);
  const pilot = await getPilot(slug);
  const t = await getTranslations({ locale: pilot.language, namespace: "Pilot" });

  const { collectedAt } = pilot.method;
  // Russian dates come with "г." at their end, which a heading doesn't carry
  const plain = (text: string) => text.replace(/\s*г\.$/, "");
  const month = plain(formatMonth(collectedAt, pilot.language, TIME_ZONE, "long"));
  const date = plain(formatLongDate(collectedAt, pilot.language, TIME_ZONE));
  const { previous } = pilot;
  const previousDate = previous ? plain(formatLongDate(previous.collectedAt, pilot.language, TIME_ZONE)) : undefined;
  const shortDate = new Intl.DateTimeFormat("ru", { timeZone: TIME_ZONE }).format(new Date(collectedAt));

  const hasPeers = pilot.brands.some((brand) => brand.peer && !brand.isClient);
  const hasRanges = pilot.peers.ranges.some((range) => range.low !== null);
  // Sections, figures and tables take their numbers in the order they are printed
  let section = 0;
  let figure = 0;
  let table = 0;

  return (
    <div lang={pilot.language} style={PALETTE} className={`pilot ${pilotSerif.variable} min-h-svh bg-neutral-200/70 font-sans text-(--p-ink) print:min-h-0 print:bg-transparent`}>
      <style>{`@page pilot {
  @top-left { content: ${cssString(`GEOuz · ${t("kicker")}`)}; }
  @top-right { content: ${cssString(`${pilot.brand.name} · ${month}`)}; }
  @bottom-left { content: ${cssString(t("footer", { date: shortDate }))}; }
}`}</style>
      <main className="flex flex-col gap-4 px-3 py-4 sm:py-6 print:block print:p-0">
        <div className="mx-auto flex w-full max-w-[210mm] justify-end print:hidden">
          <PrintButton label={t("print")} />
        </div>
        <PilotCover pilot={pilot} t={t} month={month} date={date} previousDate={previousDate} />
        <PilotSummary pilot={pilot} t={t} />
        {previous && previousDate && (
          <PilotChanges pilot={pilot} previous={previous} t={t} number={++section} firstTable={(table += changesTables(previous)) - changesTables(previous) + 1} dates={{ before: previousDate, after: date }} />
        )}
        <PilotQuestions pilot={pilot} t={t} number={++section} figure={++figure} />
        <PilotLeaders pilot={pilot} t={t} number={++section} figure={++figure} table={++table} />
        {hasPeers && <PilotPeers pilot={pilot} t={t} number={++section} figure={hasRanges ? ++figure : null} table={++table} />}
        {pilot.reasons.length > 0 && <PilotReasons pilot={pilot} t={t} number={++section} tables={[++table, ++table]} />}
        {pilot.facts.length > 0 && <PilotFacts pilot={pilot} t={t} table={++table} />}
        {pilot.decisions.length > 0 && <PilotDecisions pilot={pilot} t={t} number={++section} />}
        <PilotPlan pilot={pilot} t={t} numbers={[++section, ++section]} figure={++figure} table={++table} />
        <PilotClosing pilot={pilot} t={t} number={++section} table={++table} date={date} />
      </main>
    </div>
  );
}
