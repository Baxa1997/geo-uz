import { cn } from "@/shared/helpers/utils";
import type { Pilot } from "../types";
import { Caption, Mark, Note, SectionHead, SERIF, Sheet, Swatch, Table, WithAside, YouTag, type PilotT } from "./pilot-parts";

interface Props {
  pilot: Pilot;
  t: PilotT;
  number: number;
}

const percent = (part: number, whole: number) => `${whole > 0 ? (part / whole) * 100 : 0}%`;

/**
 * What was asked and what came back: for each question, how many businesses ChatGPT named, how many of
 * them it recommended and whom, and whether the client was among them.
 */
export function PilotQuestions({ pilot, t, number, figure }: Props & { figure: number }) {
  const { questions, method, totals, terms } = pilot;
  const section = pilot.sections.questions;
  const widest = Math.max(1, ...questions.map((question) => question.brandsNamed));

  return (
    <Sheet>
      <SectionHead number={number} eyebrow={t("questions.eyebrow")} title={section.title} />
      <div className="mt-6 grid gap-x-10 gap-y-4 text-sm leading-relaxed text-(--p-body) @xl:ml-[11.5rem] @xl:grid-cols-2">
        <div>
          <p className="text-[0.6875rem] font-semibold tracking-[0.12em] text-(--p-navy) uppercase">{t("questions.method")}</p>
          <p className="mt-1.5">{t("questions.methodText", { questions: method.questions, samples: method.samples })}</p>
        </div>
        <div>
          <p className="text-[0.6875rem] font-semibold tracking-[0.12em] text-(--p-navy) uppercase">{t("questions.counting")}</p>
          <p className="mt-1.5">{t.rich("questions.countingText", { b: (chunks) => <strong className="font-semibold text-(--p-ink)">{chunks}</strong> })}</p>
        </div>
      </div>

      <div className="mt-8">
        <Caption label={t("fig", { n: figure })}>{t("questions.figure", { engine: method.engine, genPlural: terms.genPlural, brand: pilot.brand.name })}</Caption>
        <Table
          className="mt-1"
          head={
            <>
              <th scope="col">{t("questions.colQuestion")}</th>
              <th scope="col">{t("questions.colBrands")}</th>
              <th scope="col" className="w-24">
                {pilot.brand.name}
              </th>
            </>
          }
        >
          {questions.map((question, index) => (
            <tr key={question.text}>
              <th scope="row" className="w-[38%] font-semibold text-(--p-ink)">
                <span className="flex gap-3">
                  <span className={cn(SERIF, "text-(--p-navy)")}>{index + 1}</span>
                  {question.text}
                </span>
              </th>
              <td>
                <div className="flex items-center gap-3">
                  <div className="flex h-5 text-xs font-semibold" style={{ width: percent(question.brandsNamed, widest * 1.35) }}>
                    {question.brandsRecommended > 0 && (
                      <span className="flex items-center justify-center bg-(--p-ink) text-white" style={{ width: percent(question.brandsRecommended, question.brandsNamed) }}>
                        {question.brandsRecommended}
                      </span>
                    )}
                    {question.brandsNamed > question.brandsRecommended && (
                      <span className="flex grow items-center justify-center bg-(--p-bar-soft) text-(--p-ink)">{question.brandsNamed - question.brandsRecommended}</span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-(--p-mute)">{t("questions.total", { n: question.brandsNamed })}</span>
                </div>
                {question.recommendedNames.length > 0 && (
                  <p className="mt-1.5 leading-snug text-(--p-ink)">
                    <span className="text-(--p-mute)">{t("questions.aiRecommends")}</span> {question.recommendedNames.join(", ")}
                  </p>
                )}
              </td>
              <td className="pl-2">
                {question.named === 0 ? (
                  <Mark tone="bad">{t("no")}</Mark>
                ) : (
                  <Mark tone="good">{question.answers > 1 ? t("countOf", { n: question.named, of: question.answers }) : t("yes")}</Mark>
                )}
              </td>
            </tr>
          ))}
          <tr className="bg-(--p-tint)">
            <th scope="row" className="pl-3 font-semibold text-(--p-navy)">
              {t("questions.sum", { answers: method.answers })}
            </th>
            <td className="text-(--p-body)">{t("questions.sumText", { genPlural: terms.genPlural, named: totals.othersNamed, recommended: totals.othersRecommended })}</td>
            <td className="pl-2">
              <span className={cn("font-semibold", totals.named === 0 ? "text-(--p-bad)" : "text-(--p-good)")}>{t("countOf", { n: totals.named, of: method.answers })}</span>
            </td>
          </tr>
        </Table>
        <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-(--p-mute)">
          <Swatch className="bg-(--p-ink)">{t("questions.legendRecommended")}</Swatch>
          <Swatch className="bg-(--p-bar-soft)">{t("questions.legendNamed")}</Swatch>
        </p>
      </div>

      {(section.note || pilot.quote) && (
        <WithAside aside={section.note && <Note label={t("takeaway")}>{section.note}</Note>}>
          {pilot.quote && (
            <figure className="border-t-2 border-(--p-ink) pt-4">
              <blockquote className={cn(SERIF, "text-lg leading-relaxed text-(--p-ink) italic")}>«{pilot.quote.text}»</blockquote>
              <figcaption className="mt-2 text-xs text-(--p-mute)">{pilot.quote.source}</figcaption>
            </figure>
          )}
        </WithAside>
      )}
    </Sheet>
  );
}

/** Whom ChatGPT recommends: every recommended business with how often, then what it states about each. */
export function PilotLeaders({ pilot, t, number, figure, table }: Props & { figure: number; table: number }) {
  const of = pilot.method.answers;
  const section = pilot.sections.leaders;
  // The recommended ones, and the client's row last, whatever its numbers
  const rows = pilot.brands.filter((brand) => brand.recommended > 0 || brand.isClient).sort((a, b) => Number(a.isClient) - Number(b.isClient));
  const ticks = Array.from({ length: of + 1 }, (_, tick) => tick).filter((tick) => of <= 10 || tick % Math.ceil(of / 5) === 0);

  return (
    <Sheet>
      <SectionHead number={number} eyebrow={t("leaders.eyebrow")} title={section.title} />
      <WithAside
        aside={
          <>
            {section.note && <Note label={t("takeaway")}>{section.note}</Note>}
            {pilot.leadersNote && <Note label={pilot.leadersNote.lead.replace(/\.$/, "")}>{pilot.leadersNote.text}</Note>}
          </>
        }
      >
        <Caption label={t("fig", { n: figure })}>{t("leaders.figure", { answers: of })}</Caption>
        <div className="mt-3 grid grid-cols-[minmax(7rem,14rem)_1fr_2rem_2rem] items-center gap-x-3 text-sm">
          <span />
          <div className="flex justify-between text-xs text-(--p-mute)">
            {ticks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
          <span className="text-right text-xs font-semibold text-(--p-ink)">{t("leaders.rec")}</span>
          <span className="text-right text-xs text-(--p-mute)">{t("leaders.named")}</span>
          {rows.map((brand) => (
            <div key={brand.name} className={cn("col-span-full grid grid-cols-subgrid items-center border-t border-(--p-line) py-1.5", brand.isClient && "-mx-3 bg-(--p-tint) px-3 py-2.5")}>
              <span className={cn("leading-tight", brand.isClient ? "font-semibold text-(--p-navy)" : "text-(--p-ink)")}>
                {brand.name}
                {brand.isClient && <YouTag label={t("you")} />}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="h-2 bg-(--p-ink)" style={{ width: percent(brand.recommended, of) }} />
                <span className="h-2 bg-(--p-bar-soft)" style={{ width: percent(brand.named, of) }} />
              </div>
              <span className={cn("text-right font-semibold", brand.recommended === 0 ? "text-(--p-bad)" : "text-(--p-ink)")}>{brand.recommended}</span>
              <span className={cn("text-right", brand.named === 0 ? "text-(--p-bad)" : "text-(--p-mute)")}>{brand.named}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-(--p-mute)">
          <Swatch className="bg-(--p-ink)">{t("leaders.legendRecommended")}</Swatch>
          <Swatch className="bg-(--p-bar-soft)">{t("leaders.legendNamed")}</Swatch>
        </p>
      </WithAside>

      <div className="mt-8">
        <Caption label={t("table", { n: table })}>{t("leaders.table")}</Caption>
        <Table
          className="mt-1"
          head={
            <>
              <th scope="col">{t("leaders.colName")}</th>
              {pilot.attributes.map((attribute) => (
                <th key={attribute.key} scope="col">
                  {attribute.label}
                </th>
              ))}
            </>
          }
        >
          {rows.map((brand) => (
            <tr key={brand.name} className={cn(brand.isClient && "bg-(--p-tint)")}>
              <th scope="row" className={cn("font-semibold", brand.isClient ? "pl-3 text-(--p-navy)" : "text-(--p-ink)")}>
                {brand.name}
                {brand.isClient && <YouTag label={t("you")} />}
              </th>
              {pilot.attributes.map((attribute) => (
                <td key={attribute.key} className="text-(--p-body)">
                  {brand.attributes[attribute.key] ?? (brand.isClient ? <Mark tone="bad">{t("silent")}</Mark> : <span className="text-(--p-mute)">—</span>)}
                </td>
              ))}
            </tr>
          ))}
        </Table>
      </div>
    </Sheet>
  );
}

/**
 * The businesses closest to the client: their prices as ChatGPT names them, drawn on one scale with the
 * client's missing one, then how ChatGPT describes each.
 */
export function PilotPeers({ pilot, t, number, figure, table }: Props & { figure: number | null; table: number }) {
  const of = pilot.method.answers;
  const section = pilot.sections.peers;
  const peers = pilot.brands.filter((brand) => brand.peer).sort((a, b) => Number(a.isClient) - Number(b.isClient));
  const { ranges, unit } = pilot.peers;
  const values = ranges.flatMap((range) => [range.low, range.high]).filter((value): value is number => value !== null);
  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);
  const at = (value: number) => percent(value - min, max - min);
  const place = (name: string) => pilot.brands.find((brand) => brand.name === name)?.place;

  return (
    <Sheet>
      <SectionHead number={number} eyebrow={t("peers.eyebrow")} title={section.title} />
      <WithAside
        aside={
          <>
            <Note label={t("peers.profile")}>{pilot.peers.profile}</Note>
            {section.note && <Note label={t("takeaway")}>{section.note}</Note>}
          </>
        }
      >
        {figure !== null && values.length > 0 && (
          <>
            <Caption label={t("fig", { n: figure })}>{unit}</Caption>
            <div className="mt-2 text-sm">
              {ranges.map((range) => {
                const client = range.name === pilot.brand.name;
                return (
                  <div
                    key={range.name}
                    className={cn("grid grid-cols-[minmax(6rem,12rem)_1fr_4.5rem] items-center gap-x-3 border-b border-(--p-line) py-2.5", client && "-mx-3 bg-(--p-tint) px-3")}
                  >
                    <div className="leading-tight">
                      <p className={client ? "font-semibold text-(--p-navy)" : "text-(--p-ink)"}>
                        {range.name}
                        {client && <YouTag label={t("you")} />}
                      </p>
                      <p className="mt-0.5 text-xs text-(--p-mute)">{place(range.name)}</p>
                    </div>
                    {range.low === null ? (
                      <p className="border border-dashed border-(--p-bad) py-0.5 text-center text-[0.6875rem] font-semibold tracking-wider text-(--p-bad) uppercase">{range.label}</p>
                    ) : (
                      <div className="relative h-3.5 bg-(--p-soft)">
                        {range.high === null ? (
                          <span className="absolute top-0 size-3.5 -translate-x-1/2 rounded-full bg-(--p-bar)" style={{ left: at(range.low) }} />
                        ) : (
                          <span className="absolute inset-y-0 bg-(--p-bar)" style={{ left: at(range.low), width: percent(range.high - range.low, max - min) }} />
                        )}
                      </div>
                    )}
                    <p className={cn("text-right font-semibold", range.low === null ? "text-(--p-bad)" : "text-(--p-ink)")}>{range.low === null ? "?" : range.label}</p>
                  </div>
                );
              })}
              <div className="grid grid-cols-[minmax(6rem,12rem)_1fr_4.5rem] gap-x-3 pt-1.5 text-xs text-(--p-mute)">
                <span />
                <div className="flex justify-between">
                  {Array.from({ length: max - min + 1 }, (_, step) => min + step)
                    .filter((tick) => max - min <= 10 || (tick - min) % Math.ceil((max - min) / 8) === 0)
                    .map((tick) => (
                      <span key={tick}>{tick}</span>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}
      </WithAside>

      <div className="mt-8">
        <Caption label={t("table", { n: table })}>{t("peers.table")}</Caption>
        <Table
          className="mt-1"
          head={
            <>
              <th scope="col">{t("leaders.colName")}</th>
              <th scope="col">{t("peers.colPlace")}</th>
              <th scope="col">{t("peers.colDescription")}</th>
              <th scope="col" className="pl-3 text-right">
                {t("peers.colNamed")}
              </th>
              <th scope="col" className="pl-3 text-right">
                {t("peers.colRecommended")}
              </th>
            </>
          }
        >
          {peers.map((brand) => (
            <tr key={brand.name} className={cn(brand.isClient && "bg-(--p-tint)")}>
              <th scope="row" className={cn("font-semibold", brand.isClient ? "pl-3 text-(--p-navy)" : "text-(--p-ink)")}>
                {brand.name}
                {brand.isClient && <YouTag label={t("you")} />}
              </th>
              <td className="text-(--p-body)">{brand.place ?? "—"}</td>
              <td className="text-(--p-body)">{brand.description ?? <Mark tone="bad">{t("peers.noDescription")}</Mark>}</td>
              {[brand.named, brand.recommended].map((n, column) => (
                <td key={column} className={cn("text-right whitespace-nowrap", brand.isClient ? "pr-3! font-semibold text-(--p-bad)" : "text-(--p-body)", brand.isClient && n > 0 && "text-(--p-good)")}>
                  {t("countOf", { n, of })}
                </td>
              ))}
            </tr>
          ))}
        </Table>
      </div>
    </Sheet>
  );
}
