import { isValidDomain, normalizeDomain } from "@/shared/helpers/domain";
import type { CreateProjectRequest } from "@/shared/types/api";
import { COMPETITOR_SLOTS, EMPTY_BRAND } from "../constants";
import type { DraftErrors, ProjectDraft } from "../types";
import { isFilled, toNewBrand } from "./brand-draft";

export const emptyDraft = (category: string, city: string): ProjectDraft => ({
  brand: EMPTY_BRAND,
  category,
  city,
  competitors: Array(COMPETITOR_SLOTS).fill(EMPTY_BRAND),
});

export function validateBrand({ brand }: ProjectDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!brand.name.trim()) errors.name = "nameRequired";
  if (!isValidDomain(normalizeDomain(brand.domain))) errors.domain = "domainInvalid";
  return errors;
}

/** At least one competitor; a filled-in one needs a name, and its website (optional) must be valid. */
export function validateCompetitors({ competitors }: ProjectDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!competitors.some(isFilled)) errors.competitors = "competitorRequired";
  competitors.forEach((draft, index) => {
    if (!isFilled(draft)) return;
    if (!draft.name.trim()) errors[`competitor-${index}-name`] = "competitorName";
    const domain = normalizeDomain(draft.domain);
    if (domain && !isValidDomain(domain)) errors[`competitor-${index}-domain`] = "domainInvalid";
  });
  return errors;
}

export const toCreateRequest = (draft: ProjectDraft): CreateProjectRequest => ({
  ...toNewBrand(draft.brand),
  category: draft.category,
  city: draft.city,
  competitors: draft.competitors.filter(isFilled).map(toNewBrand),
});
