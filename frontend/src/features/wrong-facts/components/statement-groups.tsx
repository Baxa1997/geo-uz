"use client";

import { CheckCircleIcon as CircleCheck } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { QuestionIcon as CircleHelp } from "@phosphor-icons/react/dist/ssr/Question";
import { CaretDownIcon as ChevronDown } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/shared/helpers/utils";
import { byTopic, type Statement } from "../helpers/statements";

const MARKS = {
  unverified: { icon: CircleHelp, color: "text-progress" },
  confirmed: { icon: CircleCheck, color: "text-positive" },
} as const;

/**
 * Statements of one standing (not on the website, or matching it), grouped by topic: each with the
 * assistants that said it. Folded to the first `shown` until opened, so a long list of what's right
 * doesn't push the rest of the page down.
 */
export function StatementGroups({ statements, kind, shown }: { statements: Statement[]; kind: keyof typeof MARKS; shown: number }) {
  const t = useTranslations("WrongFactsPage");
  const topics = useTranslations("Report.assistants.topics");
  const locale = useLocale() as "uz" | "ru" | "en";
  const [open, setOpen] = useState(false);
  const Icon = MARKS[kind].icon;
  // Folded: the first `shown` statements, keeping their topics' order
  const { groups } = byTopic(statements).reduce<{ groups: ReturnType<typeof byTopic>; left: number }>(
    (taken, group) =>
      taken.left <= 0
        ? taken
        : { groups: [...taken.groups, { ...group, statements: group.statements.slice(0, taken.left) }], left: taken.left - group.statements.length },
    { groups: [], left: open ? Infinity : shown },
  );

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <ul className="flex flex-col divide-y">
        {groups.map((group) => (
          <li key={group.topic} className="grid gap-x-5 gap-y-2 px-4 py-3.5 sm:px-5 @2xl:grid-cols-[9rem_minmax(0,1fr)]">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase @2xl:pt-0.5">{topics(group.topic)}</span>
            <ul className="flex flex-col gap-2.5">
              {group.statements.map((statement) => (
                <li key={statement.text.en || statement.text[locale]} className="flex items-start gap-2.5 text-sm">
                  <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", MARKS[kind].color)} />
                  <span className="min-w-0 flex-1 text-pretty">
                    {statement.text[locale]}
                    <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                      {statement.engines.map((engine) => (
                        <span key={engine} className="rounded-md border px-1.5 text-[0.6875rem] leading-5 font-medium text-muted-foreground">
                          {engine}
                        </span>
                      ))}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {statements.length > shown && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-center gap-1.5 border-t px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          {open ? t("showLess") : t("showAll", { count: statements.length })}
        </button>
      )}
    </div>
  );
}
