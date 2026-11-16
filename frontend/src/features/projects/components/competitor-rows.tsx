"use client";

import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { XIcon as X } from "@phosphor-icons/react/dist/ssr/X";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { isValidDomain, normalizeDomain } from "@/shared/helpers/domain";
import { EMPTY_BRAND, MAX_COMPETITORS } from "../constants";
import { isFilled } from "../helpers/brand-draft";
import { manualProblems } from "../helpers/onboarding";
import type { BrandDraft, CompetitorChoice, OnboardingErrors } from "../types";

/** The site's own icon, read from the site itself; the name's first letter until it loads, and when it has none. */
function SiteMark({ name, domain, logo }: { name: string; domain: string; /** The icon found with the website, tried first. */ logo?: string }) {
  const site = normalizeDomain(domain);
  // The address that didn't load: the found icon first, then the site's /favicon.ico, then the letter stays
  const [failed, setFailed] = useState<string[]>([]);
  const letter = (
    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold uppercase">
      {name.trim().charAt(0) || "?"}
    </span>
  );
  const source = [logo, isValidDomain(site) ? `https://${site}/favicon.ico` : undefined].find((address) => address && !failed.includes(address));
  if (!source) return letter;
  return (
    <span aria-hidden className="relative flex size-8 shrink-0">
      {letter}
      {/* A small image from any business's site: next/image would need every host listed */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={source} src={source} alt="" onError={() => setFailed((list) => [...list, source])} className="absolute inset-0 size-8 rounded-lg bg-background object-contain p-1" />
    </span>
  );
}

/**
 * The first check's competitors (the user's picture, 16 Nov 2026): one row each, the site's icon, the name,
 * its website to correct, ✕ to remove, and a row to add one; five at most, none is fine. The rows are the
 * choice's `manual` list, so the wizard's checks and request apply as they are.
 */
export function CompetitorRows({ id, rows, logos = {}, errors, onChange }: { id: string; rows: BrandDraft[]; /** Website → the icon found with it. */ logos?: Record<string, string>; errors: OnboardingErrors; onChange: (rows: BrandDraft[]) => void }) {
  const t = useTranslations("Onboarding");
  const choice: CompetitorChoice = { suggestions: [], selected: [], manual: rows };
  const count = rows.filter(isFilled).length;
  const full = rows.length >= MAX_COMPETITORS;
  // Shown once "Next" found something wrong, until the next edit
  const checked = Boolean(errors.manualName || errors.manualDomain);
  const set = (index: number, patch: Partial<BrandDraft>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  function add() {
    onChange([...rows, EMPTY_BRAND]);
    requestAnimationFrame(() => document.getElementById(`${id}-rival-${rows.length}-name`)?.focus());
  }

  return (
    <>
      <p className="flex items-baseline justify-between gap-3 text-sm font-medium">
        {t("competitorsRows")}
        <span aria-live="polite" className="font-normal text-muted-foreground tabular-nums">
          <span className="font-medium text-foreground">{count}</span>/{MAX_COMPETITORS}
        </span>
      </p>

      {rows.length === 0 && <p className="text-sm text-pretty text-muted-foreground">{t("competitorsNone")}</p>}

      <ul className="flex flex-col gap-2">
        {rows.map((row, index) => {
          const problems = checked ? manualProblems(choice, index) : {};
          const problem = problems.name ?? problems.domain;
          return (
            <li key={index} className="flex flex-col gap-1.5 rounded-xl border px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <SiteMark name={row.name} domain={row.domain} logo={logos[normalizeDomain(row.domain)]} />
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_11rem]">
                  <Input
                    id={`${id}-rival-${index}-name`}
                    value={row.name}
                    onChange={(e) => set(index, { name: e.target.value })}
                    placeholder={t("manualName")}
                    aria-label={t("manualName")}
                    aria-invalid={Boolean(problems.name)}
                    className="h-9 font-medium"
                  />
                  <Input
                    value={row.domain}
                    onChange={(e) => set(index, { domain: e.target.value })}
                    placeholder={t("websitePlaceholder")}
                    aria-label={t("manualDomain")}
                    aria-invalid={Boolean(problems.domain)}
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="h-9"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}
                  aria-label={t("removeNamed", { name: row.name.trim() || t("manualTitle") })}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </div>
              {problem && (
                <p role="alert" className="pl-[2.625rem] text-sm text-destructive">
                  {t(problem)}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={add}
        disabled={full}
        className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus aria-hidden className="size-4" />
        {full ? t("competitorsRowsFull", { max: MAX_COMPETITORS }) : t("addManually")}
      </button>
      <p className="text-xs text-pretty text-muted-foreground">{t("competitorsRowsNote")}</p>
    </>
  );
}
