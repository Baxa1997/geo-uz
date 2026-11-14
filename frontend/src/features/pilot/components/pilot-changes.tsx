import type { ReactNode } from "react";
import { cn } from "@/shared/helpers/utils";
import type { FactStatus, Pilot, PilotComparison, PilotCount, PilotShift } from "../types";
import { Callout, Caption, Mark, Note, SectionHead, Sheet, Table, WithAside, YouTag, type PilotT } from "./pilot-parts";

type Tone = "good" | "bad" | "mute";

const share = (count: PilotCount) => (count.of > 0 ? count.n / count.of : 0);

/** Which way a count went. The two measurements may differ in size, so the shares are compared, not the numbers. */
function direction(before: PilotCount, after: PilotCount): Tone {
  const moved = share(after) - share(before);
  return Math.abs(moved) < 1e-9 ? "mute" : moved > 0 ? "good" : "bad";
}

const FACT_RANK: Record<FactStatus, number> = { missing: 0, partial: 1, found: 2 };
const FACT_TONE: Record<FactStatus, "good" | "warn" | "bad"> = { found: "good", partial: "warn", missing: "bad" };

/**
 * Before → now in one row's cells, with the way it went in words: better or worse for the client's own
 * figures, up or down (`neutral`) for another business, whose gain is not the reader's.
 */
function Shift({ t, before, after, tone, neutral = false }: { t: PilotT; before: ReactNode; after: ReactNode; tone: Tone; neutral?: boolean }) {
  const word = tone === "mute" ? "same" : neutral ? (tone === "good" ? "up" : "down") : tone === "good" ? "better" : "worse";
  return (
    <>
      <td className="whitespace-nowrap text-(--p-mute)">{before}</td>
      <td className="whitespace-nowrap">
        <span className={cn("font-semibold", neutral || tone === "mute" ? "text-(--p-ink)" : tone === "good" ? "text-(--p-good)" : "text-(--p-bad)")}>{after}</span>
      </td>
      <td className="whitespace-nowrap">
        <Mark tone={neutral ? "mute" : tone}>{t(`changes.${word}`)}</Mark>
      </td>
    </>
  );
}

/**
 * What changed since the measurement before: the reason a client pays for a second report. The key figures
 * before and now, the goals the earlier report set against where they stand, who gained and lost among the
 * businesses, and the facts and sources whose state changed. Counts stay counts; the way each went is
 * judged on its share, because the two measurements may have different numbers of answers.
 */
