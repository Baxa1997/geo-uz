import { cn } from "@/shared/helpers/utils";

const WIDTH = 76;
const HEIGHT = 24;
const PAD = 3.5;

/**
 * A number over the weekly checks as a small line beside it in a table: straight from check to check (a
 * curve would suggest values between two checks), the latest marked. It shows the way the number went, not
 * its size: the numbers are in the row. `lowerIsBetter` draws a smaller number higher (position). A check
 * without a value (the brand wasn't named) breaks the line.
 */
export function SparkLine({ values, lowerIsBetter = false, label, className }: { values: (number | null)[]; lowerIsBetter?: boolean; label: string; className?: string }) {
  const known = values.filter((value): value is number => value !== null);
  if (known.length < 2) return <span className="text-muted-foreground">—</span>;

  const low = Math.min(...known);
  const high = Math.max(...known);
  const step = (WIDTH - PAD * 2) / (values.length - 1);
  const y = (value: number) => {
    if (high === low) return HEIGHT / 2;
    const share = (value - low) / (high - low);
    return PAD + (1 - (lowerIsBetter ? 1 - share : share)) * (HEIGHT - PAD * 2);
  };
  // Runs of checks that have a value, each drawn as its own line
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];
  values.forEach((value, index) => {
    if (value === null) {
      if (run.length > 0) runs.push(run);
      run = [];
      return;
    }
    run.push([PAD + index * step, y(value)]);
  });
  if (run.length > 0) runs.push(run);
  const last = runs.at(-1)?.at(-1);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className={cn("h-6 w-19 shrink-0 overflow-visible", className)}>
      {runs.map((points, index) => (
        <polyline key={index} points={points.map(([x, pointY]) => `${x},${pointY}`).join(" ")} fill="none" stroke="var(--rival-strong)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {last && <circle cx={last[0]} cy={last[1]} r="2.75" fill="var(--you)" />}
    </svg>
  );
}
