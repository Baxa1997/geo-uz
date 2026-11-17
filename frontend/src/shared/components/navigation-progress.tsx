"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/helpers/utils";

/** If a click leads nowhere (a link that only scrolls, an aborted navigation), the bar gives up after this. */
const GIVE_UP_MS = 15_000;

/**
 * A thin navy bar across the top of the panel from the click on a link until the new page is there. The
 * server answers a page in a second or more (the backend is far from its database), and until this bar
 * nothing on screen said a click was taken. It runs toward 85% while waiting, then fills and fades.
 */
export function NavigationProgress() {
  const route = `${usePathname()}?${useSearchParams().toString()}`;
  // The page the click was on: while it is still the page shown, the bar runs; once it isn't, it fills
  const [from, setFrom] = useState<string | null>(null);
  // A page with a skeleton (loading.tsx) changes the address at once: it is loaded when the skeleton is gone
  const [skeleton, setSkeleton] = useState(false);
  const loading = from !== null && (from === route || skeleton);
  const finishing = from !== null && !loading;
  // The page shown, for the click handler: compared in the same form as `route`
  const shown = useRef(route);
  useEffect(() => {
    shown.current = route;
  }, [route]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      // Capture phase: Next's links stop the browser's own navigation in theirs, so `defaultPrevented` says nothing
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setFrom(shown.current);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!from) return;
    const look = () => setSkeleton(document.querySelector("[data-skeleton]") !== null);
    look();
    const observer = new MutationObserver(look);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [from]);

  useEffect(() => {
    if (!from) return;
    const done = window.setTimeout(() => setFrom(null), finishing ? 450 : GIVE_UP_MS);
    return () => window.clearTimeout(done);
  }, [from, finishing]);

  return (
    <div aria-hidden className="pointer-events-none sticky top-0 z-50 h-0">
      <div
        className={cn(
          "absolute top-0 left-0 h-0.5 rounded-r-full bg-primary shadow-[0_0_8px_var(--primary)]",
          loading && "w-[85%] animate-[nav-grow_10s_cubic-bezier(0.08,0.7,0.2,1)_backwards] motion-reduce:animate-none",
          finishing && "w-full opacity-0 transition-[width,opacity] duration-200 [transition-delay:0ms,180ms]",
          !from && "w-0 opacity-0",
        )}
      />
    </div>
  );
}
