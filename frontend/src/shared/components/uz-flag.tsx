import { cn } from "@/shared/helpers/utils";

/** Uzbekistan's flag in a circle, as Peec marks a question's country: its three bands and the thin red lines between them. */
export function UzFlag({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex size-4 shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/10", className)}>
      <svg viewBox="0 0 16 16" preserveAspectRatio="none" className="size-full">
        <rect width="16" height="5.4" fill="#0099b5" />
        <rect y="5.4" width="16" height="0.5" fill="#ce1126" />
        <rect y="5.9" width="16" height="4.2" fill="#ffffff" />
        <rect y="10.1" width="16" height="0.5" fill="#ce1126" />
        <rect y="10.6" width="16" height="5.4" fill="#1eb53a" />
      </svg>
    </span>
  );
}
