"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";
import { NativeSelect, NativeSelectOption } from "@/shared/components/ui/native-select";
import { COUNTRY_CODES } from "@/shared/constants/countries";
import { countryName } from "@/shared/helpers/labels";

/** Every country, by name in the interface's language. 16px text on phones so iOS doesn't zoom. */
export function CountrySelect({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const locale = useLocale();
  const countries = useMemo(
    // Sorted by the letters' own order, not `localeCompare`: the server and the browser order Uzbek names
    // differently, and the page then failed to hydrate (seen 16 Nov 2026)
    () => COUNTRY_CODES.map((code) => ({ code, name: countryName(locale, code), key: countryName(locale, code).toLowerCase().replace(/ё/g, "е") })).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)),
    [locale],
  );

  return (
    <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full [&_select]:h-10 [&_select]:text-base md:[&_select]:text-sm">
      {countries.map(({ code, name }) => (
        <NativeSelectOption key={code} value={code}>
          {name}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
