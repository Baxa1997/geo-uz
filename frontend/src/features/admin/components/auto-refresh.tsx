"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/** Asks the server for the page again every `every` ms while it is open: a running check's answers count up. */
export function AutoRefresh({ every }: { every: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), every);
    return () => window.clearInterval(timer);
  }, [every, router]);
  return null;
}
