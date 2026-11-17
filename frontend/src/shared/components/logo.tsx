import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";

/** The brand's colors: navy for the tile and the iris, gold for the nova. Fixed, whatever the theme. */
export const BRAND_NAVY = "#1c2e6e";
export const BRAND_NOVA = "#f6c453";

/**
 * Seenova AI (the product's name since 17 Nov 2026). The mark beside the name, "Seenova" in bold and "AI"
 * lighter, in blue; `tone="dark"` on a navy or dark ground. Links home.
 */
export function Logo({
  compact = false,
  size = "md",
  tone = "light",
  className,
}: {
  compact?: boolean;
  size?: "md" | "lg";
  tone?: "light" | "dark";
  className?: string;
}) {
  const t = useTranslations("Common");

  return (
    // No prefetch: on the landing page it would download the page itself, and in the app nobody is about to leave
    <Link href="/" prefetch={false} aria-label={t("home")} className={cn("flex shrink-0 items-center", size === "lg" ? "gap-2.5" : "gap-2", className)}>
      {/* "lg" (the landing page's header) a step smaller on a phone: the name is longer than GEO was */}
      <LogoMark className={size === "lg" ? "size-8 sm:size-9" : "size-7"} />
      {!compact && <Wordmark tone={tone} className={size === "lg" ? "text-xl sm:text-2xl" : "text-lg"} />}
    </Link>
  );
}

/** The name as it is written: "Seenova" in bold, "AI" in a lighter weight and the brand's blue. */
export function Wordmark({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <span className={cn("font-bold tracking-[-0.03em] whitespace-nowrap", tone === "dark" ? "text-white" : "text-foreground", className)}>
      Seenova<span className={cn("ml-[0.22em] font-semibold", tone === "dark" ? "text-[#9fb4ff]" : "text-[#3f63c8]")}>AI</span>
    </span>
  );
}

/**
 * The mark: an eye whose pupil is a star. "See" and "nova", a star that suddenly shines: a business that
 * becomes visible in AI's answers. A white eye on a navy tile, the iris navy, the nova gold; at 16px it
 * still reads as an eye. In its own colors on any ground (`app/icon.svg` and the favicon are the same drawing).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={cn("shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill={BRAND_NAVY} />
      <path d={EYE} fill="#fff" />
      <circle cx="16" cy="16" r="5.3" fill={BRAND_NAVY} />
      <path d={NOVA} fill={BRAND_NOVA} />
    </svg>
  );
}

/** The eye's outline and the four-pointed star, on the mark's 32 grid; drawn large and faint on dark panels too. */
export const EYE = "M4.6 16C8.2 10.9 12 8.9 16 8.9S23.8 10.9 27.4 16C23.8 21.1 20 23.1 16 23.1S8.2 21.1 4.6 16Z";
export const NOVA = "M16 12.2Q16.55 15.45 19.8 16Q16.55 16.55 16 19.8Q15.45 16.55 12.2 16Q15.45 15.45 16 12.2Z";
