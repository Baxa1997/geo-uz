"use client";

import { ChevronsUpDown, Pencil, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/shared/helpers/utils";
import { TOPIC_SORTS, type TopicSort } from "../constants";

export interface TopicItem {
  /** What the questions' `topic` holds. */
  value: string;
  label: string;
  count: number;
}

// A topic's row, as Peec's: the name and its count in gray, the topic picked on a gray rounded ground
const ROW =
  "flex h-7 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const PICKED = "bg-foreground/6";
const IDLE = "hover:bg-foreground/4";
const COUNT = "shrink-0 text-sm text-muted-foreground tabular-nums";

/**
 * The topics, laid out like Peec's column: its title (⌃⌄ sorts the topics; Peec's switches to tags, which we
 * leave out), "New topic +", "All topics" with the count, each in a row of its own, then each topic with
 * its count; picking one narrows the list. A topic's pencil (on hover, on focus, always on a touch screen)
 * opens it in a window to rename or delete it, and "New topic" opens the same window empty (TopicDialog,
 * kept by the page). On the suggestions, the topics only they have come in a group of their own (Peec's
 * "Suggested topics"). `folded` is Peec's closed column: ⌃⌄, the count of all, +, then each topic as its
 * count, its name on hover.
 */
export function TopicsColumn({
  items,
  suggested,
  allLabel,
  allCount,
  current,
  sort,
  onSort,
  onPick,
  onNew,
  onEdit,
  folded = false,
  className,
}: {
  items: TopicItem[];
  /** On the suggestions: the topics the project doesn't have yet. */
  suggested?: TopicItem[];
  allLabel: string;
  allCount: number;
  /** The topic picked; "" for all. */
  current: string;
  sort: TopicSort;
  onSort: (sort: TopicSort) => void;
  onPick: (topic: string) => void;
  onNew: () => void;
  onEdit: (topic: string) => void;
  folded?: boolean;
  className?: string;
}) {
  const t = useTranslations("PromptManager.topicsColumn");
  const locale = useLocale();
  const ordered = (list: TopicItem[]) =>
    sort === "name"
      ? [...list].sort((a, b) => a.label.localeCompare(b.label, locale))
      : sort === "count"
        ? [...list].sort((a, b) => b.count - a.count)
        : list;

  const row = (item: TopicItem, manageable: boolean) => {
    const picked = current === item.value;
    return (
      <li key={item.value} className="group relative">
        <button type="button" aria-current={picked ? "true" : undefined} onClick={() => onPick(item.value)} className={cn(ROW, picked ? PICKED : IDLE)}>
          <span className="truncate">{item.label}</span>
          <span className={cn(COUNT, manageable && "group-focus-within:invisible group-hover:invisible [@media(hover:none)]:invisible")}>{item.count}</span>
        </button>
        {manageable && (
          <button
            type="button"
            aria-label={t("dialog.editTitle", { name: item.label })}
            onClick={() => onEdit(item.value)}
            className="absolute top-1/2 right-0.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity outline-none group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-foreground/10 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 [@media(hover:none)]:opacity-100"
          >
            <Pencil aria-hidden className="size-3.5" />
          </button>
        )}
      </li>
    );
  };

  const sortMenu = (
    <DropdownMenuContent align={folded ? "start" : "end"} className="w-60">
      <DropdownMenuRadioGroup value={sort} onValueChange={(value: TopicSort) => onSort(value)}>
        <DropdownMenuLabel>{t("sort.label")}</DropdownMenuLabel>
        {TOPIC_SORTS.map((option) => (
          <DropdownMenuRadioItem key={option} value={option} closeOnClick>
            {t(`sort.${option}`)}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  );

  if (folded) {
    // A count in the rail, the topic's name on hover; the one picked on the gray ground
    const chip = (picked: boolean) =>
      cn(
        "flex h-8 w-10 items-center justify-center rounded-lg text-sm tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        picked ? cn(PICKED, "text-foreground") : cn(IDLE, "text-muted-foreground hover:text-foreground"),
      );
    const countButton = (item: TopicItem) => (
      <li key={item.value}>
        <Hint text={`${item.label} · ${item.count}`} described={false}>
          {() => (
            <button type="button" aria-current={current === item.value ? "true" : undefined} aria-label={`${item.label}: ${item.count}`} onClick={() => onPick(item.value)} className={chip(current === item.value)}>
              {item.count}
            </button>
          )}
        </Hint>
      </li>
    );
    return (
      <nav aria-label={t("label")} className={cn("flex min-w-0 flex-col", className)}>
        <DropdownMenu>
          <Hint text={t("sort.label")} side="bottom" described={false} className="flex border-b">
            {() => (
              <DropdownMenuTrigger
                aria-label={t("sort.label")}
                className="flex h-14 w-full items-center justify-center transition-colors outline-none hover:bg-foreground/4 focus-visible:bg-foreground/6 data-popup-open:bg-foreground/4"
              >
                <ChevronsUpDown aria-hidden className="size-4 text-foreground/70" />
              </DropdownMenuTrigger>
            )}
          </Hint>
          {sortMenu}
        </DropdownMenu>
        <div className="flex h-12 shrink-0 items-center justify-center border-b">
          <Hint text={`${allLabel} · ${allCount}`} described={false}>
            {() => (
              <button type="button" aria-current={current === "" ? "true" : undefined} aria-label={`${allLabel}: ${allCount}`} onClick={() => onPick("")} className={chip(current === "")}>
                {allCount}
              </button>
            )}
          </Hint>
        </div>
        <ul className="flex flex-col items-center gap-0.5 py-2">
          <li>
            <Hint text={t("new")} described={false}>
              {() => (
                <button type="button" aria-label={t("new")} onClick={onNew} className={chip(false)}>
                  <Plus aria-hidden className="size-4" />
                </button>
              )}
            </Hint>
          </li>
          {ordered(items).map(countButton)}
          {suggested && suggested.length > 0 && (
            <>
              <li aria-hidden className="my-1.5 h-px w-6 bg-border" />
              {ordered(suggested).map(countButton)}
            </>
          )}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label={t("label")} className={cn("flex min-w-0 flex-col", className)}>
      <DropdownMenu>
        <Hint text={t("hint")} side="bottom" className="flex border-b">
          {(describedBy) => (
            <DropdownMenuTrigger
              aria-describedby={describedBy}
              className="flex h-14 w-full items-center justify-between gap-2 px-5 text-left text-[0.9375rem] font-semibold transition-colors outline-none hover:bg-foreground/4 focus-visible:bg-foreground/6 data-popup-open:bg-foreground/4"
            >
              {t("title")}
              <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-foreground/70" />
            </DropdownMenuTrigger>
          )}
        </Hint>
        {sortMenu}
      </DropdownMenu>
      <button
        type="button"
        onClick={onNew}
        className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-5 text-sm transition-colors outline-none hover:bg-foreground/4 focus-visible:bg-foreground/6"
      >
        {t("new")}
        <Plus aria-hidden className="size-4 text-foreground/70" />
      </button>
      <div className="border-b px-3 py-1.5">
        <button type="button" aria-current={current === "" ? "true" : undefined} onClick={() => onPick("")} className={cn(ROW, current === "" ? PICKED : IDLE)}>
          <span className="truncate">{allLabel}</span>
          <span className={COUNT}>{allCount}</span>
        </button>
      </div>
      <div className="flex flex-col gap-3 px-3 py-2">
        {suggested ? (
          <>
            <TopicGroup title={t("yours")}>{ordered(items).map((item) => row(item, true))}</TopicGroup>
            {suggested.length > 0 && (
              <TopicGroup title={t("suggested")} hint={t("suggestedHint")}>
                {ordered(suggested).map((item) => row(item, false))}
              </TopicGroup>
            )}
          </>
        ) : (
          <ul className="flex flex-col gap-0.5">{ordered(items).map((item) => row(item, true))}</ul>
        )}
      </div>
    </nav>
  );
}

/** A labelled group of topics: the project's own, or those only the suggestions have. */
function TopicGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-2 pt-1 text-xs text-muted-foreground">{hint ? <Hint text={hint}>{title}</Hint> : title}</p>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </div>
  );
}
