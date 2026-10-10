"use client";

import { useMutation } from "@tanstack/react-query";
import { useMessages, useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { DropZone } from "@/shared/components/drop-zone";
import { FormSelect } from "@/shared/components/form-select";
import { Modal } from "@/shared/components/modal";
import { Button } from "@/shared/components/ui/button";
import { api } from "@/shared/api/client";
import { labelFor } from "@/shared/helpers/labels";
import { cn } from "@/shared/helpers/utils";
import type { Action, PageType } from "@/shared/types/api";
import { PAGE_TYPES } from "../constants";

/** A page's text from a file: enough for a long article, small enough to send. */
const MAX_DOCUMENT_BYTES = 200_000;

/**
 * Peec's "Add content": a page of the client's site (its address) or a draft (a Markdown or text file),
 * the kind of page and the topic it should answer. The backend reads it against that topic's questions
 * and answers with a new action that says how to rework it, brief included.
 */
export function AddContentDialog({
  projectId,
  topics,
  open,
  onOpenChange,
  onCreated,
}: {
  projectId: string;
  topics: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (action: Action) => void;
}) {
  const t = useTranslations("Actions.add");
  const types = useTranslations("Actions.pageTypes");
  const messages = useMessages();
  const id = useId();
  const [source, setSource] = useState<"url" | "document">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [pageType, setPageType] = useState<PageType | "">("");
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api.addContentAction(projectId, {
        ...(source === "url" ? { url: url.trim() } : { document: file?.text ?? "" }),
        pageType: pageType || "other",
        topic,
      }),
    onSuccess: (action) => {
      onCreated(action);
      close(false);
    },
    onError: () => setError(t("failed")),
  });

  function close(next: boolean) {
    if (!next) {
      setSource("url");
      setUrl("");
      setFile(null);
      setPageType("");
      setTopic("");
      setError("");
      create.reset();
    }
    onOpenChange(next);
  }

  async function readFile(picked: File) {
    setError("");
    if (!/\.(md|markdown|txt)$/i.test(picked.name)) return setError(t("fileType"));
    if (picked.size > MAX_DOCUMENT_BYTES) return setError(t("fileLarge"));
    const text = (await picked.text()).trim();
    if (!text) return setError(t("fileEmpty"));
    setFile({ name: picked.name, text });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (source === "url" && !/^(https?:\/\/)?[^\s/]+\.[^\s/]{2,}/i.test(url.trim())) setError(t("urlInvalid"));
    else if (source === "document" && !file) setError(t("fileRequired"));
    else if (!pageType) setError(t("pageTypeRequired"));
    else if (!topic) setError(t("topicRequired"));
    else create.mutate();
  }

  const ready = (source === "url" ? url.trim() !== "" : file !== null) && pageType !== "" && topic !== "";

  return (
    <Modal
      open={open}
      onOpenChange={close}
      title={t("title")}
      description={t("description")}
      closeButton
      footer={
        <>
          <Button type="button" variant="ghost" size="lg" onClick={() => close(false)}>
            {t("cancel")}
          </Button>
          <Button type="submit" form={`${id}-form`} size="lg" disabled={!ready || create.isPending}>
            {create.isPending ? t("creating") : t("create")}
          </Button>
        </>
      }
    >
      <form id={`${id}-form`} onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span id={`${id}-content`} className="text-sm font-medium">
              {t("content")}
            </span>
            {/* Peec's switch between a page's address and a file */}
            <div role="group" aria-labelledby={`${id}-content`} className="flex gap-0.5 rounded-lg bg-muted p-0.5">
              {(["url", "document"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={source === option}
                  onClick={() => {
                    setSource(option);
                    setError("");
                  }}
                  className={cn(
                    "h-7 rounded-md px-3 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    source === option ? "bg-background font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`sources.${option}`)}
                </button>
              ))}
            </div>
          </div>
          {source === "url" ? (
            <div className="flex h-11 items-stretch overflow-hidden rounded-xl border bg-background focus-within:ring-3 focus-within:ring-ring/50">
              <span aria-hidden className="flex items-center border-r px-3 text-sm text-muted-foreground">
                https://
              </span>
              <input
                type="text"
                inputMode="url"
                aria-label={t("urlLabel")}
                value={url}
                onChange={(event) => {
                  // A pasted address keeps working: the prefix is shown, not typed
                  setUrl(event.target.value.replace(/^https?:\/\//i, ""));
                  setError("");
                }}
                placeholder={t("urlPlaceholder")}
                autoFocus
                className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          ) : (
            <DropZone
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              fileName={file?.name ?? null}
              title={t.rich("dropTitle", { browse: (chunks) => <span className="underline underline-offset-2">{chunks}</span> })}
              hint={t("dropHint")}
              another={t("another")}
              onFile={(picked) => void readFile(picked)}
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-type`} className="text-sm font-medium">
            {t("pageType")}
          </label>
          <FormSelect id={`${id}-type`} value={pageType} required onChange={(value) => setPageType(value as PageType)}>
            <option value="" disabled>
              {t("pageTypePlaceholder")}
            </option>
            {PAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {types(type)}
              </option>
            ))}
          </FormSelect>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-topic`} className="text-sm font-medium">
            {t("topic")}
          </label>
          <FormSelect id={`${id}-topic`} value={topic} required onChange={setTopic}>
            <option value="" disabled>
              {t("topicPlaceholder")}
            </option>
            {topics.map((option) => (
              <option key={option} value={option}>
                {labelFor(messages.Topics, option)}
              </option>
            ))}
          </FormSelect>
        </div>

        {error && (
          <p role="alert" className="text-sm text-pretty text-destructive">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
