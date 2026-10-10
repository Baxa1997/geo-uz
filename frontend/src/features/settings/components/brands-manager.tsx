"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, MoreHorizontal, Pencil, Plus, Search, UserMinus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { ChipInput } from "@/shared/components/chip-input";
import { Hint } from "@/shared/components/hint";
import { ConfirmModal, Modal } from "@/shared/components/modal";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { cn } from "@/shared/helpers/utils";
import type { Brand, Project, UntrackedBrand } from "@/shared/types/api";
import { FIELD } from "./settings-parts";

/** The spellings a brand may be searched for. */
const MAX_ALIASES = 12;

type Editing = { brand: Brand | null } | null;

/**
 * The tracked brands, laid out like Peec's Settings › Brands: the brands in a table (their color in the
 * charts, the name, the spellings the answers are searched for, the website, the answers of the latest
 * check that name them), each with ⋯ to edit it or stop tracking it, and "Add a brand" while the plan has
 * room; beside them, the brands ChatGPT names that aren't tracked, to track (✓) or hide (✕).
 */
export function BrandsManager({
  project,
  colors,
  mentions,
  answers,
  suggestions,
}: {
  project: Project;
  /** Brand id → its color in the charts. */
  colors: Record<string, string>;
  /** Brand id → answers of the latest check naming it. */
  mentions: Record<string, number>;
  /** Answers of the latest check: what the counts are out of. */
  answers: number;
  suggestions: UntrackedBrand[];
}) {
  const t = useTranslations("Settings.brands");
  const plans = useTranslations("Plans");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Editing>(null);
  const [untracking, setUntracking] = useState<Brand | null>(null);
  const brands = [project.brand, ...project.competitors];
  const shown = brands.filter((brand) => [brand.name, brand.domain, ...brand.aliases].some((text) => text.toLowerCase().includes(search.trim().toLowerCase())));
  const full = project.competitors.length >= project.limits.competitors;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    router.refresh();
  };
  const untrack = useMutation({
    mutationFn: (brand: Brand) => api.removeCompetitor(project.id, brand.id),
    onSuccess: () => {
      setUntracking(null);
      refresh();
    },
  });
  const decide = useMutation({
    mutationFn: async ({ brand, track }: { brand: UntrackedBrand; track: boolean }) => {
      if (track) await api.addCompetitor(project.id, { name: brand.name });
      else await api.dismissBrand(project.id, { name: brand.name, dismissed: true });
    },
    onSuccess: refresh,
  });

  const heading = (key: "color" | "name" | "aliases" | "domain" | "mentions", className?: string) => (
    <th scope="col" className={className}>
      <Hint text={t(`hints.${key}`)}>{t(`columns.${key}`)}</Hint>
    </th>
  );

  return (
    <div className="@container">
      <div className="grid items-start gap-4 @5xl:grid-cols-[minmax(0,1fr)_19rem]">
        <section data-tour="brands" className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2.5">
            <h2 className="font-medium">
              {t("title")}
              <Hint text={t("usage", { plan: plans(project.plan), max: project.limits.competitors })} className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
                {t("count", { count: project.competitors.length, max: project.limits.competitors })}
              </Hint>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("search")}
                  aria-label={t("search")}
                  className={cn(FIELD, "h-8 w-52 pl-8")}
                />
              </div>
              <Hint text={full ? t("full", { plan: plans(project.plan), max: project.limits.competitors }) : t("addHint")} described={false}>
                {() => (
                  <Button disabled={full} onClick={() => setEditing({ brand: null })}>
                    <Plus aria-hidden data-icon="inline-start" />
                    {t("add")}
                  </Button>
                )}
              </Hint>
            </div>
          </header>
          <div className="relative min-w-0 overflow-x-auto">
            <table className="w-full min-w-176 text-sm">
              <thead>
                <tr className="border-b bg-muted/60 text-left text-muted-foreground [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-normal [&>th:first-child]:pl-4">
                  {heading("color", "w-16")}
                  {heading("name", "w-56")}
                  {heading("aliases")}
                  {heading("domain", "w-44")}
                  {heading("mentions", "w-28 text-right")}
                  <th scope="col" className="w-12 pr-3">
                    <span className="sr-only">{t("columns.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shown.map((brand) => {
                  const you = brand.id === project.brand.id;
                  return (
                    <tr key={brand.id} className="[&>td]:px-3 [&>td]:py-3 [&>td:first-child]:pl-4">
                      <td>
                        <span aria-hidden className="block size-3.5 rounded" style={{ background: colors[brand.id] }} />
                      </td>
                      <th scope="row" className="px-3 text-left font-medium">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{brand.name}</span>
                          {you && <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">{t("you")}</span>}
                        </span>
                      </th>
                      <td>{brand.aliases.length ? <span className="line-clamp-2 text-muted-foreground">{brand.aliases.join(", ")}</span> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="truncate text-muted-foreground">{brand.domain || "—"}</td>
                      <td className="text-right font-medium tabular-nums">
                        {answers ? (
                          <Hint text={t("mentionsOf", { count: mentions[brand.id] ?? 0, total: answers })} focusable={false} described={false}>
                            {mentions[brand.id] ?? 0}
                          </Hint>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="pr-3!">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("menu", { name: brand.name })} />}>
                            <MoreHorizontal aria-hidden />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-52">
                            <DropdownMenuItem onClick={() => setEditing({ brand })}>
                              <Pencil aria-hidden />
                              {t("edit")}
                            </DropdownMenuItem>
                            {!you && (
                              <DropdownMenuItem variant="destructive" onClick={() => setUntracking(brand)}>
                                <UserMinus aria-hidden />
                                {t("untrack")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      {t("noMatch")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t px-4 py-2.5 text-xs text-pretty text-muted-foreground">{t("note")}</p>
        </section>

        <section data-tour="suggestions" aria-labelledby="brand-suggestions" className="flex min-w-0 flex-col gap-2">
          <h2 id="brand-suggestions" className="px-1 font-medium">
            {t("suggestionsTitle")}
            {suggestions.length > 0 && <span className="font-normal text-muted-foreground tabular-nums"> · {suggestions.length}</span>}
          </h2>
          <p className="px-1 text-sm text-pretty text-muted-foreground">{suggestions.length > 0 ? t("suggestionsText") : t("suggestionsNone")}</p>
          {decide.isError && <p className="px-1 text-sm text-destructive">{t("failed")}</p>}
          <ul className="flex flex-col gap-2">
            {suggestions.map((brand) => {
              const busy = decide.isPending && decide.variables.brand.name === brand.name;
              return (
                <li key={brand.name} className="flex items-center gap-3 rounded-xl bg-card px-3.5 py-3 ring-1 ring-foreground/10">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="text-xs text-muted-foreground tabular-nums">{t("answers", { count: brand.answers })}</p>
                    <p className="truncate text-sm font-medium">{brand.name}</p>
                  </div>
                  <Hint text={t("hide", { name: brand.name })} described={false}>
                    {() => (
                      <Button variant="outline" size="icon-sm" className="bg-background" disabled={busy} aria-label={t("hide", { name: brand.name })} onClick={() => decide.mutate({ brand, track: false })}>
                        <X aria-hidden />
                      </Button>
                    )}
                  </Hint>
                  <Hint text={full ? t("full", { plan: plans(project.plan), max: project.limits.competitors }) : t("track", { name: brand.name })} described={false}>
                    {() => (
                      <Button variant="outline" size="icon-sm" className="bg-background" disabled={busy || full} aria-label={t("track", { name: brand.name })} onClick={() => decide.mutate({ brand, track: true })}>
                        <Check aria-hidden />
                      </Button>
                    )}
                  </Hint>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {editing && (
        <BrandDialog
          key={editing.brand?.id ?? "new"}
          project={project}
          brand={editing.brand}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      <ConfirmModal
        open={untracking !== null}
        onOpenChange={(open) => !open && setUntracking(null)}
        title={t("untrackTitle", { name: untracking?.name ?? "" })}
        description={t("untrackText")}
        confirm={t("untrack")}
        cancel={t("cancel")}
        danger
        pending={untrack.isPending}
        onConfirm={() => untracking && untrack.mutate(untracking)}
      />
    </div>
  );
}

/**
 * A brand in a window, to add or to change: its name, its website and the other spellings the answers
 * are searched for (Latin and Cyrillic). The client's own brand is saved as part of its profile.
 */
export function BrandDialog({ project, brand, onClose, onSaved }: { project: Project; brand: Brand | null; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations("Settings.brands");
  const id = useId();
  const [name, setName] = useState(brand?.name ?? "");
  const [domain, setDomain] = useState(brand?.domain ?? "");
  const [aliases, setAliases] = useState(brand?.aliases ?? []);
  const own = brand?.id === project.brand.id;

  const save = useMutation({
    mutationFn: async () => {
      const body = { name: name.trim(), domain: domain.trim(), aliases };
      if (!brand) await api.addCompetitor(project.id, body);
      else if (own) await api.updateProject(project.id, body);
      else await api.updateCompetitor(project.id, brand.id, body);
    },
    onSuccess: onSaved,
  });
  const error =
    save.error instanceof ApiError
      ? save.error.status === 409
        ? t("taken", { name: name.trim() })
        : save.error.status === 422
          ? t("invalid")
          : t("failed")
      : save.isError
        ? t("failed")
        : "";

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      closeButton
      title={brand ? t("editTitle", { name: brand.name }) : t("addTitle")}
      description={brand ? (own ? t("editOwnText") : t("editText")) : t("addText")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
            {brand ? t("save") : t("addButton")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-name`} className="text-sm font-medium">
            {t("fields.name")}
          </label>
          <input id={`${id}-name`} value={name} maxLength={80} onChange={(event) => setName(event.target.value)} className={FIELD} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-domain`} className="text-sm font-medium">
            {t("fields.domain")}
          </label>
          <input id={`${id}-domain`} value={domain} inputMode="url" placeholder="example.uz" onChange={(event) => setDomain(event.target.value)} className={FIELD} />
        </div>
        <ChipInput id={`${id}-aliases`} label={t("fields.aliases")} hint={t("fields.aliasesHint")} values={aliases} max={MAX_ALIASES} onChange={setAliases} />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

