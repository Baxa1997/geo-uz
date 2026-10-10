"use client";

import { useRouter } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";

/**
 * A table row that opens a page when clicked anywhere on it, and shows the hand cursor to say so. Links
 * and buttons inside keep their own click; the row's own link (to the same address) stays the way in for
 * the keyboard and for "open in a new tab". A click in a menu or window the row opens is drawn outside the
 * table but still reaches the row through React: it is not the row's.
 */
export function LinkRow({ href, tour, className, children }: { href: string; tour?: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr
      data-tour={tour}
      onClick={(event) => {
        if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return;
        if (event.target instanceof Element && event.target.closest("a, button")) return;
        router.push(href);
      }}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </tr>
  );
}
