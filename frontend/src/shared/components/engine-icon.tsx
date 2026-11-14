import { RobotIcon as Bot } from "@phosphor-icons/react/dist/ssr/Robot";
import { MagnifyingGlassIcon as Search } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { SparkleIcon as Sparkles } from "@phosphor-icons/react/dist/ssr/Sparkle";
import type { EngineKey } from "@/shared/constants";
import { cn } from "@/shared/helpers/utils";

// Generic icons, not the companies' logos
const ICONS = { chatgpt: Bot, gemini: Sparkles, yandex: Search } as const;

export function EngineIcon({ engine, className }: { engine: EngineKey; className?: string }) {
  const Icon = ICONS[engine];
  return <Icon aria-hidden className={cn("size-4 shrink-0", className)} />;
}
