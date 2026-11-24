"use client";

import { CircleNotchIcon as Spinner } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { useLinkStatus } from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * A loader in the middle of the screen while the page is fetched again for a new choice: an assistant in the
 * switcher, a filter, a tab (the user, 24 Nov 2026: "when switching from All to any ChatGPT or Gemini there must
 * be a modal loader at least at the center of the page"). The server renders the page over the new choice, which
 * takes a second or two (the database is far), and a choice in the address shows no `loading.tsx`. It appears
 * after 150 ms, as the page skeleton does, so a quick answer doesn't flash it, and stops the page from being
 * clicked meanwhile. Rendered only while something is pending, so only ever in the browser.
 */
export function PendingOverlay({ label }: { label: string }) {
  return createPortal(
    <div role="status" aria-live="polite" className="fixed inset-0 z-50 grid animate-page-in place-items-center bg-background/45 p-4 [animation-delay:150ms]">
      <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-3.5 text-sm font-medium text-foreground shadow-lg">
        {/* It turns while the page loads and stands still under reduced motion, like the page skeleton */}
        <Spinner aria-hidden className="size-5 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />
        {label}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Tells its parent whether the `<Link>` it sits in is navigating (Next's `useLinkStatus` reads that link). The
 * parent draws the loader outside the link: drawn inside, a click on it would reach the link through React.
 */
export function LinkStatus({ onChange }: { onChange: (pending: boolean) => void }) {
  const { pending } = useLinkStatus();
  useEffect(() => onChange(pending), [pending, onChange]);
  return null;
}
