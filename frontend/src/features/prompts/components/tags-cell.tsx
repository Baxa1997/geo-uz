"use client";

import { Popover } from "@base-ui/react/popover";
import { Check, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/shared/helpers/utils";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * A question's tags, as Peec's column: its tags as chips, then "+ Add tags" (a "+" once it has some). That
 * opens a small window: typing finds a tag among the project's or makes a new one (Enter), and a click
 * ticks a tag on the question or off. Each change is saved at once.
 */
export function TagsCell({
  tags,
  allTags,
  question,
  onChange,
}: {
  tags: string[];
  /** Every tag the project's questions carry, for picking. */
  allTags: string[];
  /** The question's text, for screen readers. */
  question: string;
  onChange: (tags: string[]) => void;
}) {
  const t = useTranslations("PromptManager.tags");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const typed = draft.trim().replace(/\s+/g, " ");
  const has = (tag: string) => tags.some((own) => same(own, tag));
  const shown = allTags.filter((tag) => !typed || tag.toLowerCase().includes(typed.toLowerCase()));
  const isNew = typed !== "" && !allTags.some((tag) => same(tag, typed));

  function toggle(tag: string) {
    onChange(has(tag) ? tags.filter((own) => !same(own, tag)) : [...tags, tag]);
  }

  function addTyped() {
    if (!typed) return;
    const existing = allTags.find((tag) => same(tag, typed));
    if (!has(existing ?? typed)) onChange([...tags, existing ?? typed]);
    setDraft("");
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex h-6 max-w-40 items-center rounded-md bg-muted px-2 text-xs font-medium">
          <span className="truncate">{tag}</span>
        </span>
      ))}
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setDraft("");
        }}
      >
        <Popover.Trigger
          aria-label={t("edit", { text: question })}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-md text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:text-foreground",
            tags.length > 0 ? "w-6 justify-center hover:bg-muted" : "-ml-1 px-1",
          )}
        >
          <Plus aria-hidden className="size-4 shrink-0" />
          {tags.length === 0 && <span className="whitespace-nowrap">{t("add")}</span>}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="start" sideOffset={6} collisionPadding={12} className="z-50">
            {/* Its clicks stay here: the row under it would open the question */}
            <Popover.Popup
              onClick={(event) => event.stopPropagation()}
              className="flex w-64 flex-col gap-1 rounded-xl bg-popover p-1.5 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none transition-[opacity,scale] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0"
            >
              <input
                autoFocus
                value={draft}
                maxLength={40}
                aria-label={t("placeholder")}
                placeholder={t("placeholder")}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  addTyped();
                }}
                className="h-8 rounded-lg border bg-background px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              {isNew && (
                <button type="button" onClick={addTyped} className="flex h-8 items-center gap-2 rounded-md px-2 text-left transition-colors outline-none hover:bg-muted focus-visible:bg-muted">
                  <Plus aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{t("create", { tag: typed })}</span>
                </button>
              )}
              {shown.length > 0 ? (
                <ul className="flex max-h-56 flex-col overflow-y-auto">
                  {shown.map((tag) => (
                    <li key={tag}>
                      <button
                        type="button"
                        aria-pressed={has(tag)}
                        onClick={() => toggle(tag)}
                        className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left transition-colors outline-none hover:bg-muted focus-visible:bg-muted"
                      >
                        <Check aria-hidden className={cn("size-4 shrink-0", has(tag) ? "opacity-100" : "opacity-0")} />
                        <span className="truncate">{tag}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                !isNew && <p className="px-2 py-1.5 text-xs text-pretty text-muted-foreground">{t("empty")}</p>
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
