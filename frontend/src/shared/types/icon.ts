import type { ComponentType, CSSProperties } from "react";

/** Any icon of the app, a Phosphor one or one of our own (shared/components/own-icons): sized and colored by its class. */
export type AppIcon = ComponentType<{ className?: string; style?: CSSProperties; "aria-hidden"?: boolean | "true" | "false" }>;
