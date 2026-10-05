import { cn } from "@/shared/helpers/utils";

/** Small uppercase monospace label: time chips, column titles, card taglines. */
export function MonoLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[0.7rem] font-medium tracking-wider uppercase", className)}>{children}</span>
  );
}
