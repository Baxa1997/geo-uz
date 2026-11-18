import type { ReactNode } from "react";
import { cn } from "@/shared/helpers/utils";
import type { Pilot, PilotBrand } from "../types";
import { Eyebrow, Mark, Points, SERIF, Sheet, type PilotT } from "./pilot-parts";

interface Props {
  pilot: Pilot;
  t: PilotT;
  /** The measurement's month ("Ноябрь 2026") and day ("11 ноября 2026"), already written out. */
  month: string;
  date: string;
  /** The measurement before, written out the same way, when the report compares with one. */
  previousDate?: string;
}

/** The business ChatGPT recommends most, then names most: whom the client is set against. */
export const leaderOf = (pilot: Pilot): PilotBrand | undefined => pilot.brands.find((brand) => !brand.isClient);

/**
 * The cover: whom the report is about and its one number, the answers that name the client. On paper it
 * fills the first page, with the navy band down its edge.
 */
export function PilotCover({ pilot, t, month, date, previousDate }: Props) {
  const { method, totals } = pilot;
  const facts: [string, string][] = [
    [t("preparedBy"), "GEOuz"],
    [t("preparedFor"), pilot.preparedFor],
    [t("measuredOn"), date],
    [
      t("scope"),
      t("scopeValue", {
        questions: method.questions,
        answers: method.answers,
        engine: method.engine,
        languages: method.languages.map((language) => t(`languages.${language}`)).join(", "),
      }),
    ],
  ];

  return (
    <section className="mx-auto flex w-full max-w-[210mm] bg-white shadow-sm print:h-[296mm] print:max-w-none print:shadow-none">
      <div aria-hidden className="w-3 shrink-0 bg-(--p-navy) sm:w-10 print:w-[11mm]" />
      <div className="flex min-w-0 grow flex-col gap-12 px-5 py-8 sm:px-12 sm:py-12 print:justify-between print:px-[21mm] print:py-[22mm]">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-lg font-bold tracking-tight text-(--p-ink)">
            Seenova AI
          </p>
          <Eyebrow>{t("kicker")}</Eyebrow>
        </div>

        <div>
          <Eyebrow>{t("pilot", { month })}</Eyebrow>
          <h1 className={cn(SERIF, "mt-5 max-w-lg text-5xl leading-[1.05] font-medium text-balance text-(--p-ink) sm:text-6xl")}>
            {t("coverTitle", { brand: pilot.brand.name })}
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-(--p-body)">{pilot.summary.coverLead}</p>

          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-2 border-t-2 border-(--p-ink) pt-8">
            <p className={cn(SERIF, "text-7xl leading-none font-medium text-(--p-ink) sm:text-8xl")}>
              {t.rich("coverNumber", {
                n: totals.named,
                of: method.answers,
                b: (chunks) => <span className={totals.named === 0 ? "text-(--p-bad)" : undefined}>{chunks}</span>,
              })}
            </p>
            <div className="max-w-52 text-base leading-snug text-(--p-body)">
              <p>{t("coverCount", { engine: method.engine, acc: pilot.terms.acc, one: pilot.terms.one })}</p>
              {pilot.previous && previousDate && (
                <p className="mt-1.5 text-sm text-(--p-mute)">{t("changes.coverWas", { n: pilot.previous.named.before.n, of: pilot.previous.named.before.of, date: previousDate })}</p>
              )}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-(--p-line) pt-5 text-sm sm:grid-cols-4">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>
                <Eyebrow className="text-[0.625rem]">{label}</Eyebrow>
              </dt>
              <dd className="mt-1.5 leading-snug text-(--p-ink)">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** A row of a profile card: what, and what ChatGPT says. */
function ProfileRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 border-b border-(--p-line) py-2.5 text-sm">
      <dt className="text-(--p-mute)">{label}</dt>
      <dd className="font-semibold text-(--p-ink)">{children}</dd>
    </div>
  );
}

/** How ChatGPT sees one business: how often it recommends and names it, and each fact it states about it. */
function Profile({ pilot, t, brand, children }: { pilot: Pilot; t: PilotT; brand: PilotBrand; children: ReactNode }) {
  const of = pilot.method.answers;
  const count = (n: number) => <Mark tone={n === 0 ? "bad" : "good"}>{t("answersOf", { n, of })}</Mark>;

  return (
    <div className={cn("border-t-[3px] pt-4", brand.isClient ? "border-(--p-navy)" : "border-(--p-line)")}>
      <Eyebrow>{t(brand.isClient ? "summary.youCard" : "summary.leaderCard")}</Eyebrow>
      <h3 className={cn(SERIF, "mt-1.5 text-2xl font-medium", brand.isClient ? "text-(--p-navy)" : "text-(--p-ink)")}>{brand.name}</h3>
      {children}
      <dl className="mt-3">
        <ProfileRow label={t("summary.recommended")}>{count(brand.recommended)}</ProfileRow>
        <ProfileRow label={t("summary.named")}>{count(brand.named)}</ProfileRow>
        {pilot.attributes.map(({ key, label }) => (
          <ProfileRow key={key} label={label}>
            {brand.attributes[key] ?? <Mark tone="bad">{t("silent")}</Mark>}
          </ProfileRow>
        ))}
      </dl>
    </div>
  );
}

