import { cn } from "@/shared/helpers/utils";

/** An on/off switch, as Peec's: a gray pill whose knob slides right, and the pill darkens, when it is on. */
export function Switch({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** What it turns on, for a screen reader. */
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        checked ? "bg-foreground" : "bg-foreground/15",
        className,
      )}
    >
      <span aria-hidden className={cn("size-4 rounded-full bg-background shadow-sm transition-transform motion-reduce:transition-none", checked ? "translate-x-4.5" : "translate-x-0.5")} />
    </button>
  );
}
