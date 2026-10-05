/** SMS codes are 6 digits. */
export const CODE_LENGTH = 6;

/** Mock mode only: how long the pretend Telegram window takes. */
export const TELEGRAM_MOCK_DELAY_MS = 800;

/** Tall, soft inputs of the login screen. */
export const AUTH_INPUT = "h-12 rounded-xl bg-background px-3.5 text-base shadow-xs md:text-base";

/** Points on the dark panel next to the login form; keys in messages/Login.panel.items. */
export const PANEL_POINTS = ["real", "competitors", "telegram"] as const;
