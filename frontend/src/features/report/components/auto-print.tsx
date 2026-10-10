"use client";

import { useEffect } from "react";

/** Opens the print window once the report has drawn: Hisobotlar's "PDF" opens the report with `?print=1`. */
export function AutoPrint() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 700);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
