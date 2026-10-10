"use client";

import { Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Hint } from "@/shared/components/hint";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/shared/helpers/utils";

export interface TopicItem {
  /** What the questions' `topic` holds. */
  value: string;
  label: string;
  count: number;
}

/** What's being typed: a new topic, or a new name for one. */
type Editing = { topic: string | null; draft: string; error: string };

/**
 * The topics, laid out like Peec's column: "New topic +" on top, everything, then each topic with its count;
 * picking one narrows the list. A topic's ⋯ (on hover, on focus, always on a touch screen) renames it in
 * place or deletes it; a name is typed in place too, Enter to keep it and Esc to leave it. On the
 * suggestions, the topics only they have come in a group of their own (Peec's "Suggested topics").
 */
export function TopicsColumn({
  items,
  suggested,
  allLabel,
  allCount,
  current,
  onPick,
  onCreate,
  onRename,
  onDelete,
  className,
}: {
  items: TopicItem[];
  /** On the suggestions: the topics the project doesn't have yet. */
  suggested?: TopicItem[];
  allLabel: string;
  allCount: number;
  /** The topic picked; "" for all. */
  current: string;
  onPick: (topic: string) => void;
  /** Each rejects with the message to show when the name can't be kept. */
  onCreate: (name: string) => Promise<void>;
  onRename: (topic: string, name: string) => Promise<void>;
  onDelete: (topic: string) => void;
  className?: string;
}) {
  const t = useTranslations("PromptManager.topicsColumn");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);

  async function keep() {
    if (!editing || saving) return;
    const name = editing.draft.trim();
    if (!name) {
      setEditing({ ...editing, error: t("nameRequired") });
      return;
    }
    if (editing.topic !== null && name === editing.topic) {
      setEditing(null);
      return;
    }
    setSaving(true);
    try {
      await (editing.topic === null ? onCreate(name) : onRename(editing.topic, name));
      setEditing(null);
    } catch (error) {
      setEditing({ ...editing, error: error instanceof Error ? error.message : t("failed") });
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string) =>
    editing && (
      <div className="flex flex-col gap-1 px-2 py-1">
        <input
          aria-label={label}
          autoFocus
          value={editing.draft}
          maxLength={60}
          disabled={saving}
          onChange={(event) => setEditing({ ...editing, draft: event.target.value, error: "" })}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void keep();
            }
            if (event.key === "Escape") setEditing(null);
          }}
          onBlur={() => !saving && !editing.draft.trim() && setEditing(null)}
          placeholder={t("namePlaceholder")}
          className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <p className={cn("px-0.5 text-xs", editing.error ? "text-destructive" : "text-muted-foreground")}>{editing.error || t("keepHint")}</p>
      </div>
    );

  const row = (item: TopicItem, manageable: boolean) => {
    const picked = current === item.value;
    if (editing?.topic === item.value) return <li key={item.value}>{field(t("renameLabel", { name: item.label }))}</li>;
    return (
      <li key={item.value} className="group relative">
        <button
          type="button"
          aria-current={picked ? "true" : undefined}
          onClick={() => onPick(item.value)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            picked ? "bg-muted font-medium" : "text-foreground/85 hover:bg-muted/50",
          )}
        >
          <span className="truncate">{item.label}</span>
          <span className={cn("shrink-0 text-xs text-muted-foreground tabular-nums", manageable && "group-focus-within:invisible group-hover:invisible [@media(hover:none)]:invisible")}>
            {item.count}
          </span>
        </button>
        {manageable && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("menu", { name: item.label })}
              className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity outline-none group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-foreground/10 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <Ellipsis aria-hidden className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem onClick={() => setEditing({ topic: item.value, draft: item.label, error: "" })}>
                <Pencil aria-hidden />
                {t("rename")}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(item.value)}>
                <Trash2 aria-hidden />
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </li>
    );
  };

  return (
    <nav aria-label={t("label")} className={cn("flex min-w-0 flex-col", className)}>
      <p className="flex h-14 shrink-0 items-center border-b px-4 text-sm font-medium">
        <Hint text={t("hint")}>{t("title")}</Hint>
      </p>
      {editing?.topic === null ? (
        <div className="border-b py-1.5">{field(t("newLabel"))}</div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing({ topic: null, draft: "", error: "" })}
          className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 text-sm transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted"
        >
          {t("new")}
          <Plus aria-hidden className="size-4 text-muted-foreground" />
        </button>
      )}
      <div className="flex flex-col gap-3 p-2">
        <button
          type="button"
          aria-current={current === "" ? "true" : undefined}
          onClick={() => onPick("")}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            current === "" ? "bg-muted font-medium" : "text-foreground/85 hover:bg-muted/50",
          )}
        >
          <span className="truncate">{allLabel}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{allCount}</span>
        </button>
        {suggested ? (
          <>
            <TopicGroup title={t("yours")}>{items.map((item) => row(item, true))}</TopicGroup>
            {suggested.length > 0 && (
              <TopicGroup title={t("suggested")} hint={t("suggestedHint")}>
                {suggested.map((item) => row(item, false))}
              </TopicGroup>
            )}
          </>
        ) : (
          <ul className="flex flex-col gap-0.5">{items.map((item) => row(item, true))}</ul>
        )}
      </div>
    </nav>
  );
}

/** A labelled group of topics: the project's own, or those only the suggestions have. */
function TopicGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-2.5 pt-1 text-xs text-muted-foreground">{hint ? <Hint text={hint}>{title}</Hint> : title}</p>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </div>
  );
}
