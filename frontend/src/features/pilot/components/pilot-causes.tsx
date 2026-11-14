import { cn } from "@/shared/helpers/utils";
import type { FactStatus, Pilot } from "../types";
import { Callout, Caption, Eyebrow, LevelBars, Mark, Note, SectionHead, Sheet, Table, WithAside, type PilotT } from "./pilot-parts";

interface Props {
  pilot: Pilot;
  t: PilotT;
}

/** The sources that carry a reference number: those with a page of their own to cite at the report's end. */
export const citedSources = (pilot: Pilot) => pilot.sources.filter((source) => source.title !== null);

/**
 * Why the client is missing: the likely reasons, each with how sure we are and what we found, then the
 * sources ChatGPT reads set against the ones the client is on.
 */
export function PilotReasons({ pilot, t, number, tables }: Props & { number: number; tables: [number, number] }) {
  const of = pilot.method.answers;
  const refs = citedSources(pilot);

  return (
    <Sheet>
      <SectionHead number={number} eyebrow={t("reasons.eyebrow")} title={pilot.sections.reasons.title} />

      <div className="mt-7">
        <Caption label={t("table", { n: tables[0] })}>{t("reasons.table")}</Caption>
        <Table
          className="mt-1"
          head={
            <>
              <th scope="col">{t("reasons.colReason")}</th>
              <th scope="col">{t("reasons.colConfidence")}</th>
              <th scope="col">{t("reasons.colEvidence")}</th>
            </>
          }
        >
          {pilot.reasons.map((reason) => (
            <tr key={reason.reason}>
              <th scope="row" className="w-[27%] font-semibold text-(--p-ink)">
                {reason.reason}
              </th>
              <td className="w-[23%]">
                <LevelBars level={reason.confidence} label={t(`reasons.confidence.${reason.confidence}`)} />
              </td>
              <td className="leading-snug text-(--p-body)">{reason.evidence}</td>
            </tr>
          ))}
        </Table>
      </div>

      <div className="mt-8">
        <Caption label={t("table", { n: tables[1] })}>{t("reasons.sourcesTable", { brand: pilot.brand.name })}</Caption>
        <Table
          className="mt-1"
          head={
            <>
              <th scope="col">{t("reasons.colSource")}</th>
              <th scope="col">{t("reasons.colKind")}</th>
              <th scope="col">{t("reasons.colCited")}</th>
              <th scope="col">{t("reasons.colListed", { brand: pilot.brand.name })}</th>
            </>
          }
        >
          {pilot.sources.map((source) => {
            const ref = refs.indexOf(source) + 1;
            return (
              <tr key={source.name}>
                <th scope="row" className="font-semibold text-(--p-ink)">
                  {source.name}
                  {ref > 0 && <sup className="ml-0.5 font-normal text-(--p-mute)">{ref}</sup>}
                </th>
                <td className="text-(--p-body)">{t(`reasons.kind.${source.kind}`)}</td>
                <td className="whitespace-nowrap text-(--p-body)">
                  {of <= 12 && (
                    <span aria-hidden className="mr-2 inline-flex gap-0.5 align-middle">
                      {Array.from({ length: of }, (_, dot) => (
                        <span key={dot} className={cn("size-1.5 rounded-full", dot < source.answers ? "bg-(--p-ink)" : "bg-(--p-line)")} />
                      ))}
                    </span>
                  )}
                  {t("countOf", { n: source.answers, of })}
                </td>
                <td>
                  {source.brandListed === null ? (
                    <Mark tone="mute">{t("reasons.listed.unknown")}</Mark>
                  ) : (
                    <Mark tone={source.brandListed ? "good" : "bad"}>{t(`reasons.listed.${source.brandListed ? "yes" : "no"}`)}</Mark>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
        {pilot.sourcesFootnote && <p className="mt-2.5 text-xs text-(--p-mute)">{pilot.sourcesFootnote}</p>}
      </div>

      {pilot.sourcesNote && <Callout point={pilot.sourcesNote} className="mt-6 @xl:ml-[11.5rem]" />}
    </Sheet>
  );
}

const FACT_TONES: Record<FactStatus, { bar: string; tone: "good" | "warn" | "bad" }> = {
  found: { bar: "bg-(--p-good)", tone: "good" },
  partial: { bar: "bg-(--p-warn-bar)", tone: "warn" },
  missing: { bar: "bg-(--p-bad)", tone: "bad" },
};
const FACT_ORDER: FactStatus[] = ["found", "partial", "missing"];

/**
 * The facts ChatGPT describes this category's businesses with, and which of them can be found about the
 * client: one bar of all of them by status, then each fact with what was found.
 */
export function PilotFacts({ pilot, t, table }: Props & { table: number }) {
  const section = pilot.sections.facts;
  const { facts } = pilot;
  const counts = FACT_ORDER.map((status) => [status, facts.filter((fact) => fact.status === status).length] as const);

  return (
    <Sheet>
      <SectionHead eyebrow={t("facts.eyebrow")} title={section.title} />

      <div className="mt-6 grid items-center gap-x-6 gap-y-2 @xl:grid-cols-[10rem_1fr]">
        <Eyebrow className="font-semibold text-(--p-navy)">{t("facts.count", { count: facts.length })}</Eyebrow>
        <div>
          <div aria-hidden className="flex h-3.5 gap-0.5">
            {FACT_ORDER.flatMap((status) => facts.filter((fact) => fact.status === status).map((fact) => <span key={fact.fact} className={cn("grow", FACT_TONES[status].bar)} />))}
          </div>
          <p className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {counts.map(([status, count]) => (
              <span key={status} className={cn("font-semibold", status === "found" ? "text-(--p-good)" : status === "partial" ? "text-(--p-warn)" : "text-(--p-bad)")}>
                {count} {t(`facts.status.${status}`)}
              </span>
            ))}
            <span className="text-(--p-mute)">{t("facts.outOf", { count: facts.length })}</span>
          </p>
        </div>
      </div>

      <div className="mt-6">
        <Caption label={t("table", { n: table })}>{t("facts.table", { brand: pilot.brand.name })}</Caption>
        <Table
          className="mt-1"
          head={
            <>
              <th scope="col">{t("facts.colFact")}</th>
              <th scope="col">{t("facts.colExample")}</th>
              <th scope="col">{t("facts.colFound", { brand: pilot.brand.name })}</th>
              <th scope="col">{t("facts.colStatus")}</th>
            </>
          }
        >
          {facts.map((fact) => (
            <tr key={fact.fact}>
              <th scope="row" className="w-[22%] font-semibold text-(--p-ink)">
                {fact.fact}
              </th>
              <td className="w-[30%] font-(family-name:--font-pilot-serif) text-(--p-body) italic">{fact.example ? `«${fact.example}»` : "—"}</td>
              <td className="leading-snug text-(--p-body)">{fact.found}</td>
              <td className="whitespace-nowrap">
                <Mark tone={FACT_TONES[fact.status].tone}>{t(`facts.status.${fact.status}`)}</Mark>
              </td>
            </tr>
          ))}
        </Table>
        {pilot.factsFootnote && <p className="mt-2.5 text-xs text-(--p-mute)">{pilot.factsFootnote}</p>}
      </div>

      {(section.note || pilot.factsNote) && (
        <WithAside aside={section.note && <Note label={t("takeaway")}>{section.note}</Note>}>{pilot.factsNote && <Callout point={pilot.factsNote} />}</WithAside>
      )}
    </Sheet>
  );
}
