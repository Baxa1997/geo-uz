"use client";

import { useEffect, useState, type RefObject } from "react";

/** Whether the element is on screen, so animations can pause when it isn't. */
export function useInView(ref: RefObject<Element | null>) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return inView;
}
