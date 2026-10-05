"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowUp, CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { api } from "@/shared/api/client";
import { SUPPORT_EXAMPLES } from "../constants";

/** "Yordam": a question, bug report or idea for the team, from the sidebar. */
export function SupportSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("Support");
  const id = useId();
  const [text, setText] = useState("");
  const send = useMutation({
    mutationFn: (message: string) => api.sendSupportMessage({ text: message }),
    onSuccess: () => setText(""),
  });

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (text.trim() && !send.isPending) send.mutate(text.trim());
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:inset-y-2 data-[side=right]:sm:right-2 data-[side=right]:sm:h-auto data-[side=right]:sm:max-w-md data-[side=right]:sm:rounded-2xl data-[side=right]:sm:border"
      >
        <SheetHeader className="gap-1 border-b px-6 pt-7 pb-5">
          <SheetTitle className="text-lg">{t("title")}</SheetTitle>
          <SheetDescription>{t("subtitle")}</SheetDescription>
        </SheetHeader>

        <div className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-8">
          {send.isSuccess ? (
            <div role="status" className="flex flex-col items-start gap-3">
              <CircleCheck aria-hidden className="size-8 text-positive" />
              <p className="text-lg font-semibold">{t("sentTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("sentText")}</p>
              <Button variant="outline" onClick={() => send.reset()}>
                {t("again")}
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xl font-semibold tracking-tight">{t("heading")}</p>
              <p className="text-pretty text-muted-foreground">{t("text")}</p>
              <p className="mt-4 font-mono text-[0.7rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
                {t("examples")}
              </p>
              <ul className="flex flex-col items-start gap-2">
                {SUPPORT_EXAMPLES.map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setText(t(`items.${key}`))}
                      className="rounded-lg border bg-background px-3.5 py-2 text-left text-sm shadow-xs transition-colors hover:bg-muted/40"
                    >
                      {t(`items.${key}`)}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {!send.isSuccess && (
          <form onSubmit={submit} className="flex flex-col gap-2 border-t px-4 pt-4 pb-5">
            <div className="flex items-end gap-2 rounded-2xl border bg-background p-2 pl-3.5 shadow-xs focus-within:ring-3 focus-within:ring-ring/50">
              <label htmlFor={`${id}-text`} className="sr-only">
                {t("placeholder")}
              </label>
              <textarea
                id={`${id}-text`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={1}
                placeholder={t("placeholder")}
                className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none [field-sizing:content] placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={!text.trim() || send.isPending}
                aria-label={t("send")}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-colors disabled:bg-foreground/25"
              >
                <ArrowUp aria-hidden className="size-4" />
              </button>
            </div>
            {send.isError && (
              <p role="alert" className="px-1 text-sm text-destructive">
                {t("failed")}
              </p>
            )}
            <p className="px-1 text-xs text-muted-foreground">{t("hint")}</p>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
