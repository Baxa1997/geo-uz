// Chrome, including Android, ships no Uzbek month names: Intl gives "2026 M09 28".
const UZ_MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

/** Long date that looks the same on the server and in every browser: "28-sentabr, 2026". */
export function formatLongDate(iso: string, locale: string, timeZone: string): string {
  const date = new Date(iso);
  if (locale !== "uz") return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone }).format(date);
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return `${part("day")}-${UZ_MONTHS[part("month") - 1]}, ${part("year")}`;
}

/** A month for chart axes ("sen") or with its year for headings ("Sentabr, 2026"), the same on the server and in every browser. */
export function formatMonth(iso: string, locale: string, timeZone: string, style: "short" | "long"): string {
  const date = new Date(iso);
  if (locale !== "uz") {
    return new Intl.DateTimeFormat(locale, style === "short" ? { month: "short", timeZone } : { month: "long", year: "numeric", timeZone }).format(date);
  }
  const parts = new Intl.DateTimeFormat("en-US", { month: "numeric", year: "numeric", timeZone }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const month = UZ_MONTHS[part("month") - 1] ?? "";
  return style === "short" ? month.slice(0, 3) : `${month.charAt(0).toUpperCase()}${month.slice(1)}, ${part("year")}`;
}

/** "2026-09-28" in the given time zone: the date spreadsheets sort and read the same everywhere. */
export const formatIsoDay = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(iso));

const UZ_WEEKDAYS = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];

/** Date with its weekday, without the year, for what's coming up: "5-oktabr, dushanba" in Uzbek. */
export function formatWeekdayDate(iso: string, locale: string, timeZone: string): string {
  const date = new Date(iso);
  if (locale !== "uz") {
    return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone }).format(date);
  }
  const parts = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "numeric", timeZone }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  // The weekday in Tashkent, not in the server's time zone
  const day = new Date(new Intl.DateTimeFormat("en-CA", { timeZone }).format(date)).getUTCDay();
  return `${part("day")}-${UZ_MONTHS[part("month") - 1]}, ${UZ_WEEKDAYS[day]}`;
}

/** Day and short month for chart axes and tables: "28-sen" in Uzbek. */
export function formatShortDate(iso: string, locale: string, timeZone: string): string {
  const date = new Date(iso);
  if (locale !== "uz") return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone }).format(date);
  const parts = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "numeric", timeZone }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return `${part("day")}-${UZ_MONTHS[part("month") - 1]?.slice(0, 3)}`;
}
