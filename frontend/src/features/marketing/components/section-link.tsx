import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

/**
 * A link to a section of the landing page ("/#pricing"), from the page itself or from another public
 * page. Never prefetched: on the landing page a prefetch downloads the page it is already on, once per
 * distinct link.
 */
export function SectionLink({ hash, ...props }: { hash: string } & Omit<ComponentProps<typeof Link>, "href" | "prefetch">) {
  return <Link href={{ pathname: "/", hash }} prefetch={false} {...props} />;
}
