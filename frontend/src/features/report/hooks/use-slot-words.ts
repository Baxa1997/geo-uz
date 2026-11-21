import { useLocale, useTranslations } from "next-intl";
import { countryName } from "@/shared/helpers/labels";
import type { Wave, WaveLocation, WaveSlot } from "@/shared/types/api";

/** Each answer's slot in the check's slot log, by the answer's id. */
export function slotsByAnswer(wave: Wave): Map<string, WaveSlot> {
  return new Map(wave.slots.flatMap((slot) => (slot.answer_id ? [[slot.answer_id, slot] as const] : [])));
}

/**
 * Where an assistant's answers come from and what it was told of the customer's place, in the scope card's words:
 * the scope card says them of an assistant (report spec §4.0), each evidence card of its own answer (spec rule 3,
 * §4.13). "API with web search"; "asked as from Tashkent, Uzbekistan", "told the place only in its instructions
 * (…)", or "asked with no location".
 */
export function useSlotWords() {
  const t = useTranslations("Report.scope");
  const locale = useLocale();
  const where = (location: WaveLocation) => {
    const country = location.country ? countryName(locale, location.country) : "";
    return location.city ? t("cityCountry", { city: location.city, country }) : t("noCity", { country });
  };
  return {
    surface: (surface: string | null | undefined) => (surface ? t(`surfaces.${surface === "api_grounded" ? "api_grounded" : "api_web_search"}`) : null),
    located: (location: WaveLocation | null | undefined) =>
      !location || !location.how ? t("notLocated") : location.how === "instruction" ? t("toldInInstructions", { place: where(location) }) : t("located", { place: where(location) }),
  };
}
