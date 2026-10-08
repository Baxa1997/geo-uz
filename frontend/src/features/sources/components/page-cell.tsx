"use client";

import { useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { Link } from "@/i18n/navigation";
import { pathOf, shortUrl } from "@/shared/helpers/domain";
import { Initial } from "./parts";

/**
 * A cited page in a table: its title, and its address under it, as Peec's chat details show a source. The
 * address opens the page itself in a new tab. The title leads where the row leads (the answers that cite
 * the page): a link to another page, or a button when the answers are on this one. A page the search tool
 * gave no title for is named by its path.
 */
export function PageCell({
  page,
  domain,
  href,
  onOpen,
}: {
  page: { url: string; title: string | null };
  domain: string;
  /** Where the title leads; */
  href?: string;
  /** or what it does, when the answers are a tab of the same page. */
  onOpen?: () => void;
}) {
  const t = useTranslations("SourcesPage");
  const title = page.title ?? (pathOf(page.url) || domain);
  const className = "truncate text-left underline-offset-4 outline-none hover:underline focus-visible:underline";
  return (
    <span className="flex min-w-0 items-start gap-2">
      <Initial text={domain} />
      <span className="flex min-w-0 flex-col">
        {href ? (
          <Link href={href} aria-label={t("pageAnswers", { title })} className={className}>
            {title}
          </Link>
        ) : (
          <button type="button" aria-label={t("pageAnswers", { title })} onClick={onOpen} className={className}>
            {title}
          </button>
        )}
        {/* The address is cut to fit: hovering shows it whole */}
        <Hint text={page.url} described={false} className="max-w-full min-w-0">
          {() => (
            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="truncate text-xs font-normal text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:underline"
            >
              {shortUrl(page.url)}
            </a>
          )}
        </Hint>
      </span>
    </span>
  );
}
