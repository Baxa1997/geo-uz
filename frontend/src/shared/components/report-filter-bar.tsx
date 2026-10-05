"use client";

import { Languages, Tag, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMessages, useTranslations } from "next-intl";
import { useTransition } from "react";
import { FilterMenu } from "@/shared/components/filter-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { PROMPT_LANGUAGES } from "@/shared/constants";
import { labelFor } from "@/shared/helpers/labels";
import { FILTER_PARAMS } from "@/shared/helpers/report-filters";
import { cn } from "@/shared/helpers/utils";

/**
 * Language and topic filters of a project's data pages, as a row of dropdown chips. They live in the
 * URL (?lang=&topic=), so the server renders the filtered report and the choice follows the user
 * between pages.
 */
export function ReportFilterBar({
  topics,
  topicFilter = true,
  className,
}: {
  topics: string[];
  /** Off where the page picks topics itself (the Questions page's topics column). */
  topicFilter?: boolean;
  className?: string;
}) {
  const t = useTranslations("Filters");
  const languages = useTranslations("Locales");
  const messages = useMessages();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const language = PROMPT_LANGUAGES.find((code) => code === params.get(FILTER_PARAMS.language)) ?? "";
  const topic = topics.includes(params.get(FILTER_PARAMS.topic) ?? "") ? (params.get(FILTER_PARAMS.topic) ?? "") : "";

  function apply(changes: Record<string, string>) {
    const query = { ...Object.fromEntries(params), ...changes };
    for (const key of Object.keys(query)) if (!query[key]) delete query[key];
    startTransition(() => router.replace({ pathname, query }, { scroll: false }));
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      aria-busy={pending}
      className={cn("flex flex-wrap items-center gap-2 transition-opacity", pending && "opacity-60", className)}
    >
      <FilterMenu
        icon={Languages}
        label={t("language")}
        value={language}
        options={[{ value: "", label: t("allLanguages") }, ...PROMPT_LANGUAGES.map((code) => ({ value: code, label: languages(code) }))]}
        onChange={(value) => apply({ [FILTER_PARAMS.language]: value })}
      />
      {topicFilter && (
      <FilterMenu
        icon={Tag}
        label={t("topic")}
        value={topic}
        options={[{ value: "", label: t("allTopics") }, ...topics.map((code) => ({ value: code, label: labelFor(messages.Topics, code) }))]}
        onChange={(value) => apply({ [FILTER_PARAMS.topic]: value })}
      />
      )}

      {(language || (topicFilter && topic)) && (
        <button
          type="button"
          onClick={() => apply({ [FILTER_PARAMS.language]: "", [FILTER_PARAMS.topic]: "" })}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <X aria-hidden className="size-3.5" />
          {t("reset")}
        </button>
      )}
    </div>
  );
}
