import { TIME_ZONE } from "@/shared/constants";
import { formatShortDate } from "@/shared/helpers/dates";

/** "25 Nov, 15:21" in Tashkent's time ("25-noy, 15:21" in Uzbek), the same on the server and in every browser. */
export function formatDateTime(iso: string, locale: string): string {
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TIME_ZONE }).format(new Date(iso));
  return `${formatShortDate(iso, locale, TIME_ZONE)}, ${time}`;
}

/** US dollars with cents: "$0.62". */
export const formatUsd = (usd: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(usd);
