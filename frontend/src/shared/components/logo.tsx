import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";

/**
 * Our mark: an assistant's answer as three lines of text, one of them bright among the faint ones, the line
 * that names you. Beside it the working name. Links home.
 */
export function Logo({ compact = false, size = "md", className }: { compact?: boolean; size?: "md" | "lg"; className?: string }) {
  const t = useTranslations("Common");

  return (
    // No prefetch: on the landing page it would download the page itself, and in the app nobody is about to leave
    <Link href="/" prefetch={false} aria-label={t("home")} className={cn("flex shrink-0 items-center", size === "lg" ? "gap-2.5" : "gap-2", className)}>
      <LogoMark className={size === "lg" ? "size-9" : "size-7"} />
      {!compact && <span className={cn("font-bold tracking-tight", size === "lg" ? "text-2xl" : "text-lg")}>GEO</span>}
    </Link>
  );
}

/** The mark alone, in its own colors on any ground. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 28 28" className={cn("shrink-0", className)}>
      <rect width="28" height="28" rx="7" fill="#1c2e6e" />
      <g strokeWidth="3" strokeLinecap="round">
        <path d="M7.5 8.5h13" stroke="#fff" strokeOpacity="0.45" />
        <path d="M7.5 14h9" stroke="#fff" />
        <path d="M7.5 19.5h11" stroke="#fff" strokeOpacity="0.45" />
      </g>
    </svg>
  );
}
