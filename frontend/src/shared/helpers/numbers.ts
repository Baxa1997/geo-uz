// For components that render both on the server and in the browser. Chrome ships no Uzbek
// number formats and falls back to its own language, so next-intl's formatter gives "1,8" on
// the server and "1.8" in the browser, and hydration fails. These give the same text on both.

/** "1,8" (uz, ru) or "1.8" (en). Russian writes decimals the way Uzbek does. */
export const formatDecimal = (value: number, locale: string) =>
  new Intl.NumberFormat(locale === "uz" ? "ru" : locale, { maximumFractionDigits: 1 }).format(value);

/** 0.67 → "67%". */
export const formatPercent = (value: number, locale: string) =>
  locale === "uz"
    ? `${Math.round(value * 100)}%`
    : new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(value);
