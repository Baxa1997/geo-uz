import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";

/** One of the overview's numbers: what it counts, the number, and a line under it; a link when it has a page. */
export function StatCard({ label, value, note, href, alert = false }: { label: string; value: React.ReactNode; note?: React.ReactNode; href?: string; alert?: boolean }) {
  const body = (
    <>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-2xl font-semibold tracking-tight tabular-nums", alert && "text-brand")}>{value}</span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </>
  );
  const frame = "flex flex-col gap-1 rounded-xl border bg-card px-4 py-3";
  return href ? (
    <Link href={href} className={cn(frame, "transition-colors hover:bg-muted/40")}>
      {body}
    </Link>
  ) : (
    <div className={frame}>{body}</div>
  );
}
