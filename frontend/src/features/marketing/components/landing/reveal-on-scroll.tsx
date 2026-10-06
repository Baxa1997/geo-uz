"use client";

import { useEffect } from "react";

/**
 * Lets the landing page's [data-reveal] blocks fade and rise in once, the first time each scrolls into
 * view (the styles are in globals.css). Renders nothing: one observer for the whole page. What is on
 * screen when it starts stays as it is; a block that was jumped past (a menu link to a section further
 * down) is marked as arrived without being seen. Does nothing for people who asked for less motion.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const arrive = (block: Element) => block.setAttribute("data-revealed", "");
    const waiting = [...document.querySelectorAll("[data-reveal]")].filter((block) => {
      // Already on screen or above it: seen, or about to be scrolled back to, so it must not blink out
      const seen = block.getBoundingClientRect().top < window.innerHeight;
      if (seen) arrive(block);
      return !seen;
    });
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting && entry.boundingClientRect.top >= 0) continue;
          arrive(entry.target);
          observer.unobserve(entry.target);
        }
      },
      // A block starts to arrive when its top is a little way into the screen, not at the very edge
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const block of waiting) observer.observe(block);
    // From here on, blocks that haven't arrived are hidden
    document.documentElement.setAttribute("data-reveal-ready", "");
    return () => {
      observer.disconnect();
      document.documentElement.removeAttribute("data-reveal-ready");
    };
  }, []);

  return null;
}
