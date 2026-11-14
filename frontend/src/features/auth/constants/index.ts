/** The shape of an email address, as the backend checks it. */
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Login codes are 6 digits. */
export const CODE_LENGTH = 6;

/** Tall, soft inputs of the login screen. */
export const AUTH_INPUT = "h-12 rounded-xl bg-background px-3.5 text-base shadow-xs md:text-base";

/** Points on the dark panel next to the login form; keys in messages/Login.panel.items. */
export const PANEL_POINTS = ["real", "competitors", "telegram"] as const;
