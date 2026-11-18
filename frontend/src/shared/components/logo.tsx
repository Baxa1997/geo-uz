import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";

/** The brand's navy: the tile the mark stands on as an icon (favicon, the phone's home screen). */
export const BRAND_NAVY = "#1c2e6e";

/**
 * The mark's two rounds on a 32 grid: a small one rising above and to the right of a large one (the user,
 * 18 Nov 2026, with Peec's mark as the picture: "the same … but rounds instead"; Peec's is two bars, ours is
 * two rounds, in our own ink and navy). `app/icon.svg`, the favicon and the phone's icon are the same rounds
 * in white on a navy tile.
 */
export const ROUNDS = [
  { cx: 22.5, cy: 8.2, r: 5.2 },
  { cx: 12.2, cy: 21.4, r: 9.6 },
] as const;
/** The rounds' own box, so the mark fills the size it is given. */
const VIEW_BOX = "0.95 2.8 28.4 28.4";

/**
 * Seenova AI (the product's name since 17 Nov 2026): the mark beside the name, in one color, flat; white with
 * `tone="dark"` on a navy or dark ground. Links home.
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
      <LogoMark className={cn(size === "lg" ? "size-7 sm:size-8" : "size-6", tone === "dark" ? "text-white" : "text-foreground")} />
      {!compact && <Wordmark tone={tone} className={size === "lg" ? "text-xl sm:text-2xl" : "text-lg"} />}
    </Link>
  );
}

/** The name as it is written: one color, semibold, tight. */
export function Wordmark({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return <span className={cn("font-semibold tracking-[-0.035em] whitespace-nowrap", tone === "dark" ? "text-white" : "text-foreground", className)}>Seenova AI</span>;
}

/** The mark alone, in the color of the text around it (`text-*` on it or its parent). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox={VIEW_BOX} fill="currentColor" className={cn("shrink-0", className)}>
      {ROUNDS.map((round) => (
        <circle key={round.cx} cx={round.cx} cy={round.cy} r={round.r} />
      ))}
    </svg>
  );
}
