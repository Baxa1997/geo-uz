import type { ReactNode } from "react";
import { cn } from "@/shared/helpers/utils";
import { OnboardingHeader } from "./onboarding-header";

/**
 * The check's screen after the setup (the user, 18 Nov 2026: "full page not scrolling … buttons must be always
 * visible"): exactly the window's height, the header at the top, the content scrolling in the middle, and the
 * screen's buttons in a bar at the foot that never leaves the view. The page itself never scrolls.
 */
export function FirstRunScreen({
  who,
  wide = false,
  footer,
  children,
}: {
  who: string | null;
  /** The statistics: a table and its tabs want more room. */
  wide?: boolean;
  /** The bar at the foot: the screen's buttons. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const width = wide ? "max-w-4xl" : "max-w-3xl";
  return (
    <div data-screen className="flex h-dvh flex-col overflow-hidden">
      <OnboardingHeader who={who} />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn("mx-auto flex min-h-full w-full flex-col px-4 py-8 sm:py-12", width)}>{children}</div>
      </main>
      {footer && (
        <div className="shrink-0 border-t bg-background">
          <div className={cn("mx-auto w-full px-4 py-3 sm:py-4", width)}>{footer}</div>
        </div>
      )}
    </div>
  );
}
