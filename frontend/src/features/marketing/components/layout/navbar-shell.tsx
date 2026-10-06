"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

/**
 * Sticky header. At the top it's a plain full-width bar; once the page scrolls it becomes a
 * floating "island": narrower, rounded, bordered, nearly solid. It doesn't blur the page behind it:
 * a blur behind a sticky bar is redone on every frame of a scroll, and cost almost half of the
 * graphics card's work while scrolling. The header box keeps its height, so nothing on the page
 * moves (no layout shift).
 */
export function NavbarShell({ children }: { children: React.ReactNode }) {
  const scrolled = useSyncExternalStore(subscribe, () => window.scrollY > 8, () => false);

  return (
    <header data-scrolled={scrolled || undefined} className="group sticky top-0 z-40 h-16">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-8 rounded-2xl border border-transparent px-4 transition-all duration-300 ease-out group-data-scrolled:h-14 group-data-scrolled:w-[calc(100%-1rem)] group-data-scrolled:max-w-5xl group-data-scrolled:translate-y-2.5 group-data-scrolled:border-border group-data-scrolled:bg-background/95 group-data-scrolled:px-3 group-data-scrolled:shadow-lg group-data-scrolled:shadow-black/5 motion-reduce:transition-none sm:px-6 sm:group-data-scrolled:w-[calc(100%-2rem)] sm:group-data-scrolled:px-4">
        {children}
      </div>
    </header>
  );
}
