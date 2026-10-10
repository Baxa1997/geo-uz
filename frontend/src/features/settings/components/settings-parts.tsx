"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/helpers/utils";

/** The fields of a settings form: a white card of rows, a line between them, its title over the first. */
export function SettingsCard({
  title,
  description,
  actions,
  tour,
  className,
  children,
}: {
  title?: string;
  description?: React.ReactNode;
  /** On the right of the title: a button that acts on the whole card. */
  actions?: React.ReactNode;
  tour?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section data-tour={tour} className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10", className)}>
      {title && (
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3 sm:px-5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="font-medium">{title}</h2>
            {description && <p className="text-sm text-pretty text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="@container flex flex-col divide-y">{children}</div>
    </section>
  );
}

/**
 * One field of a settings form across the card's width: its name and a line on what it is for on the
 * left, the control on the right; on a narrow card the control goes under them. `htmlFor` ties the name to
 * a single input; a group of chips names itself.
 */
export function SettingsRow({ label, hint, htmlFor, children }: { label: string; hint?: React.ReactNode; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-x-8 gap-y-2.5 px-4 py-3.5 sm:px-5 @3xl:grid-cols-[17rem_minmax(0,1fr)] @3xl:items-start">
      <div className="flex min-w-0 flex-col gap-0.5 @3xl:pt-2">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-medium">
            {label}
          </label>
        ) : (
          <p className="text-sm font-medium">{label}</p>
        )}
        {hint && <p className="text-sm text-pretty text-muted-foreground">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * A form's foot, at the bottom of the panel and in view while the form scrolls, as Peec's: what saving
 * does on the left, then Save (and Cancel once something changed). `narrow` lines it up with a form in a
 * column in the middle of the page (Profil). Its message goes to `role=status`, so a screen reader hears
 * "Saved".
 */
export function SaveBar({
  note,
  dirty,
  saving,
  saved,
  error,
  narrow = false,
  onCancel,
  onSave,
}: {
  note: string;
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  error?: string;
  narrow?: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const t = useTranslations("Settings.save");
  return (
    <div className="sticky bottom-0 z-[5] -mx-4 mt-auto -mb-4 border-t bg-background/95 px-4 py-3 sm:-mx-5 sm:-mb-5 sm:px-5">
      <div className={cn("flex flex-wrap items-center justify-between gap-x-6 gap-y-2", narrow && "mx-auto w-full max-w-4xl sm:px-8")}>
        <p role="status" className={cn("flex min-w-0 flex-1 basis-64 items-start gap-2 text-sm text-pretty", error ? "text-destructive" : "text-muted-foreground")}>
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error || (saved && !dirty ? t("saved") : note)}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {dirty && (
            <Button variant="outline" disabled={saving} onClick={onCancel} className="bg-background">
              {t("cancel")}
            </Button>
          )}
          <Button disabled={!dirty || saving} onClick={onSave}>
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The standard field of a settings form. */
export const FIELD = "h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";
