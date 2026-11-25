import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";
import type { AdminUser, FirstRunStatus } from "@/shared/types/api";
import { formatDateTime } from "../helpers/format";
import { AdminTable, Empty, TeamMark, Td, Th } from "./admin-table";

/** A free check's state as a dot: done green, failed red, in the queue navy, the rest grey. */
const DOT: Partial<Record<FirstRunStatus, string>> = { done: "bg-positive", failed: "bg-negative", waiting: "bg-brand", asking: "bg-brand", reading_answers: "bg-brand" };

/** The accounts: when they joined and last logged in, their projects (each opens its report) and their free check. */
export function UsersTable({ rows }: { rows: AdminUser[] }) {
  const t = useTranslations("Admin.users");
  const locale = useLocale();
  if (rows.length === 0) return <Empty>{t("empty")}</Empty>;
  return (
    <AdminTable
      label={t("title")}
      wide
      head={
        <>
          <Th>{t("email")}</Th>
          <Th>{t("joined")}</Th>
          <Th>{t("lastLogin")}</Th>
          <Th>{t("projects")}</Th>
          <Th>{t("freeCheck")}</Th>
        </>
      }
    >
      {rows.map((row) => (
        <tr key={row.id}>
          <Td>
            <a href={`mailto:${row.email}`} className="font-medium whitespace-nowrap underline-offset-2 hover:underline">
              {row.email}
            </a>
            {row.team && <TeamMark label={t("team")} />}
            {row.name && <div className="text-xs text-muted-foreground">{row.name}</div>}
          </Td>
          <Td className="whitespace-nowrap">{formatDateTime(row.createdAt, locale)}</Td>
          <Td className="whitespace-nowrap">{row.lastLoginAt ? formatDateTime(row.lastLoginAt, locale) : <span className="text-muted-foreground">{t("unknown")}</span>}</Td>
          <Td>
            {row.projects.length > 0 ? (
              <ul className="flex flex-col gap-0.5">
                {row.projects.map((project) => (
                  <li key={project.id}>
                    <Link href={`/projects/${project.id}/report`} prefetch={false} target="_blank" className="text-brand underline-offset-2 hover:underline">
                      {project.domain}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Td>
          <Td>
            {row.freeCheck ? (
              <>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <span aria-hidden className={cn("size-2 rounded-full", DOT[row.freeCheck.status] ?? "bg-muted-foreground/50")} />
                  {t(`statuses.${row.freeCheck.status}`)}
                </span>
                <div className="text-xs text-muted-foreground">
                  {row.freeCheck.domain}
                  {row.firstChecks > 1 && ` · ${t("checksCount", { count: row.firstChecks })}`}
                </div>
              </>
            ) : (
              <span className="text-muted-foreground">{t("noCheck")}</span>
            )}
          </Td>
        </tr>
      ))}
    </AdminTable>
  );
}