export function PilotChanges({
  pilot,
  previous,
  t,
  number,
  firstTable,
  dates,
}: {
  pilot: Pilot;
  previous: PilotComparison;
  t: PilotT;
  number: number;
  /** The number of this section's first table; it prints up to five. */
  firstTable: number;
  dates: { before: string; after: string };
}) {
  const { terms } = pilot;
  let table = firstTable;
  const count = (value: PilotCount) => t("countOf", { n: value.n, of: value.of });
  const figures = (
    [
      ["named", previous.named],
      ["recommended", previous.recommended],
      ["listed", previous.listed],
      ["facts", previous.facts],
    ] as const
  ).filter((row): row is [(typeof row)[0], PilotShift] => row[1] !== null);
  const sizes = { before: previous.named.before.of, after: previous.named.after.of };

  return (
    <Sheet>
      <SectionHead number={number} eyebrow={t("changes.eyebrow")} title={previous.title} />
      <WithAside aside={previous.note && <Note label={t("takeaway")}>{previous.note}</Note>}>
        <Caption label={t("table", { n: table++ })}>{t("changes.figures")}</Caption>
        <Table
          className="mt-1"
          head={
            <>
              <th scope="col">{t("changes.colFigure")}</th>
              <th scope="col">{t("changes.colBefore", { date: dates.before })}</th>
              <th scope="col">{t("changes.colAfter", { date: dates.after })}</th>
              <th scope="col" />
            </>
          }
        >
          {figures.map(([key, shift]) => (
            <tr key={key}>
              <th scope="row" className="w-[40%] font-semibold text-(--p-ink)">
                {t(`changes.${key}`, terms)}
              </th>
              <Shift t={t} before={count(shift.before)} after={count(shift.after)} tone={direction(shift.before, shift.after)} />
            </tr>
          ))}
        </Table>
        {sizes.before !== sizes.after && <p className="mt-2.5 text-xs text-(--p-mute)">{t("changes.sample", sizes)}</p>}
      </WithAside>

      {previous.targets.length > 0 && (
        <div className="mt-8">
          <Caption label={t("table", { n: table++ })}>{t("changes.targets")}</Caption>
          <Table
            className="mt-1"
            head={
              <>
                <th scope="col">{t("changes.colFigure")}</th>
                <th scope="col">{t("changes.colWas")}</th>
                <th scope="col">{t("changes.colGoal")}</th>
                <th scope="col">{t("changes.colNow")}</th>
                <th scope="col">{t("changes.colMet")}</th>
              </>
            }
          >
            {previous.targets.map((target) => (
              <tr key={target.metric}>
                <th scope="row" className="w-[36%] font-semibold text-(--p-ink)">
                  {target.metric}
                </th>
                <td className="text-(--p-mute)">{target.was}</td>
                <td className="text-(--p-body)">{target.goal}</td>
                <td className="font-semibold text-(--p-ink)">{target.now}</td>
                <td className="whitespace-nowrap">
                  <Mark tone={target.met === null ? "mute" : target.met ? "good" : "bad"}>{t(`changes.met.${target.met === null ? "unknown" : target.met ? "yes" : "no"}`)}</Mark>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      {previous.brands.length > 0 && (
        <div className="mt-8">
          <Caption label={t("table", { n: table++ })}>{t("changes.brands")}</Caption>
          <Table
            className="mt-1"
            head={
              <>
                <th scope="col">{t("changes.colBrand")}</th>
                <th scope="col" colSpan={3}>
                  {t("changes.colRecommended")}
                </th>
                <th scope="col" colSpan={3}>
                  {t("changes.colNamed")}
                </th>
              </>
            }
          >
            {previous.brands.map((brand) => (
              <tr key={brand.name} className={cn(brand.isClient && "bg-(--p-tint)")}>
                <th scope="row" className={cn("font-semibold", brand.isClient ? "pl-3 text-(--p-navy)" : "text-(--p-ink)")}>
                  {brand.name}
                  {brand.isClient && <YouTag label={t("you")} />}
                </th>
                {(["recommended", "named"] as const).map((field) => {
                  const before = { n: brand.before?.[field] ?? 0, of: sizes.before };
                  const after = { n: brand.after?.[field] ?? 0, of: sizes.after };
                  return (
                    <Shift
                      key={field}
                      t={t}
                      before={brand.before ? count(before) : t("changes.isNew")}
                      after={brand.after ? count(after) : t("changes.isGone")}
                      tone={direction(before, after)}
                      neutral={!brand.isClient}
                    />
                  );
                })}
              </tr>
            ))}
          </Table>
        </div>
      )}

      {previous.factChanges.length > 0 && (
        <div className="mt-8">
          <Caption label={t("table", { n: table++ })}>{t("changes.factChanges")}</Caption>
          <Table
            className="mt-1"
            head={
              <>
                <th scope="col">{t("facts.colFact")}</th>
                <th scope="col">{t("changes.colWas")}</th>
                <th scope="col">{t("changes.colNow")}</th>
                <th scope="col" />
              </>
            }
          >
            {previous.factChanges.map((change) => (
              <tr key={change.fact}>
                <th scope="row" className="font-semibold text-(--p-ink)">
                  {change.fact}
                </th>
                <td className="text-(--p-mute)">{change.before ? t(`facts.status.${change.before}`) : "—"}</td>
                <td>
                  <Mark tone={FACT_TONE[change.after]}>{t(`facts.status.${change.after}`)}</Mark>
                </td>
                <td className="whitespace-nowrap">
                  {(() => {
                    const moved = FACT_RANK[change.after] - (change.before ? FACT_RANK[change.before] : 0);
                    return <Mark tone={moved > 0 ? "good" : moved < 0 ? "bad" : "mute"}>{t(moved > 0 ? "changes.better" : moved < 0 ? "changes.worse" : "changes.same")}</Mark>;
                  })()}
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      {previous.sourceChanges.length > 0 && (
        <div className="mt-8">
          <Caption label={t("table", { n: table++ })}>{t("changes.sourceChanges")}</Caption>
          <Table
            className="mt-1"
            head={
              <>
                <th scope="col">{t("reasons.colSource")}</th>
                <th scope="col">{t("changes.colWas")}</th>
                <th scope="col">{t("changes.colNow")}</th>
              </>
            }
          >
            {previous.sourceChanges.map((change) => {
              const word = (listed: boolean | null) => t(`reasons.listed.${listed === null ? "unknown" : listed ? "yes" : "no"}`);
              return (
                <tr key={change.name}>
                  <th scope="row" className="font-semibold text-(--p-ink)">
                    {change.name}
                  </th>
                  <td className="text-(--p-mute)">{word(change.before)}</td>
                  <td>
                    <Mark tone={change.after === null ? "mute" : change.after ? "good" : "bad"}>{word(change.after)}</Mark>
                  </td>
                </tr>
              );
            })}
          </Table>
        </div>
      )}

      {previous.callout && <Callout point={previous.callout} className="mt-6 @xl:ml-[11.5rem]" />}
    </Sheet>
  );
}

/** How many tables the section prints, so the tables after it take the right numbers. */
export const changesTables = (previous: PilotComparison) =>
  1 + [previous.targets, previous.brands, previous.factChanges, previous.sourceChanges].filter((rows) => rows.length > 0).length;