/** One of the summary's four numbers. */
function Figure({ value, of, bad, label, sub }: { value: number; of?: string; bad: boolean; label: string; sub?: string }) {
  return (
    <div className="border-t-2 border-(--p-ink) px-3 py-3 first:pl-0 @2xl:border-l @2xl:border-l-(--p-line) @2xl:first:border-l-0">
      <p className={cn(SERIF, "text-4xl leading-none font-medium", bad ? "text-(--p-bad)" : "text-(--p-ink)")}>
        {value}
        {of && <span className="ml-1.5 font-sans text-sm font-normal">{of}</span>}
      </p>
      <p className="mt-2.5 text-sm leading-snug text-(--p-ink)">{label}</p>
      {sub && <p className="mt-1.5 text-xs leading-snug text-(--p-mute)">{sub}</p>}
    </div>
  );
}

/**
 * The page a reader may stop at: the finding as its headline, the client set against the leader as
 * ChatGPT sees them, four numbers, then what is wrong, what works and what to do first.
 */
export function PilotSummary({ pilot, t }: Pick<Props, "pilot" | "t">) {
  const { summary, totals, terms, method } = pilot;
  const client = pilot.brands.find((brand) => brand.isClient);
  const leader = leaderOf(pilot);
  // The sources ChatGPT cited and we could check: on how many of them is the client?
  const read = pilot.sources.filter((source) => source.answers > 0 && source.brandListed !== null);
  const listed = read.filter((source) => source.brandListed).length;
  const leaderLine = (n: number) => (leader ? t("summary.kpiLeader", { n, of: method.answers }) : undefined);

  return (
    <Sheet>
      <Eyebrow>{t("summary.eyebrow")}</Eyebrow>
      <h2 className={cn(SERIF, "mt-2 max-w-2xl text-3xl leading-tight font-medium text-balance text-(--p-ink) @xl:text-[2.1rem]")}>{summary.headline}</h2>

      <div className="mt-7 grid gap-x-10 gap-y-6 @2xl:grid-cols-2">
        {client && (
          <Profile pilot={pilot} t={t} brand={client}>
            <div className={cn("mt-4 px-5 py-4", client.named === 0 ? "bg-(--p-bad-tint)" : "bg-(--p-tint)")}>
              <p className={cn(SERIF, "text-lg font-semibold", client.named === 0 ? "text-(--p-bad)" : "text-(--p-navy)")}>{summary.brandLead}</p>
              <p className={cn("mt-1 text-sm leading-snug", client.named === 0 ? "text-(--p-bad)" : "text-(--p-body)")}>{summary.brandNote}</p>
            </div>
          </Profile>
        )}
        {leader && (
          <Profile pilot={pilot} t={t} brand={leader}>
            {summary.leaderQuote && (
              <blockquote className={cn(SERIF, "mt-4 bg-(--p-soft) px-5 py-4 text-[1.0625rem] leading-relaxed text-(--p-body) italic")}>«{summary.leaderQuote}»</blockquote>
            )}
          </Profile>
        )}
      </div>
      <p className="mt-3 text-xs text-(--p-mute)">{summary.profilesNote}</p>

      <div className="mt-7 grid grid-cols-2 border-b border-(--p-line) @2xl:grid-cols-4">
        <Figure value={totals.named} of={t("summary.of", { of: method.answers })} bad={totals.named === 0} label={t("summary.kpiNamed", terms)} sub={leaderLine(leader?.named ?? 0)} />
        <Figure
          value={totals.recommended}
          of={t("summary.of", { of: method.answers })}
          bad={totals.recommended === 0}
          label={t("summary.kpiRecommended", terms)}
          sub={leaderLine(leader?.recommended ?? 0)}
        />
        <Figure value={totals.othersNamed} bad={false} label={t("summary.kpiOthers", terms)} sub={t("summary.kpiOthersSub", { n: totals.othersRecommended })} />
        {read.length > 0 && (
          <Figure
            value={listed}
            of={t("summary.of", { of: read.length })}
            bad={listed === 0}
            label={t("summary.kpiSources", terms)}
            sub={read.map((source) => source.name).join(", ")}
          />
        )}
      </div>

      <div className="mt-7 grid gap-x-9 gap-y-6 @2xl:grid-cols-3">
        {(
          [
            ["flags", summary.flags, false],
            ["strengths", summary.strengths, false],
            ["firstSteps", summary.firstSteps, true],
          ] as const
        ).map(([key, points, numbered]) => (
          <div key={key}>
            <p className="border-t-2 border-(--p-ink) pt-3 pb-1 text-sm font-medium tracking-[0.12em] text-(--p-ink) uppercase">{t(`summary.${key}`)}</p>
            <Points points={points} numbered={numbered} />
          </div>
        ))}
      </div>
    </Sheet>
  );
}
