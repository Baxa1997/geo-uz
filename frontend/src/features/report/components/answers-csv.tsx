"use client";

import { useTranslations } from "next-intl";
import { CsvButton } from "@/shared/components/csv-button";
import type { Brand, Wave } from "@/shared/types/api";
import { orderedAnswers } from "../helpers/evidence";

/**
 * The check's buyer answers as a CSV (report spec §4.13, Phase 0 item 0.5), made in the browser from the data
 * object, so it works from the report's link: each answer's number, question, language, topic, assistant and
 * model, date, whether it searched the web, whether it names the client, the tracked brands it names, the
 * pages it cites and its whole text.
 */
export function AnswersCsv({ wave, brands, youId }: { wave: Wave; brands: Brand[]; youId: string }) {
  const t = useTranslations("Report.evidence.csv");
  const names = new Map(brands.map((brand) => [brand.id, brand.name]));
  const prompts = new Map(wave.prompts.map((prompt) => [prompt.id, prompt]));
  const date = wave.wave.collected_at.slice(0, 10);

  const rows = () => [
    [t("number"), t("question"), t("language"), t("topic"), t("assistant"), t("model"), t("date"), t("searched"), t("client"), t("brands"), t("cited"), t("text")],
    ...orderedAnswers(wave).map((answer, index) => {
      const prompt = prompts.get(answer.prompt_id);
      const named = [...new Set(answer.mentions.flatMap((mention) => (mention.brand_id && names.has(mention.brand_id) ? [names.get(mention.brand_id) as string] : [])))];
      return [
        `A${index + 1}`,
        prompt?.text ?? "",
        answer.lang,
        prompt?.topic ?? "",
        answer.engine,
        answer.model ?? "",
        answer.collected_at,
        t(answer.searched ? "yes" : "no"),
        t(answer.mentions.some((mention) => mention.brand_id === youId) ? "yes" : "no"),
        named.join("; "),
        answer.citations.map((citation) => citation.url).join(" "),
        answer.text,
      ];
    }),
  ];

  return <CsvButton filename={`seenova-answers-${date}.csv`} label={t("label")} hint={t("hint")} rows={rows} className="print:hidden" />;
}
