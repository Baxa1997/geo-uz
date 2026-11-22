import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { SECTION, type SectionId } from "../constants";
import { SectionLink } from "./section-link";

/**
 * Where "Check for free" leads on the public pages: the login, at once (the user, 22 Nov 2026: "check free need
 * to immediately navigate to login first login then run the check"; until then every such button scrolled back to
 * the hero's website field). After the code, an account without a project starts its free check, and one that has
 * projects opens its dashboard (`useFinishLogin`); `start=check` only makes the login page say so.
 */
export const FREE_CHECK = { pathname: "/login", query: { start: "check" } } as const;

type LinkProps = Omit<ComponentProps<typeof Link>, "href" | "prefetch">;

export function FreeCheckLink(props: LinkProps) {
  return <Link href={FREE_CHECK} {...props} />;
}

/** A card's button: the free check through the login for `SECTION.check`, else a scroll to its section. */
export function TargetLink({ target, ...props }: { target: SectionId } & LinkProps) {
  return target === SECTION.check ? <FreeCheckLink {...props} /> : <SectionLink hash={target} {...props} />;
}
