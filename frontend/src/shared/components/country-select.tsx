"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";
import { Select } from "@/shared/components/ui/select";
import { AUTO_COUNTRY, COUNTRY_CODES } from "@/shared/constants/countries";
import { countryName } from "@/shared/helpers/labels";

/**
 * Every country, by name in the interface's language. 16px text on phones so iOS doesn't zoom. `auto`: a first choice
 * that leaves it to the website (its value `AUTO_COUNTRY`), with this label.
 */
export function CountrySelect({ id, value, onChange, auto }: { id: string; value: string; onChange: (value: string) => void; auto?: string }) {
  const locale = useLocale();
  const countries = useMemo(
    // Sorted by the letters' own order, not `localeCompare`: the server and the browser order Uzbek names
    // differently, and the page then failed to hydrate (seen 16 Nov 2026)
    () => COUNTRY_CODES.map((code) => ({ code, name: countryName(locale, code), key: countryName(locale, code).toLowerCase().replace(/ё/g, "е") })).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)),
    [locale],
  );

  return (
    <Select id={id} value={value} onValueChange={onChange} options={[...(auto ? [{ value: AUTO_COUNTRY, label: auto }] : []), ...countries.map(({ code, name }) => ({ value: code, label: name }))]} />
  );
}
