import { cn } from "@/shared/helpers/utils";
import type { Pilot, PlanKind, TargetTone } from "../types";
import { Caption, Eyebrow, LevelBars, SectionHead, SERIF, Sheet, Swatch, Table, type PilotT } from "./pilot-parts";

interface Props {
  pilot: Pilot;
  t: PilotT;
  number: number;
}

/**
 * The decisions the management has to take, each as a question with our recommendation, why, the options
 * and the risk, and beside it when, how much it changes and what it costs.
 */
export function PilotDecisions({ pilot, t, number }: Props) {
  const section = pilot.sections.decisions;

  return (
    <Sheet>
      <SectionHead number={number} eyebrow={t("decisions.eyebrow")} title={section.title} />
      <div className="mt-6">
        {pilot.decisions.map((decision, index) => (
          <article key={decision.question} className="grid gap-x-6 gap-y-3 border-t border-(--p-line) py-5 break-inside-avoid @xl:grid-cols-[10rem_1fr]">
            <div className="flex flex-wrap items-start gap-x-6 gap-y-2 @xl:flex-col">
              <p aria-hidden className={cn(SERIF, "text-4xl leading-none font-light text-(--p-navy)")}>
                {index + 1}
              </p>
              <div>
                <Eyebrow className="text-[0.625rem]">{t("decisions.when")}</Eyebrow>
                <p className="mt-0.5 text-sm text-(--p-ink)">{decision.when}</p>
              </div>
              <div>
                <Eyebrow className="text-[0.625rem]">{t("decisions.effect")}</Eyebrow>
                <LevelBars level={decision.effect} label={t(`decisions.effectLevel.${decision.effect}`)} />
              </div>
              <div>
                <Eyebrow className="text-[0.625rem]">{t("decisions.cost")}</Eyebrow>
                <LevelBars level={decision.cost} label={t(`decisions.costLevel.${decision.cost}`)} />
              </div>
            </div>

            <div className="min-w-0">
              <h3 className={cn(SERIF, "text-xl font-medium text-(--p-ink)")}>{decision.question}</h3>
              <div className="mt-2.5 bg-(--p-tint) px-5 py-3">
                <Eyebrow className="text-[0.625rem] font-semibold">{t("decisions.recommendation")}</Eyebrow>
                <p className="mt-1 font-semibold text-(--p-navy)">{decision.recommendation}</p>
              </div>
              <div className="mt-3.5 grid gap-x-6 gap-y-3 text-sm leading-snug text-(--p-body) @lg:grid-cols-3">
                <div>
                  <Eyebrow className="text-[0.625rem]">{t("decisions.why")}</Eyebrow>
                  <p className="mt-1">{decision.why}</p>
                </div>
                <div>
                  <Eyebrow className="text-[0.625rem]">{t("decisions.options")}</Eyebrow>
                  <ul className="mt-1 flex flex-col gap-1">
                    {decision.options.map((option) => (
                      <li key={option} className="flex gap-2">
                        <span aria-hidden>–</span>
                        {option}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <Eyebrow className="text-[0.625rem]">{t("decisions.risk")}</Eyebrow>
                  <p className="mt-1">{decision.risk}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      {section.note && <p className="text-xs text-(--p-mute) @xl:ml-[11.5rem]">{section.note}</p>}
    </Sheet>
  );
}

const PLAN_BARS: Record<PlanKind, string> = {
  site: "bg-(--p-ink)",
  external: "bg-(--p-bar)",
  measure: "border-[1.5px] border-(--p-ink) bg-white",
};
const TARGET_TONES: Record<TargetTone, string> = { bad: "text-(--p-bad)", warn: "text-(--p-warn)", ok: "text-(--p-good)" };

/** The plan as bars over its weeks (who does each task and what "done" means), then the figures the next measurement is compared on. */
export function PilotPlan({ pilot, t, numbers, figure, table }: { pilot: Pilot; t: PilotT; numbers: [number, number]; figure: number; table: number }) {
  const { weeks, tasks } = pilot.plan;
  const all = Array.from({ length: weeks }, (_, week) => week + 1);
  const columns = { gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` };

  return (
    <>
      <Sheet>
        <SectionHead number={numbers[0]} eyebrow={t("plan.eyebrow")} title={pilot.sections.plan.title} />
        <div className="mt-7">
          <Caption label={t("fig", { n: figure })}>{t("plan.figure", { weeks })}</Caption>
          <div className="mt-3 grid grid-cols-[1fr_1fr] gap-x-4 text-sm @xl:grid-cols-[14rem_10rem_1fr]">
            <span className="hidden @xl:block" />
            <span className="hidden @xl:block" />
            <div className="col-span-full grid pb-1.5 text-center text-xs text-(--p-mute) @xl:col-span-1" style={columns}>
              {all.map((week) => (
                <span key={week}>{week}</span>
              ))}
            </div>
            {tasks.map((task) => (
              <div key={task.task} className="col-span-full grid grid-cols-subgrid items-center gap-y-1.5 border-t border-(--p-line) py-3">
                <div className="leading-tight">
                  <p className="text-(--p-ink)">{task.task}</p>
                  <p className="mt-0.5 text-xs text-(--p-mute)">{t("plan.done", { done: task.done })}</p>
                </div>
                <p className="text-(--p-body)">{task.owner}</p>
                <div className="col-span-full grid h-3.5 @xl:col-span-1" style={columns}>
                  {all.map((week) => (
                    <span key={week} className="row-start-1 border-l border-(--p-line)" style={{ gridColumnStart: week }} />
                  ))}
                  <span className={cn("row-start-1", PLAN_BARS[task.kind])} style={{ gridColumn: `${task.from} / ${task.to + 1}` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-(--p-line) pt-3 text-xs text-(--p-mute)">
            <Swatch className="bg-(--p-ink)">{t("plan.site")}</Swatch>
            <Swatch className="bg-(--p-bar)">{t("plan.external")}</Swatch>
            <Swatch className="h-2! border-[1.5px] border-(--p-ink)">{t("plan.measure")}</Swatch>
            <span>{t("plan.scale")}</span>
          </p>
        </div>
      </Sheet>

      <Sheet flow>
        <SectionHead number={numbers[1]} eyebrow={t("targets.eyebrow")} title={pilot.sections.targets.title} />
        <div className="mt-7">
          <Caption label={t("table", { n: table })}>{t("targets.table")}</Caption>
          <Table
            className="mt-1"
            head={
              <>
                <th scope="col">{t("targets.colMetric")}</th>
                <th scope="col" className="text-right">
                  {t("targets.colNow")}
                </th>
                <th scope="col" />
                <th scope="col">{t("targets.colGoal")}</th>
              </>
            }
          >
            {pilot.targets.map((target) => (
              <tr key={target.metric}>
                <th scope="row" className="font-semibold text-(--p-ink)">
                  {target.metric}
                </th>
                <td className={cn("text-right font-semibold whitespace-nowrap", TARGET_TONES[target.tone])}>{target.now}</td>
                <td aria-hidden className="px-3! text-(--p-mute)">
                  →
                </td>
                <td className="w-[30%] text-(--p-body)">{target.goal}</td>
              </tr>
            ))}
          </Table>
        </div>
      </Sheet>
    </>
  );
}
