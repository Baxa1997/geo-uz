import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

/** "Answers →": leads to the page with the full picture, e.g. from a card's header. */
export function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-md text-sm font-medium whitespace-nowrap text-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline"
    >
      {children}
      <ArrowRight aria-hidden className="size-3.5" />
    </Link>
  );
}
