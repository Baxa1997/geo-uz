import { cn } from "@/shared/helpers/utils";

const WIDTH = 300;
const HEIGHT = 110;
const PAD_X = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 6;

/** A smooth line through the points (Catmull-Rom as cubic Béziers). */
function smooth(points: [number, number][]): string {
  const [first] = points;
  if (!first) return "";
  let path = `M${first[0]},${first[1]}`;
  for (let index = 0; index < points.length - 1; index++) {
    const p1 = points[index] ?? first;
    const p0 = points[index - 1] ?? p1;
    const p2 = points[index + 1] ?? p1;
    const p3 = points[index + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    path += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return path;
}

/**
 * The client's visibility over the weekly checks as a filled line, for a report's cover: from zero, so a
 * rise is drawn at its true size, the latest check marked. `label` says the same for a screen reader.
 */
export function TrendSpark({ values, label, className }: { values: number[]; label: string; className?: string }) {
  const top = Math.max(0.1, ...values) * 1.15;
  const step = values.length > 1 ? (WIDTH - PAD_X * 2) / (values.length - 1) : 0;
  const points = values.map((value, index): [number, number] => [
    PAD_X + index * step,
    PAD_TOP + (1 - value / top) * (HEIGHT - PAD_TOP - PAD_BOTTOM),
  ]);
  const line = smooth(points);
  const last = points.at(-1);
  const first = points[0];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className={cn("h-auto w-full overflow-visible", className)}>
      <defs>
        <linearGradient id="trend-spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--you)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--you)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {last && first && points.length > 1 && (
        <path d={`${line} L${last[0]},${HEIGHT} L${first[0]},${HEIGHT} Z`} fill="url(#trend-spark-fill)" />
      )}
      {points.length > 1 && <path d={line} fill="none" stroke="var(--you)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {last && (
        <>
          <circle cx={last[0]} cy={last[1]} r="7" fill="var(--you)" opacity="0.25" />
          <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--you)" stroke="currentColor" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}
