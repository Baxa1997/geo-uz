import { HourglassMediumIcon as Waiting } from "@phosphor-icons/react/dist/ssr/HourglassMedium";
import { SquaresFourIcon as Overview } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import { StorefrontIcon as Projects } from "@phosphor-icons/react/dist/ssr/Storefront";
import { UsersIcon as Users } from "@phosphor-icons/react/dist/ssr/Users";
import type { AppIcon } from "@/shared/types/icon";

/**
 * The admin page's menu (25 Nov 2026, the user's "can we make different menu page for each"): each part a page of its
 * own under /admin. Texts in messages/Admin.menu.
 */
export const ADMIN_MENU: { key: "overview" | "waiting" | "projects" | "users"; path: string; icon: AppIcon }[] = [
  { key: "overview", path: "/admin", icon: Overview },
  { key: "waiting", path: "/admin/waiting", icon: Waiting },
  { key: "projects", path: "/admin/projects", icon: Projects },
  { key: "users", path: "/admin/users", icon: Users },
];

/** How many rows the overview's lists show before "See all". */
export const LATEST_ROWS = 5;

/** While a check runs, the waiting list asks the server again this often, so its answers count up. */
export const RUNNING_REFRESH_MS = 10_000;
