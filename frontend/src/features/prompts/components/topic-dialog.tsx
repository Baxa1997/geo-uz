"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { Modal } from "@/shared/components/modal";
import { Button } from "@/shared/components/ui/button";

const FIELD = "h-11 w-full rounded-xl border px-3 text-sm outline-none";

/**
 * A topic in a window, as Peec's: its name, how many tracked questions it holds, and "Delete topic" at the
 * foot, with Cancel and Save; a new topic gets the name alone. A name another topic has is said in the
 * window, which stays open. Peec's location and language per topic are left out: the city is the
 * project's, and each question keeps its own language.
 */
export function TopicDialog({
  topic,
  label,
  count,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: {
  /** The topic's value; null for a new one. */
  topic: string | null;
  /** Its name as shown; "" for a new one. */
  label: string;
  /** The tracked questions in it. */
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rejects with the message to show when the name can't be kept. */
  onSave: (name: string) => Promise<void>;
  onDelete: () => void;
}) {
  const t = useTranslations("PromptManager.topicsColumn");
  const id = useId();
  const [name, setName] = useState(label);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const creating = topic === null;
  const ready = name.trim() !== "" && name.trim() !== label && !saving;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setSaving(true);
    setError("");
    try {
      await onSave(name.trim());
      onOpenChange(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t("failed"));
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={creating ? t("dialog.newTitle") : t("dialog.editTitle", { name: label })}
      description={creating ? t("dialog.newText") : t("dialog.editText")}
      closeButton
      className="sm:w-[min(30rem,94vw)]"
      footer={
        <>
          {/* As Peec's: the way out of the topic at the left, in red */}
          {!creating && (
            <Button type="button" variant="ghost" size="lg" onClick={onDelete} className="mr-auto -ml-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive">
              {t("dialog.delete")}
            </Button>
          )}
          <Button type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)}>
            {t("dialog.cancel")}
          </Button>
          <Button type="submit" form={`${id}-form`} size="lg" disabled={!ready}>
            {saving ? t("dialog.saving") : creating ? t("dialog.add") : t("dialog.save")}
          </Button>
        </>
      }
    >
      <form id={`${id}-form`} onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-name`} className="text-sm font-medium">
            {t("dialog.name")}
          </label>
          <input
            id={`${id}-name`}
            value={name}
            maxLength={60}
            autoFocus
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder={t("namePlaceholder")}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`${FIELD} bg-background placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive`}
          />
        </div>
        {!creating && (
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-count`} className="text-sm font-medium">
              {t("dialog.questions")}
            </label>
            <input id={`${id}-count`} readOnly value={count} className={`${FIELD} border-transparent bg-muted text-muted-foreground tabular-nums`} />
          </div>
        )}
        {error && (
          <p id={`${id}-error`} role="alert" className="text-sm text-pretty text-destructive">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
