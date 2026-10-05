import { normalizeDomain } from "@/shared/helpers/domain";
import type { NewBrand } from "@/shared/types/api";
import type { BrandDraft } from "../types";

/** "Ok Tabassum, Ок Табассум" → ["Ok Tabassum", "Ок Табассум"] */
export const parseAliases = (value: string) => [
  ...new Set(value.split(/[,\n]/).map((alias) => alias.trim()).filter(Boolean)),
];

export const isFilled = (draft: BrandDraft) =>
  Boolean(draft.name.trim() || draft.domain.trim() || draft.aliases.trim());

export const toNewBrand = (draft: BrandDraft): NewBrand => ({
  name: draft.name.trim(),
  aliases: parseAliases(draft.aliases),
  domain: normalizeDomain(draft.domain),
});
