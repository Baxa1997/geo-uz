"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { api, ApiError } from "@/shared/api/client";
import { FACT_MAX_LENGTH } from "@/shared/constants";
import { cn } from "@/shared/helpers/utils";
import type { Plan } from "@/shared/types/api";
import { FIELD, SaveBar, SettingsCard } from "./settings-parts";

/** A fact as saved: single spaces, nothing around it. */
const clean = (fact: string) => fact.trim().replace(/\s+/g, " ");

/** Adds facts that aren't there yet (case aside), up to the plan's limit. */
function addFacts(facts: string[], added: string[], limit: number): string[] {
  const next = [...facts];
  for (const fact of added.map(clean).filter(Boolean)) {
    if (next.length >= limit) break;
    if (!next.some((kept) => kept.toLowerCase() === fact.toLowerCase())) next.push(fact);
  }
  return next;
}

/**
 * The brand facts, as Peec's Settings › Facts: the true statements ChatGPT's answers are checked against
 * (a price, the address, the hours), one a row, numbered, each editable and removable, counted against the
 * plan. A new one is typed under the list; several pasted at once become several rows. "Fill from the
 * website" reads the site and offers what it finds, each to add. Nothing is saved until "Save".
 */
export function FactsEditor({ projectId, initial, limit, plan, wrongFactsHref, planHref }: { projectId: string; initial: string[]; limit: number; plan: Plan; wrongFactsHref: string; planHref: string }) {
  const t = useTranslations("Settings.facts");
  const plans = useTranslations("Plans");
  const id = useId();
  const [saved, setSaved] = useState(initial);
  const [facts, setFacts] = useState(initial);
  const [draft, setDraft] = useState("");
  const [found, setFound] = useState<string[] | null>(null);
  const dirty = JSON.stringify(facts.map(clean).filter(Boolean)) !== JSON.stringify(saved);
  const full = facts.length >= limit;
  const tooLong = facts.some((fact) => clean(fact).length > FACT_MAX_LENGTH);

  const save = useMutation({
    mutationFn: () => api.updateFacts(projectId, { facts: facts.map(clean).filter(Boolean) }),
    onSuccess: (next) => {
      setSaved(next);
      setFacts(next);
    },
  });
  const suggest = useMutation({ mutationFn: () => api.suggestFacts(projectId), onSuccess: setFound });
  const error =
    save.error instanceof ApiError && save.error.status === 409
      ? t("overLimit", { max: limit })
      : save.isError || tooLong
        ? t(tooLong ? "tooLong" : "failed", { max: FACT_MAX_LENGTH })
        : undefined;

  function add(text: string) {
    // A paste of several lines is several facts
    setFacts((current) => addFacts(current, text.split(/\r?\n/), limit));
    setDraft("");
    save.reset();
  }
  const shown = (found ?? []).filter((fact) => !facts.some((kept) => clean(kept).toLowerCase() === fact.toLowerCase()));

  // Start checks no wrong facts, so it keeps no facts: the page says where they come in
  if (limit === 0) {
    return (
      <SettingsCard tour="facts" title={t("title")}>
        <p className="px-4 py-4 text-sm text-pretty sm:px-5">
          {t.rich("notInPlan", { plan: plans(plan), link: (chunks) => <Link href={planHref} className="font-medium underline underline-offset-4">{chunks}</Link> })}
        </p>
      </SettingsCard>
    );
  }

  return (
    <>
      <SettingsCard
        tour="facts"
        title={t("title")}
        description={t.rich("text", { link: (chunks) => <Link href={wrongFactsHref} className="underline underline-offset-4">{chunks}</Link> })}
        actions={
          <>
            <span className={cn("text-sm tabular-nums", full ? "font-medium text-foreground" : "text-muted-foreground")}>{t("count", { count: facts.length, max: limit })}</span>
            <Button variant="outline" className="bg-background" disabled={suggest.isPending} onClick={() => suggest.mutate()}>
              <Sparkles aria-hidden data-icon="inline-start" />
              {suggest.isPending ? t("reading") : t("fromSite")}
            </Button>
          </>
        }
      >
        {facts.length === 0 && <p className="px-4 py-4 text-sm text-pretty text-muted-foreground sm:px-5">{t("empty")}</p>}
        {facts.length > 0 && (
          <ol className="flex flex-col divide-y">
            {facts.map((fact, index) => (
              <li key={index} className="flex items-center gap-3 px-4 py-2 sm:px-5">
                <span aria-hidden className="w-6 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                  {index + 1}.
                </span>
                <label htmlFor={`${id}-${index}`} className="sr-only">
                  {t("factLabel", { number: index + 1 })}
                </label>
                <input
                  id={`${id}-${index}`}
                  value={fact}
                  onChange={(event) => setFacts((current) => current.map((kept, at) => (at === index ? event.target.value : kept)))}
                  aria-invalid={clean(fact).length > FACT_MAX_LENGTH || undefined}
                  className={cn(FIELD, "h-9 border-transparent bg-transparent px-2 hover:border-border focus-visible:border-border focus-visible:bg-background")}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("remove", { number: index + 1 })}
                  onClick={() => setFacts((current) => current.filter((_, at) => at !== index))}
                  className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ol>
        )}
        {full ? (
          <p className="bg-muted/50 px-4 py-3 text-sm text-pretty sm:px-5">{t("full", { max: limit, plan: plans(plan) })}</p>
        ) : (
          <form
            className="flex items-center gap-3 px-4 py-3 sm:px-5"
            onSubmit={(event) => {
              event.preventDefault();
              add(draft);
            }}
          >
            <span aria-hidden className="w-6 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
              {facts.length + 1}.
            </span>
            <label htmlFor={`${id}-new`} className="sr-only">
              {t("newLabel")}
            </label>
            <textarea
              id={`${id}-new`}
              value={draft}
              rows={1}
              placeholder={t("placeholder")}
              onChange={(event) => setDraft(event.target.value)}
              onPaste={(event) => {
                const text = event.clipboardData.getData("text");
                if (!text.includes("\n")) return;
                event.preventDefault();
                add(text);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  add(draft);
                }
              }}
              className={cn(FIELD, "h-9 resize-none py-2")}
            />
            <Button type="submit" variant="outline" className="bg-background" disabled={!clean(draft)}>
              <Plus aria-hidden data-icon="inline-start" />
              {t("add")}
            </Button>
          </form>
        )}
      </SettingsCard>

      {found !== null && (
        <SettingsCard
          tour="found"
          title={t("foundTitle")}
          description={shown.length > 0 ? t("foundText") : t("foundNone")}
          actions={
            shown.length > 1 && !full ? (
              <Button variant="outline" className="bg-background" onClick={() => setFacts((current) => addFacts(current, shown, limit))}>
                {t("addAll")}
              </Button>
            ) : undefined
          }
        >
          {shown.map((fact) => (
            <div key={fact} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
              <p className="min-w-0 flex-1 text-sm text-pretty">{fact}</p>
              <Button variant="outline" size="sm" className="bg-background" disabled={full} onClick={() => setFacts((current) => addFacts(current, [fact], limit))}>
                <Plus aria-hidden data-icon="inline-start" />
                {t("add")}
              </Button>
            </div>
          ))}
        </SettingsCard>
      )}

      <SaveBar
        note={t("saveNote")}
        dirty={dirty}
        saving={save.isPending}
        saved={save.isSuccess}
        error={error}
        onCancel={() => {
          setFacts(saved);
          save.reset();
        }}
        onSave={() => save.mutate()}
      />
    </>
  );
}
