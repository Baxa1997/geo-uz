"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Lightbulb, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";

/**
 * A card of a data page opened large: its title, what the numbers say, the block with everything in
 * it, then how to read it. Full screen on phones, a centered window from sm up. Loaded by ExpandButton.
 */
export function ExpandWindow({
  open,
  onOpenChange,
  title,
  takeaway,
  guide,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  takeaway?: React.ReactNode;
  guide?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations("Common");

  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/25 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 supports-backdrop-filter:backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed inset-0 z-50 flex flex-col bg-background outline-none transition-[opacity,scale] duration-150 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[92vh] sm:w-[min(64rem,94vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:shadow-2xl sm:ring-1 sm:ring-foreground/10">
          <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b py-2.5 pr-2.5 pl-4 sm:pl-5">
            <Dialog.Title className="min-w-0 truncate text-base font-semibold">{title}</Dialog.Title>
            <Dialog.Close render={<Button variant="ghost" size="icon-sm" />}>
              <X aria-hidden />
              <span className="sr-only">{t("close")}</span>
            </Dialog.Close>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {takeaway && (
              <div className="mx-4 mt-4 flex items-start gap-2.5 rounded-xl bg-muted px-3.5 py-3 sm:mx-5">
                <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-col gap-1 text-sm text-pretty">
                  <p className="text-xs font-medium text-muted-foreground">{t("takeaway")}</p>
                  {takeaway}
                </div>
              </div>
            )}
            <div className="flex min-w-0 flex-col">{children}</div>
            {guide && (
              <div className="mt-auto flex flex-col gap-1.5 border-t bg-muted/30 px-4 py-3.5 text-sm text-pretty text-muted-foreground sm:px-5">
                <p className="text-xs font-medium text-foreground">{t("howToRead")}</p>
                {guide}
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
