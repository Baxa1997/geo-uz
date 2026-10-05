import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <p className="text-5xl font-semibold">404</p>
      <h1 className="text-lg font-medium">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <Link href="/" className="text-sm underline underline-offset-4">
        {t("home")}
      </Link>
    </main>
  );
}
