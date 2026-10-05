import { formatPhone } from "@/shared/helpers/phone";
import type { User } from "@/shared/types/api";

/** Who is logged in, for "Logged in as …": the name, else the phone number, else the Telegram username. */
export const accountLabel = (user: User): string | null =>
  user.name ?? (user.phone ? formatPhone(user.phone) : user.telegramUsername ? `@${user.telegramUsername}` : null);
