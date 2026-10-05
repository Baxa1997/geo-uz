import type { Metadata } from "next";
import { Construction } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { EmptyState } from "@/shared/components/empty-state";
import { Page } from "@/shared/components/page";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";

type Section = "reports";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

/** Page and metadata for a project section that isn't built yet. */
export function placeholderPage(section: Section) {
  async function generateMetadata({ params }: Props): Promise<Metadata> {
    const locale = setPageLocale((await params).locale);
    const t = await getTranslations({ locale, namespace: "Sidebar" });
    return { title: t(section) };
  }

  async function PlaceholderPage({ params }: Props) {
    const { locale: segment, id } = await params;
    const locale = setPageLocale(segment);
    const project = await getProject(id); // unknown project → 404
    const [t, placeholder] = await Promise.all([
      getTranslations({ locale, namespace: "Sidebar" }),
      getTranslations({ locale, namespace: "Placeholder" }),
    ]);

    return (
      <Page title={t(section)} engines>
        <EmptyState icon={Construction} title={placeholder("comingSoon")} text={placeholder(section)}>
          {section === "reports" && (
            <Link
              href={`/projects/${project.id}/report`}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              {placeholder("openReport")}
            </Link>
          )}
        </EmptyState>
      </Page>
    );
  }

  return { PlaceholderPage, generateMetadata };
}
