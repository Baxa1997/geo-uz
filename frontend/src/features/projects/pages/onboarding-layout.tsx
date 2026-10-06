import { AppProviders } from "@/shared/components/app-providers";

/** The setup wizard and the first run's progress: forms that save through the data cache, in any language. */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
