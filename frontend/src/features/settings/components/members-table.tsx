"use client";

import { useMutation } from "@tanstack/react-query";
import { Search, Send, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Hint } from "@/shared/components/hint";
import { ConfirmModal, Modal } from "@/shared/components/modal";
import { PhoneInput } from "@/shared/components/phone-input";
import { Button } from "@/shared/components/ui/button";
import { api, ApiError } from "@/shared/api/client";
import { PHONE_PREFIX } from "@/shared/constants";
import { formatPhone } from "@/shared/helpers/phone";
import { cn } from "@/shared/helpers/utils";
import type { Member } from "@/shared/types/api";
import { FIELD } from "./settings-parts";

/** A member's initials for their mark: of the name, else the last two digits of the phone. */
const initials = (member: Member) =>
  member.name
    ? member.name
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("")
    : (member.phone ?? member.telegramUsername ?? "?").slice(-2);

/**
 * The people with access to the account's projects, laid out like Peec's Members: each with their mark,
 * name and phone or Telegram, their role (the owner pays and can't be removed), whether they have logged
 * in yet, the projects they can open, and a way to take their access away. "Invite" sends an SMS with a
 * link to a phone number. Every plan has unlimited users.
 */
export function MembersTable({ initial, projects }: { initial: Member[]; /** Project id → its brand's name. */ projects: Record<string, string> }) {
  const t = useTranslations("Settings.members");
  const [members, setMembers] = useState(initial);
  const [search, setSearch] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const query = search.trim().toLowerCase();
  const shown = members.filter((member) => !query || [member.name, member.phone, member.telegramUsername].some((text) => text?.toLowerCase().includes(query)));

  const remove = useMutation({
    mutationFn: (member: Member) => api.removeMember(member.id),
    onSuccess: (_, member) => {
      setMembers((current) => current.filter((candidate) => candidate.id !== member.id));
      setRemoving(null);
    },
  });

  const heading = (key: "member" | "role" | "status" | "projects", className?: string) => (
    <th scope="col" className={className}>
      <Hint text={t(`hints.${key}`)}>{t(`columns.${key}`)}</Hint>
    </th>
  );

  return (
    <>
      <section data-tour="members" className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="font-medium">
              {t("title")}
              <span className="font-normal text-muted-foreground tabular-nums"> · {members.length}</span>
            </h2>
            <p className="text-sm text-pretty text-muted-foreground">{t("text")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("search")} aria-label={t("search")} className={cn(FIELD, "h-8 w-52 pl-8")} />
            </div>
            <Button data-tour="invite" onClick={() => setInviting(true)}>
              <Send aria-hidden data-icon="inline-start" />
              {t("invite")}
            </Button>
          </div>
        </header>
        <div className="relative min-w-0 overflow-x-auto">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-left text-muted-foreground [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-normal [&>th:first-child]:pl-4">
                {heading("member")}
                {heading("role", "w-36")}
                {heading("status", "w-40")}
                {heading("projects", "w-48")}
                <th scope="col" className="w-14 pr-3">
                  <span className="sr-only">{t("columns.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shown.map((member) => {
                const contact = [member.phone ? formatPhone(member.phone) : null, member.telegramUsername ? `@${member.telegramUsername}` : null].filter(Boolean).join(" · ");
                return (
                  <tr key={member.id} className="[&>td]:px-3 [&>td]:py-3 [&>td:first-child]:pl-4">
                    <td>
                      <span className="flex min-w-0 items-center gap-3">
                        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                          {initials(member)}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{member.name ?? contact}</span>
                          {member.name && contact && <span className="truncate text-xs text-muted-foreground">{contact}</span>}
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium", member.role === "owner" ? "bg-you-soft text-foreground" : "bg-muted text-muted-foreground")}>
                        {t(`roles.${member.role}`)}
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden className={cn("size-2 rounded-full", member.status === "active" ? "bg-positive" : "bg-progress")} />
                        {t(`statuses.${member.status}`)}
                      </span>
                    </td>
                    <td>
                      <span className="flex flex-wrap gap-1">
                        {member.projectIds.map((projectId) => (
                          <Hint key={projectId} text={projects[projectId] ?? projectId} focusable={false} described={false}>
                            <span className="flex size-6 items-center justify-center rounded-md border bg-background text-[0.7rem] font-semibold text-muted-foreground uppercase">
                              {(projects[projectId] ?? "?").charAt(0)}
                            </span>
                            <span className="sr-only">{projects[projectId] ?? projectId}</span>
                          </Hint>
                        ))}
                      </span>
                    </td>
                    <td className="pr-3!">
                      {member.role === "owner" ? (
                        <span className="sr-only">{t("ownerStays")}</span>
                      ) : (
                        <Hint text={t("remove", { name: member.name ?? contact })} described={false}>
                          {() => (
                            <Button variant="ghost" size="icon-sm" aria-label={t("remove", { name: member.name ?? contact })} onClick={() => setRemoving(member)}>
                              <Trash2 aria-hidden />
                            </Button>
                          )}
                        </Hint>
                      )}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    {t("noMatch")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t px-4 py-2.5 text-xs text-pretty text-muted-foreground">{t("note")}</p>
      </section>

      {inviting && (
        <InviteMember
          onClose={() => setInviting(false)}
          onInvited={(member) => {
            setMembers((current) => [...current, member]);
            setInviting(false);
          }}
        />
      )}
      <ConfirmModal
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("removeTitle", { name: removing?.name ?? (removing?.phone ? formatPhone(removing.phone) : "") })}
        description={t("removeText")}
        confirm={t("removeConfirm")}
        cancel={t("cancel")}
        danger
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </>
  );
}

/** "Invite": a phone number; we send an SMS with a link to log in, and the member sees the account's projects. */
function InviteMember({ onClose, onInvited }: { onClose: () => void; onInvited: (member: Member) => void }) {
  const t = useTranslations("Settings.members");
  const id = useId();
  const [digits, setDigits] = useState("");
  const invite = useMutation({ mutationFn: () => api.inviteMember({ phone: `${PHONE_PREFIX}${digits}`.replace(/\s/g, "") }), onSuccess: onInvited });
  const error =
    invite.error instanceof ApiError
      ? invite.error.status === 409
        ? t("already")
        : invite.error.status === 422
          ? t("badPhone")
          : t("failed")
      : invite.isError
        ? t("failed")
        : "";

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      closeButton
      title={t("inviteTitle")}
      description={t("inviteText")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button disabled={digits.length !== 9 || invite.isPending} onClick={() => invite.mutate()}>
            <Send aria-hidden data-icon="inline-start" />
            {t("send")}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (digits.length === 9) invite.mutate();
        }}
      >
        <label htmlFor={`${id}-phone`} className="text-sm font-medium">
          {t("phone")}
        </label>
        <PhoneInput id={`${id}-phone`} autoFocus digits={digits} onDigitsChange={setDigits} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>
    </Modal>
  );
}
