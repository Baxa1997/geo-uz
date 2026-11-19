import { AppProviders } from "@/shared/components/app-providers";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { setPageLocale } from "@/i18n/page-locale";
import { AuthPanel } from "../components/auth-panel";

/**
 * Login screen on its own: dark panel on the left (desktop), the form centered on the right. Exactly the
 * window's height (the user, 18 Nov 2026: "login … must be done full page so buttons must be always visible"):
 * the page never scrolls, and on a window too short for the form only the form's column does.
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  setPageLocale((await params).locale);

  return (
    <AppProviders>
      <div data-screen className="flex h-dvh overflow-hidden bg-muted/40">
        <aside className="hidden h-full p-3 lg:flex lg:w-[45%] xl:w-[44%]">
          <AuthPanel />
        </aside>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 justify-end p-4 sm:p-6">
            <LocaleSwitcher />
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center px-5 pb-10 sm:px-8">
              <div className="w-full max-w-md">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </AppProviders>
  );
}
