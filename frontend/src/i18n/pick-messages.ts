import type { AbstractIntlMessages } from "next-intl";

/**
 * The parts of the messages a page's client components need, by dotted path ("Landing.nav"). Whatever
 * NextIntlClientProvider is given travels to the browser inside the page, so a public page should be
 * given only these: the whole catalog is several times the landing page's own text.
 */
export function pickMessages(messages: AbstractIntlMessages, paths: readonly string[]): AbstractIntlMessages {
  const picked: AbstractIntlMessages = {};
  for (const path of paths) {
    const keys = path.split(".");
    let source: AbstractIntlMessages | string | undefined = messages;
    let target = picked;
    keys.forEach((key, index) => {
      source = typeof source === "object" ? source[key] : undefined;
      if (source === undefined) throw new Error(`pickMessages: no messages at "${path}"`);
      if (index === keys.length - 1) target[key] = source;
      else target = (target[key] ??= {}) as AbstractIntlMessages;
    });
  }
  return picked;
}
