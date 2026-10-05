import { Bot, Search, Sparkles } from "lucide-react";
import type { EngineKey } from "@/shared/constants";
import { cn } from "@/shared/helpers/utils";

// Generic icons, not the companies' logos
const ICONS = { chatgpt: Bot, gemini: Sparkles, yandex: Search } as const;

export function EngineIcon({ engine, className }: { engine: EngineKey; className?: string }) {
  const Icon = ICONS[engine];
  return <Icon aria-hidden className={cn("size-4 shrink-0", className)} />;
}
