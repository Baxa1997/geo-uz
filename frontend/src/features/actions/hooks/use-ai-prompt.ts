import { useLocale, useMessages, useTranslations } from "next-intl";
import { listingKind } from "@/shared/components/actions/action-title";
import { labelFor, placeLabel } from "@/shared/helpers/labels";
import type { Action, Project, PromptLanguage } from "@/shared/types/api";
import type { SitePages } from "../components/action-panel";

/** What the business is, for the prompt: the profile as the project keeps it. */
export type PromptProfile = Pick<Project, "category" | "city" | "country" | "description" | "services" | "languages">;

/**
 * Who the prompt is for: a coding AI or a developer working in the site's code (a site fix), or a writing
 * assistant such as Claude or ChatGPT (a page, a correction, a listing's profile, post or letter).
 */
export type PromptTarget = "code" | "page" | "fact" | "directory" | "news" | "social" | "other";

/** How many of the pages AI read on a listing's site the prompt names. */
const PAGES_NAMED = 3;

/**
 * An action as a task to paste into the owner's own AI (the user, 17 Nov 2026: "make a prompt for the user
 * that can be collapsed or copied and put into their Claude or coding AI … or the post can be just
 * recommended"). Written from the action's own data and the business's profile, in the interface's language;
 * the result is asked for in the languages of the business's customers. The AI is told never to invent a
 * fact: where one is missing it writes [TO FILL]. A site fix ends with how to check it is done.
 */
export function useAiPrompt({
  brand,
  profile,
  competitors,
  sites,
}: {
  brand: { name: string; domain: string };
  profile: PromptProfile;
  competitors: Map<string, string>;
  sites: Record<string, SitePages>;
}) {
  const t = useTranslations("Actions.aiPrompt");
  const messages = useMessages();
  const locale = useLocale();
  const category = labelFor(messages.Categories, profile.category);
  const place = placeLabel(messages.Cities, locale, profile);
  const languages: PromptLanguage[] = profile.languages.length > 0 ? profile.languages : ["uz", "ru"];
  const inLanguages = t("inLanguages", { count: languages.length, langs: languages.map((language) => t(`lang.${language}`)).join(t("and")) });
  const about = [
    t("about", { brand: brand.name, domain: brand.domain, category, place }),
    profile.description,
    profile.services.length > 0 ? t("services", { services: profile.services.join(", ") }) : "",
  ]
    .filter(Boolean)
    .join(" ");
  const list = (items: string[]) => items.map((item) => `- ${item}`);

  return (action: Action, asked: string[]): { target: PromptTarget; text: string } => {
    const questions = asked.length > 0 ? [t("questions"), ...list(asked)] : [];
    const noInventing = t("noInventing", { brand: brand.name, domain: brand.domain });

    switch (action.kind) {
      case "technical": {
        const check = action.check;
        return {
          target: "code",
          text: [
            t("code.intro", { domain: brand.domain, brand: brand.name, category, place }),
            t(`code.${check}.task`),
            "",
            ...[1, 2, 3].map((step) => `${step}. ${t(`code.${check}.s${step}` as "code.ai_bots_blocked.s1", { domain: brand.domain, category, place, languages: inLanguages })}`),
            "",
            t("code.done", { check: t(`code.${check}.done`, { domain: brand.domain }) }),
            t("code.careful"),
          ].join("\n"),
        };
      }
      case "content": {
        const rework = action.url !== null || action.pageType !== null;
        const brief = action.brief;
        return {
          target: "page",
          text: [
            rework ? t("page.rework", { url: action.url ?? brand.domain, topic: labelFor(messages.Topics, action.topic) }) : t("page.write", { domain: brand.domain, topic: labelFor(messages.Topics, action.topic) }),
            about,
            "",
            ...questions,
            ...(brief
              ? [
                  "",
                  t("page.brief"),
                  `- ${t("page.headlines")}: ${brief.headlines.join(" / ")}`,
                  `- ${t("page.metaTitle")}: ${brief.metaTitle}`,
                  `- ${t("page.metaDescription")}: ${brief.metaDescription}`,
                  `- ${t("page.argue")}: ${brief.argue}`,
                  `- ${t("page.proof")}: ${brief.proofPoints.join("; ")}`,
                ]
              : []),
            "",
            t("page.rules"),
            ...list([t("page.r1", { languages: inLanguages }), t("page.r2"), t("page.r3"), noInventing, t("page.r5")]),
          ].join("\n"),
        };
      }
      case "fact":
        return {
          target: "fact",
          text: [
            // Quoted inside a sentence: their own closing stop would double the sentence's
            t("fact.said", { brand: brand.name, domain: brand.domain, claim: action.claim.replace(/[.!]\s*$/, ""), correct: action.correct.replace(/[.!]\s*$/, "") }),
            about,
            "",
            ...[1, 2, 3].map((step) => `${step}. ${t(`fact.s${step}` as "fact.s1", { languages: inLanguages })}`),
            noInventing,
          ].join("\n"),
        };
      case "listing": {
        const kind = listingKind(action.sourceType);
        const named = action.competitorIds.flatMap((id) => competitors.get(id) ?? []);
        const pages = (sites[action.domain]?.pages ?? [])
          .slice()
          .sort((a, b) => b.count - a.count)
          .slice(0, PAGES_NAMED)
          .map((page) => (page.title ? `${page.title} — ${page.url}` : page.url));
        return {
          target: kind,
          text: [
            t(`listing.${kind}.task`, { domain: action.domain }),
            t("listing.about", { about }),
            ...(named.length > 0 ? [t("listing.competitors", { domain: action.domain, names: named.join(", ") })] : []),
            ...(pages.length > 0 ? ["", t("listing.pages", { domain: action.domain }), ...list(pages)] : []),
            "",
            ...questions,
            "",
            t(`listing.${kind}.write`, { domain: action.domain, languages: inLanguages, brand: brand.name }),
            noInventing,
          ].join("\n"),
        };
      }
    }
  };
}
