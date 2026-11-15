import { redirect } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";

/**
 * A new project starts the way a first one does (the user's correction, 15 Nov: the old form here offered six
 * fields of business and six cities): the website, the first check on it, then the setup filled in from it.
 */
export default async function NewProjectPage({ params }: PageProps<"/[locale]/projects/new">) {
  const locale = setPageLocale((await params).locale);
  redirect({ href: "/onboarding/first-run", locale });
}
