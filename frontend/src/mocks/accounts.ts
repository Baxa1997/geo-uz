// Test accounts. Any phone number or the Telegram test account logs in, and a
// new account starts with no projects (so it gets the onboarding wizard).
// DEMO_USER already owns the Oq Tabassum project.
import type { TelegramAuthRequest, User } from "@/shared/types/api";

export const DEMO_USER: User = {
  id: "usr_demo",
  name: "Dilnoza Karimova",
  phone: "+998901234567",
  telegramUsername: null,
};

/** What the Telegram Login Widget would return for the test account. */
export function telegramTestAuth(): TelegramAuthRequest {
  return {
    id: 700100200,
    first_name: "Jasur",
    last_name: "Aliyev",
    username: "jasur_aliyev",
    auth_date: Math.floor(Date.now() / 1000),
    hash: "mock",
  };
}
