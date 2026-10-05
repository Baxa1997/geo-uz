"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMessages, useTranslations } from "next-intl";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import type { CreateProjectRequest } from "@/shared/types/api";
import { emptyDraft, toCreateRequest, validateBrand, validateCompetitors } from "../helpers/project-draft";
import type { DraftErrors, ProjectDraft } from "../types";
import { BrandFields } from "./brand-fields";
import { CompetitorFields } from "./competitor-fields";

/** Brand setup: name, spellings, domain, category, city and up to 3 competitors. */
export function ProjectForm() {
  const t = useTranslations("NewProject");
  const messages = useMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(() =>
    emptyDraft(Object.keys(messages.Categories)[0] ?? "", Object.keys(messages.Cities)[0] ?? ""),
  );
  const [errors, setErrors] = useState<DraftErrors>({});

  const mutation = useMutation({
    mutationFn: (body: CreateProjectRequest) => api.createProject(body),
    onSuccess: async ({ project }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      router.push(`/projects/${project.id}/prompts`);
    },
  });

  const update = (patch: Partial<ProjectDraft>) => setDraft((current) => ({ ...current, ...patch }));

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = { ...validateBrand(draft), ...validateCompetitors(draft) };
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Move focus to the first field that needs fixing
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    mutation.mutate(toCreateRequest(draft));
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-4 sm:gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("brandSection")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <BrandFields id={id} draft={draft} errors={errors} onChange={update} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("competitorsSection")}</CardTitle>
          <CardDescription>{t("competitorsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <CompetitorFields id={id} draft={draft} errors={errors} onChange={update} />
        </CardContent>
      </Card>

      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t("saveFailed")}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          {t("cancel")}
        </Link>
        <Button type="submit" size="lg" disabled={mutation.isPending || mutation.isSuccess}>
          {mutation.isPending || mutation.isSuccess ? t("submitting") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
