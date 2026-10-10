import { conditionStatus, FAIR_FROM, GOOD_FROM } from "@/shared/helpers/condition";
import { cn } from "@/shared/helpers/utils";
import { STATUS_COLOR, STATUS_FILL } from "../constants";

const WIDTH = 200;
const HEIGHT = 108;
const CENTER = 100;
const BASE = 98;
const RADIUS = 84;
const STROKE = 14;

/** The half circle from the left end (0) over the top to the right end (100). */
const ARC = `M${CENTER - RADIUS},${BASE} A${RADIUS},${RADIUS} 0 0 1 ${CENTER + RADIUS},${BASE}`;

/** A point of the scale on the arc, `reach` out from its middle line. */
function at(score: number, reach: number): [number, number] {
  const angle = Math.PI * (1 - score / 100);
  return [CENTER + (RADIUS + reach) * Math.cos(angle), BASE - (RADIUS + reach) * Math.sin(angle)];
}

/**
 * The condition score as a gauge: a half circle from 0 to 100 filled up to the score in its status's
 * color, cut where "fair" and "good" begin, the score large in its middle. `label` says it for a screen
 * reader; the number itself is text, so it copies and prints sharp.
 */
export function ConditionGauge({ score, label, className }: { score: number; label: string; className?: string }) {
  const status = conditionStatus(score);
  return (
    <div role="img" aria-label={label} className={cn("relative mx-auto w-full max-w-54", className)}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden className="h-auto w-full overflow-visible">
        <path d={ARC} fill="none" stroke="var(--muted)" strokeWidth={STROKE} strokeLinecap="round" />
        {score > 0 && (
          <path d={ARC} fill="none" stroke={STATUS_COLOR[status]} strokeWidth={STROKE} strokeLinecap="round" pathLength={100} strokeDasharray={`${Math.min(100, score)} 100`} />
        )}
        {/* Where a status begins: a cut across the arc */}
        {[FAIR_FROM, GOOD_FROM].map((threshold) => {
          const [x1, y1] = at(threshold, -STROKE / 2 - 1);
          const [x2, y2] = at(threshold, STROKE / 2 + 1);
          return <line key={threshold} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--card)" strokeWidth="2.5" />;
        })}
      </svg>
      <div aria-hidden className="absolute inset-x-0 bottom-0 flex items-baseline justify-center gap-1">
        <span className="text-5xl leading-none font-semibold tracking-tight tabular-nums">{score}</span>
        <span className="text-sm text-muted-foreground tabular-nums">/100</span>
      </div>
    </div>
  );
}

/** The tallest a column grows, in rem: a score of 100. */
const COLUMN = 2.5;

/**
 * The condition score over the weekly reports as columns against the whole scale (a column per report: a
 * line would suggest values between two checks), each with its number over it, the latest in its status's
 * color.
 */
export function ConditionColumns({ scores, label, className }: { scores: number[]; label: string; className?: string }) {
  return (
    <div role="img" aria-label={label} className={cn("flex items-end gap-1", className)}>
      {scores.map((score, index) => {
        const latest = index === scores.length - 1;
        return (
          <span key={index} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className={cn("text-[0.6875rem] leading-none tabular-nums", latest ? "font-semibold" : "text-muted-foreground")}>{score}</span>
            <span
              className={cn("w-full rounded-t-[3px]", latest ? STATUS_FILL[conditionStatus(score)] : "bg-foreground/15")}
              style={{ height: `${Math.max(0.125, (Math.min(100, score) / 100) * COLUMN)}rem` }}
            />
          </span>
        );
      })}
    </div>
  );
}
