import { formatPhone } from "@/shared/helpers/phone";
import type { User } from "@/shared/types/api";

/** The name, else the email the account logs in with (an older account: its phone or Telegram name). */
export const displayName = (user: User) =>
  user.name ?? user.email ?? (user.phone ? formatPhone(user.phone) : `@${user.telegramUsername ?? ""}`);
