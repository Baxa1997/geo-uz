import { DEFAULT_COUNTRY } from "@/shared/constants/countries";
import { COUNTRY_NAMES } from "@/shared/constants/country-names";

/** Translated label for a code from the API (category, city, topic), or the code itself. */
export const labelFor = (dictionary: Record<string, string>, key: string) => dictionary[key] ?? key;

/** A country's name in the interface's language ("UZ" → "Oʻzbekiston"); the code itself for one we don't list. */
export const countryName = (locale: string, code: string) => (COUNTRY_NAMES[locale] ?? COUNTRY_NAMES.en)[code] ?? code;

/** Where a business works, in a line: its city, or its country when it serves the whole of it. */
export const placeLabel = (cities: Record<string, string>, locale: string, place: { city: string; country?: string }) =>
  place.city ? labelFor(cities, place.city) : countryName(locale, place.country || DEFAULT_COUNTRY);
