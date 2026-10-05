import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { setPageLocale } from "@/i18n/page-locale";
import { AuthPanel } from "../components/auth-panel";

/** Login screen on its own: dark panel on the left (desktop), the form centered on the right. */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  setPageLocale((await params).locale);

  return (
    <div className="flex flex-1 bg-muted/40">
      <aside className="sticky top-0 hidden h-svh p-3 lg:flex lg:w-[45%] xl:w-[44%]">
        <AuthPanel />
      </aside>
      <div className="flex min-h-svh flex-1 flex-col">
        <div className="flex justify-end p-4 sm:p-6">
          <LocaleSwitcher />
        </div>
        <main className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
