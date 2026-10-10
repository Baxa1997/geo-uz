"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/helpers/utils";

/**
 * A window over the page, laid out like Peec's: rounded, centered from sm up, along the bottom of a phone.
 * Anything above the title (`top`: Peec's "Add prompt | Bulk upload" switch), the title with a line under
 * it, the content, and the buttons at the bottom right. `closeButton` keeps the cross at the top right on
 * every screen, not only on a phone.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  top,
  footer,
  closeButton = false,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  top?: React.ReactNode;
  footer?: React.ReactNode;
  closeButton?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations("Common");
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/25 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 supports-backdrop-filter:backdrop-blur-[2px]" />
        <Dialog.Popup
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92svh] flex-col rounded-t-3xl bg-background shadow-2xl ring-1 ring-foreground/10 outline-none transition-[opacity,scale] duration-150 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[min(34rem,94vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl",
            className,
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 sm:p-6">
            {top}
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <Dialog.Title className="text-lg font-semibold tracking-tight">{title}</Dialog.Title>
                {description && <Dialog.Description className="text-sm text-pretty text-muted-foreground">{description}</Dialog.Description>}
              </div>
              {/* Peec's window closes with Cancel; the cross is for a phone, where the window fills the bottom, unless the window keeps it everywhere */}
              <Dialog.Close render={<Button variant="ghost" size="icon-sm" className={cn("-mt-1 -mr-1 shrink-0", !closeButton && "sm:hidden")} />}>
                <X aria-hidden />
                <span className="sr-only">{t("close")}</span>
              </Dialog.Close>
            </div>
            {children}
          </div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 px-5 pt-1 pb-5 sm:px-6 sm:pb-6">{footer}</div>}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** "Are you sure?" for what can't be undone in one click: archiving every question, deleting a topic. */
export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirm,
  cancel,
  danger = false,
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirm: string;
  cancel: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            {cancel}
          </Button>
          <Button variant={danger ? "destructive" : "default"} size="lg" disabled={pending} onClick={onConfirm}>
            {confirm}
          </Button>
        </>
      }
    />
  );
}
