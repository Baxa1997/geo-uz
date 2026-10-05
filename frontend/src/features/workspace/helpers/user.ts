import { formatPhone } from "@/shared/helpers/phone";
import type { User } from "@/shared/types/api";

/** Name from Telegram, else the phone number, else the Telegram username. */
export const displayName = (user: User) =>
  user.name ?? (user.phone ? formatPhone(user.phone) : `@${user.telegramUsername ?? ""}`);
