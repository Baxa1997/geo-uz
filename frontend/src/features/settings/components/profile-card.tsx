import { useMessages, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { labelFor } from "@/shared/helpers/labels";
import type { Project } from "@/shared/types/api";

/** The brand profile saved in onboarding, read-only until project settings can be edited. */
export function ProfileCard({ project }: { project: Project }) {
  const t = useTranslations("Settings");
  const messages = useMessages();
  const { brand } = project;
  const chips = (values: string[]) =>
    values.length ? (
      <ul className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <li key={value} className="rounded-md border bg-muted/40 px-2 py-0.5 text-sm">
            {value}
          </li>
        ))}
      </ul>
    ) : (
      <span className="text-muted-foreground">—</span>
    );
  const rows: { key: "description" | "category" | "city" | "services" | "aliases" | "competitors"; value: React.ReactNode }[] = [
    { key: "description", value: project.description || <span className="text-muted-foreground">—</span> },
    { key: "category", value: labelFor(messages.Categories, project.category) },
    { key: "city", value: labelFor(messages.Cities, project.city) },
    { key: "services", value: chips(project.services) },
    { key: "aliases", value: chips(brand.aliases) },
    { key: "competitors", value: chips(project.competitors.map((competitor) => competitor.name)) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profileTitle")}</CardTitle>
        <CardDescription>{t("profileText")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-muted/40 text-lg font-semibold">
            {brand.name.charAt(0).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{brand.name}</span>
            <span className="truncate text-sm text-muted-foreground">{brand.domain}</span>
          </div>
        </div>
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
          {rows.map(({ key, value }) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{t(`profileFields.${key}`)}</dt>
              <dd className="-mt-3 text-pretty sm:mt-0">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
