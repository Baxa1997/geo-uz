"use client";

import { useMutation } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Hint } from "@/shared/components/hint";
import { LinkRow } from "@/shared/components/link-row";
import { ConfirmModal, Modal } from "@/shared/components/modal";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { api, ApiError } from "@/shared/api/client";
import type { TagSummary } from "@/shared/types/api";
import { FIELD } from "./settings-parts";

/** The most tags made in one go. */
const MAX_NEW = 10;

/**
 * The questions' tags, laid out like Peec's Settings › Tags: an empty page says what tags are for and makes
 * the first ones; then every tag with how many tracked questions carry it, a row opening Savollar on that
 * tag, and ⋯ to rename it (on every question) or delete it (from every question). "Create tags" makes
 * several at once. Peec's source tags are left out: we don't group cited sites by campaign.
 */
export function TagsManager({ projectId, initial, promptsHref }: { projectId: string; initial: TagSummary[]; promptsHref: string }) {
  const t = useTranslations("Settings.tags");
  const [tags, setTags] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<TagSummary | null>(null);
  const [deleting, setDeleting] = useState<TagSummary | null>(null);
  const href = (tag: string) => `${promptsHref}?tag=${encodeURIComponent(tag)}`;

  const remove = useMutation({
    mutationFn: async (tag: TagSummary) => {
      await api.deleteTag(projectId, tag.name);
      return api.getTags(projectId);
    },
    onSuccess: (next) => {
      setTags(next);
      setDeleting(null);
    },
  });

  const createButton = (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden data-icon="inline-start" />
      {t("create")}
    </Button>
  );

  return (
    <>
      {tags.length === 0 ? (
        <section data-tour="tags" className="flex flex-col items-center gap-3 rounded-xl bg-card px-4 py-12 text-center ring-1 ring-foreground/10">
          <span aria-hidden className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Tag className="size-5" />
          </span>
          <h2 className="font-medium">{t("emptyTitle")}</h2>
          <p className="max-w-md text-sm text-pretty text-muted-foreground">{t("emptyText")}</p>
          <div className="pt-1">{createButton}</div>
        </section>
      ) : (
        <section data-tour="tags" className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2.5">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="font-medium">
                {t("title")}
                <span className="font-normal text-muted-foreground tabular-nums"> · {tags.length}</span>
              </h2>
              <p className="text-sm text-pretty text-muted-foreground">
                {t.rich("text", { link: (chunks) => <Link href={promptsHref} className="underline underline-offset-4">{chunks}</Link> })}
              </p>
            </div>
            {createButton}
          </header>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-left text-muted-foreground [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-normal [&>th:first-child]:pl-4">
                <th scope="col">
                  <Hint text={t("hints.tag")}>{t("columns.tag")}</Hint>
                </th>
                <th scope="col" className="w-36 text-right">
                  <Hint text={t("hints.prompts")}>{t("columns.prompts")}</Hint>
                </th>
                <th scope="col" className="w-14 pr-3">
                  <span className="sr-only">{t("columns.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tags.map((tag) => (
                <LinkRow key={tag.name} href={href(tag.name)} className="transition-colors hover:bg-muted/60 [&>td]:px-3 [&>td]:py-2.5 [&>td:first-child]:pl-4">
                  <td>
                    <Link href={href(tag.name)} className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-0.5 font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
                      <Tag aria-hidden className="size-3.5 text-muted-foreground" />
                      {tag.name}
                    </Link>
                  </td>
                  <td className="text-right tabular-nums">{tag.prompts}</td>
                  <td className="pr-3!">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("menu", { name: tag.name })} />}>
                        <MoreHorizontal aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem onClick={() => setRenaming(tag)}>
                          <Pencil aria-hidden />
                          {t("rename")}
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(tag)}>
                          <Trash2 aria-hidden />
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </LinkRow>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {creating && <CreateTags projectId={projectId} onClose={() => setCreating(false)} onSaved={(next) => (setTags(next), setCreating(false))} />}
      {renaming && <RenameTag key={renaming.name} projectId={projectId} tag={renaming} onClose={() => setRenaming(null)} onSaved={(next) => (setTags(next), setRenaming(null))} />}
      <ConfirmModal
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle", { name: deleting?.name ?? "" })}
        description={t("deleteText", { count: deleting?.prompts ?? 0 })}
        confirm={t("delete")}
        cancel={t("cancel")}
        danger
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  );
}

/** Peec's "Create tags": a field a tag, "+ Add a tag" for another, then Create. */
function CreateTags({ projectId, onClose, onSaved }: { projectId: string; onClose: () => void; onSaved: (tags: TagSummary[]) => void }) {
  const t = useTranslations("Settings.tags");
  const id = useId();
  const [names, setNames] = useState([""]);
  const filled = names.map((name) => name.trim()).filter(Boolean);
  const create = useMutation({ mutationFn: () => api.createTags(projectId, { names: filled }), onSuccess: onSaved });

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      closeButton
      title={t("createTitle")}
      description={t("createText")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button disabled={filled.length === 0 || create.isPending} onClick={() => create.mutate()}>
            {t("create")}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (filled.length > 0) create.mutate();
        }}
      >
        <p className="text-sm font-medium">{t("fieldLabel")}</p>
        {names.map((name, index) => (
          <div key={index} className="flex items-center gap-2">
            <label htmlFor={`${id}-${index}`} className="sr-only">
              {t("fieldNumber", { number: index + 1 })}
            </label>
            <input
              id={`${id}-${index}`}
              value={name}
              maxLength={40}
              // The first field is what the window is for; a new one is opened by "Add a tag"
              autoFocus={index === names.length - 1}
              placeholder={t("placeholder")}
              onChange={(event) => setNames((current) => current.map((kept, at) => (at === index ? event.target.value : kept)))}
              className={FIELD}
            />
            {names.length > 1 && (
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t("removeField", { number: index + 1 })} onClick={() => setNames((current) => current.filter((_, at) => at !== index))}>
                <X aria-hidden />
              </Button>
            )}
          </div>
        ))}
        {names.length < MAX_NEW && (
          <button
            type="button"
            onClick={() => setNames((current) => [...current, ""])}
            className="inline-flex w-fit items-center gap-1.5 rounded-md py-1 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Plus aria-hidden className="size-4" />
            {t("addField")}
          </button>
        )}
        {create.isError && <p role="alert" className="text-sm text-destructive">{t("failed")}</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

/** A tag's new name, for every question that carries it. */
function RenameTag({ projectId, tag, onClose, onSaved }: { projectId: string; tag: TagSummary; onClose: () => void; onSaved: (tags: TagSummary[]) => void }) {
  const t = useTranslations("Settings.tags");
  const id = useId();
  const [name, setName] = useState(tag.name);
  const rename = useMutation({ mutationFn: () => api.renameTag(projectId, tag.name, { name: name.trim() }), onSuccess: onSaved });
  const error = rename.error instanceof ApiError && rename.error.status === 409 ? t("taken", { name: name.trim() }) : rename.isError ? t("failed") : "";

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      closeButton
      title={t("renameTitle")}
      description={t("renameText", { count: tag.prompts })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button disabled={!name.trim() || name.trim() === tag.name || rename.isPending} onClick={() => rename.mutate()}>
            {t("save")}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() && name.trim() !== tag.name) rename.mutate();
        }}
      >
        <label htmlFor={`${id}-name`} className="text-sm font-medium">
          {t("fieldLabel")}
        </label>
        <input id={`${id}-name`} value={name} maxLength={40} autoFocus onChange={(event) => setName(event.target.value)} className={FIELD} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>
    </Modal>
  );
}
