"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Maximize2, Pencil } from "lucide-react";
import { useMessages, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { ChipInput } from "@/shared/components/chip-input";
import { FormSelect } from "@/shared/components/form-select";
import { InfoTip } from "@/shared/components/info-tip";
import { Modal } from "@/shared/components/modal";
import { Button } from "@/shared/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import type { Project, UpdateProjectRequest } from "@/shared/types/api";
import { BrandDialog } from "./brands-manager";
import { MarketMap } from "./market-map";
import { FIELD, SaveBar } from "./settings-parts";

/** The most chips a list of the profile keeps. */
const MAX_CHIPS = 12;

type Form = Required<Pick<UpdateProjectRequest, "description" | "category" | "identity" | "services" | "customers" | "city">>;

const formOf = (project: Project): Form => ({
  description: project.description,
  category: project.category,
  identity: project.identity,
  services: project.services,
  customers: project.customers,
  city: project.city,
});

/** One field as Peec's profile has it: its name with an ⓘ, a gray line under it, then the field. */
function Field({ id, label, hint, info, control = true, children }: { id: string; label: string; hint: string; info: string; control?: boolean; children: React.ReactNode }) {
  const t = useTranslations("Common");
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          {control ? (
            <label htmlFor={id} className="text-[0.9375rem] font-medium">
              {label}
            </label>
          ) : (
            <p className="text-[0.9375rem] font-medium">{label}</p>
          )}
          <InfoTip label={t("about")}>{info}</InfoTip>
        </div>
        <p className="text-sm text-pretty text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * The brand profile laid out as Peec's Profile (the user's correction of Oct 10, with Peec's screenshots):
 * one column in the middle of the page, a title, a gray banner with the brand's mark on its edge, the
 * name and website under it (✎ changes them and the spellings, in the brands' window), then the fields
 * one under another (description, field, brand identity, services, customer types), a line, and the
 * target market: the city the questions are asked from, chosen in a list or on the map, which opens
 * large. The bar at the foot saves what changed; the suggested questions are written again from it.
 */
export function ProfileForm({ project, categories, cities }: { project: Project; categories: string[]; cities: string[] }) {
  const t = useTranslations("Settings.profile");
  const messages = useMessages();
  const id = useId();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(() => formOf(project));
  const [form, setForm] = useState(saved);
  const [editingBrand, setEditingBrand] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const body = Object.fromEntries(
    (Object.keys(form) as (keyof Form)[]).filter((key) => JSON.stringify(form[key]) !== JSON.stringify(saved[key])).map((key) => [key, form[key]]),
  ) as UpdateProjectRequest;
  const dirty = Object.keys(body).length > 0;
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));
  const refresh = () => {
    // The sidebar's project card shows the name
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    router.refresh();
  };

  const save = useMutation({
    mutationFn: () => api.updateProject(project.id, body),
    onSuccess: (next) => {
      const fresh = formOf(next);
      setSaved(fresh);
      setForm(fresh);
      refresh();
    },
  });
  const error = save.error instanceof ApiError && save.error.status === 422 ? t("invalid") : save.isError ? t("failed") : undefined;
  const label = (dictionary: Record<string, string>, key: string) => dictionary[key] ?? key;
  const { brand } = project;

  return (
    <>
      <div className="mx-auto flex w-full max-w-4xl flex-col pb-6">
        <header className="flex flex-col gap-1 px-1 pt-2 sm:px-8">
          <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
          <p className="text-[0.9375rem] text-pretty text-muted-foreground">{t("text")}</p>
        </header>

        <div data-tour="brand" className="mt-6 flex flex-col">
          {/* The banner, the brand's mark on its lower edge */}
          <div className="relative h-32 rounded-2xl bg-[color-mix(in_oklab,var(--foreground)_30%,var(--background))] sm:h-40">
            <span aria-hidden className="absolute -bottom-9 left-4 flex size-20 items-center justify-center rounded-2xl bg-card text-4xl text-foreground shadow-sm ring-1 ring-foreground/10 sm:left-8">
              {brand.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="mt-12 flex items-start justify-between gap-4 px-1 sm:px-8">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-lg font-semibold">{brand.name}</p>
              <p className="text-[0.9375rem] text-muted-foreground">{brand.domain}</p>
              {brand.aliases.length > 0 && <p className="text-sm text-pretty text-muted-foreground">{t("aliasesLine", { aliases: brand.aliases.join(", ") })}</p>}
            </div>
            <Button variant="outline" className="bg-background" onClick={() => setEditingBrand(true)}>
              <Pencil aria-hidden data-icon="inline-start" />
              {t("editBrand")}
            </Button>
          </div>
        </div>

        <div data-tour="business" className="mt-9 flex flex-col gap-8 px-1 sm:px-8">
          <Field id={`${id}-description`} label={t("description")} hint={t("descriptionHint")} info={t("descriptionInfo")}>
            <textarea
              id={`${id}-description`}
              value={form.description}
              rows={3}
              maxLength={600}
              onChange={(event) => set("description", event.target.value)}
              className={`${FIELD} h-auto resize-y rounded-xl px-3.5 py-3 text-[0.9375rem] leading-relaxed`}
            />
          </Field>
          <Field id={`${id}-category`} label={t("category")} hint={t("categoryHint")} info={t("categoryInfo")}>
            <FormSelect id={`${id}-category`} value={form.category} onChange={(value) => set("category", value)}>
              {categories.map((key) => (
                <option key={key} value={key}>
                  {label(messages.Categories, key)}
                </option>
              ))}
            </FormSelect>
          </Field>
          <Field id={`${id}-identity`} label={t("identity")} hint={t("identityHint")} info={t("identityInfo")} control={false}>
            <ChipInput bare id={`${id}-identity`} label={t("identity")} hint={t("identityHint")} values={form.identity} max={MAX_CHIPS} onChange={(values) => set("identity", values)} />
          </Field>
          <Field id={`${id}-services`} label={t("services")} hint={t("servicesHint")} info={t("servicesInfo")} control={false}>
            <ChipInput bare id={`${id}-services`} label={t("services")} hint={t("servicesHint")} values={form.services} max={MAX_CHIPS} onChange={(values) => set("services", values)} />
          </Field>
          <Field id={`${id}-customers`} label={t("customers")} hint={t("customersHint")} info={t("customersInfo")} control={false}>
            <ChipInput bare id={`${id}-customers`} label={t("customers")} hint={t("customersHint")} values={form.customers} max={MAX_CHIPS} onChange={(values) => set("customers", values)} />
          </Field>
        </div>

        <hr className="mt-10 mb-8 border-foreground/10" />

        <section data-tour="markets" aria-labelledby={`${id}-markets`} className="flex flex-col gap-4 px-1 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h3 id={`${id}-markets`} className="text-[0.9375rem] font-medium">
                {t("markets")}
              </h3>
              <p className="text-sm text-pretty text-muted-foreground">{t("marketsHint")}</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor={`${id}-city`} className="sr-only">
                {t("city")}
              </label>
              <div className="w-44">
                <FormSelect id={`${id}-city`} value={form.city} onChange={(value) => set("city", value)}>
                  {cities.map((key) => (
                    <option key={key} value={key}>
                      {label(messages.Cities, key)}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <Button variant="outline" size="icon" aria-label={t("mapLarge")} onClick={() => setMapOpen(true)} className="size-11 rounded-xl bg-background">
                <Maximize2 aria-hidden />
              </Button>
            </div>
          </div>
          <MarketMap city={form.city} onChoose={(city) => set("city", city)} />
        </section>
      </div>

      <SaveBar
        narrow
        note={t("saveNote")}
        dirty={dirty}
        saving={save.isPending}
        saved={save.isSuccess}
        error={error}
        onCancel={() => {
          setForm(saved);
          save.reset();
        }}
        onSave={() => save.mutate()}
      />

      {editingBrand && (
        <BrandDialog
          project={project}
          brand={brand}
          onClose={() => setEditingBrand(false)}
          onSaved={() => {
            setEditingBrand(false);
            refresh();
          }}
        />
      )}
      <Modal open={mapOpen} onOpenChange={setMapOpen} closeButton title={t("markets")} description={t("marketsHint")} className="sm:w-[min(64rem,94vw)]">
        <MarketMap large city={form.city} onChoose={(city) => set("city", city)} />
      </Modal>
    </>
  );
}
