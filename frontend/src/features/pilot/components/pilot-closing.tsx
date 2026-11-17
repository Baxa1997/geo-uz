import { cn } from "@/shared/helpers/utils";
import type { Pilot } from "../types";
import { citedSources } from "./pilot-causes";
import { Caption, Eyebrow, Points, SectionHead, SERIF, Sheet, Table, type PilotT } from "./pilot-parts";

/**
 * What the pilot can't say and what to do about each limit, what to check before deciding, the pages the
 * report cites, how the answers were collected, and how to reach us.
 */
export function PilotClosing({ pilot, t, number, table, date }: { pilot: Pilot; t: PilotT; number: number; table: number; date: string }) {
  const { method, contact } = pilot;
  const refs = citedSources(pilot);
  const contacts = [contact.phone, contact.telegram, contact.email].filter((line): line is string => Boolean(line));

  return (
    <Sheet>
      <SectionHead number={number} eyebrow={t("limits.eyebrow")} title={pilot.sections.limits.title} />

      <div className="mt-7">
        <Caption label={t("table", { n: table })}>{t("limits.table")}</Caption>
        <Table
          className="mt-1"
          head={
            <>
              <th scope="col">{t("limits.colLimit")}</th>
              <th scope="col">{t("limits.colAction")}</th>
            </>
          }
        >
          {pilot.limits.map((limit) => (
            <tr key={limit.limit}>
              <td className="w-1/2 leading-snug text-(--p-body)">
                <strong className="font-semibold text-(--p-ink)">{limit.limit}</strong> {limit.text}
              </td>
              <td className="leading-snug text-(--p-body)">{limit.action}</td>
            </tr>
          ))}
        </Table>
      </div>

      <div className="mt-8 grid gap-x-10 gap-y-7 @2xl:grid-cols-2">
        <div>
          <Eyebrow className="border-t-2 border-(--p-ink) pt-3 pb-1">{t("limits.checks")}</Eyebrow>
          <Points points={pilot.checks} />
        </div>
        <div>
          <Eyebrow className="border-t-2 border-(--p-ink) pt-3 pb-1">{t("limits.sources")}</Eyebrow>
          <ol className="text-sm leading-snug text-(--p-body)">
            {refs.map((source, index) => (
              <li key={source.name} className="flex gap-3 border-b border-(--p-line) py-2.5">
                <span className={cn(SERIF, "w-3 shrink-0 font-semibold text-(--p-navy)")}>{index + 1}</span>
                <span className="min-w-0 break-words">
                  <strong className="mr-2 font-semibold text-(--p-ink)">{source.name}</strong>
                  {source.title}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs leading-relaxed text-(--p-mute)">
            {t("limits.raw", { answers: method.answers, engine: method.engine })}{" "}
            {/* The model is never named (the user, 17 Nov 2026: "we don't have to show which models we used") */}
            {t("limits.methodManual", { engine: method.engine, date })}
          </p>
        </div>
      </div>

      <div className="mt-9 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 bg-(--p-navy) px-7 py-6 text-white break-inside-avoid">
        <div>
          <p className="font-bold tracking-tight">
            Seenova<span className="ml-[0.22em] opacity-60">AI</span>
          </p>
          <p className="mt-1.5">{t("limits.cta")}</p>
        </div>
        {contacts.length > 0 && (
          <p className="text-sm leading-relaxed @md:text-right">
            {contacts.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        )}
      </div>
    </Sheet>
  );
}
