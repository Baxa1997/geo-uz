import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";

/** Placeholder brand: a lens with a dot ("are you seen?") and the working name. Links home. */
export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  const t = useTranslations("Common");

  return (
    <Link href="/" aria-label={t("home")} className={cn("flex shrink-0 items-center gap-2", className)}>
      <span aria-hidden className="flex size-7 items-center justify-center rounded-lg bg-brand text-brand-foreground">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m12.5 12.5 4 4" strokeLinecap="round" />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </span>
      {!compact && <span className="text-lg font-semibold tracking-tight">GEO</span>}
    </Link>
  );
}
