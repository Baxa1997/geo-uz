import { useMessages, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { labelFor } from "@/shared/helpers/labels";
import type { Report } from "@/shared/types/api";
import { MethodLabel } from "@/shared/components/scores/method-label";

export function ReportHeader({ report }: { report: Report }) {
  const t = useTranslations("Report");
  const messages = useMessages();
  const { project } = report;

  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{t("weekly")}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{project.brand.name}</h1>
          <p className="text-sm text-muted-foreground">
            {labelFor(messages.Categories, project.category)} · {labelFor(messages.Cities, project.city)}
          </p>
        </div>
        <LocaleSwitcher />
      </div>
      <MethodLabel method={report.method} />
    </header>
  );
}
