"""Reading a web page as text: the pages ChatGPT cites, and the client's own website."""

from __future__ import annotations

import re
import urllib.error
import urllib.request
from html.parser import HTMLParser
from typing import List, Optional, Tuple
from urllib.parse import urljoin, urlparse

MAX_BYTES = 2_000_000
# A plain browser's name: some sites answer nothing to an unknown client. No contact details in it.
USER_AGENT = "Mozilla/5.0 (compatible; visibility-report/1.0)"


class _Text(HTMLParser):
    """Keeps the words a visitor reads and the links, drops scripts and styles."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.chunks: List[str] = []
        self.links: List[Tuple[str, str]] = []
        self._skip = 0
        self._href: Optional[str] = None
        self._label: List[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg"):
            self._skip += 1
        elif tag == "a":
            self._href, self._label = dict(attrs).get("href"), []

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg"):
            self._skip = max(0, self._skip - 1)
        elif tag == "a" and self._href:
            self.links.append((self._href, " ".join(self._label).strip()))
            self._href = None

    def handle_data(self, data):
        if self._skip:
            return
        self.chunks.append(data)
        if self._href:
            self._label.append(data)


def domain_of(url: str) -> str:
    host = urlparse(url if "//" in url else f"https://{url}").netloc.lower()
    return host[4:] if host.startswith("www.") else host


class _Redirects(urllib.request.HTTPRedirectHandler):
    """Python before 3.11 doesn't follow a 308, which is how Vercel sends "example.com" on to "www.example.com":
    such a site read as unreadable (seen 16 Nov 2026). Followed here like a 307."""

    def http_error_308(self, req, fp, code, msg, headers):  # type: ignore[no-untyped-def]
        return self.http_error_302(req, fp, 307, msg, headers)


opener = urllib.request.build_opener(_Redirects())


def fetch(url: str, timeout: int = 20) -> Optional[Tuple[str, List[Tuple[str, str]], str]]:
    """The page's text, its links (address, label) and the address it was finally served from. None when it can't be read."""
    if "//" not in url:
        url = f"https://{url}"
    if urlparse(url).scheme not in ("http", "https"):
        return None
    try:
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "ru,uz;q=0.9,en;q=0.8"})
        with opener.open(request, timeout=timeout) as reply:
            if "html" not in reply.headers.get("Content-Type", "html"):
                return None
            raw = reply.read(MAX_BYTES)
            charset = reply.headers.get_content_charset() or "utf-8"
            final = reply.geturl()
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        return None
    parser = _Text()
    try:
        parser.feed(raw.decode(charset, "replace"))
    except Exception:  # a page broken enough to stop the parser counts as unreadable
        return None
    text = re.sub(r"\s+", " ", " ".join(parser.chunks)).strip()
    links = [(urljoin(final, href), label) for href, label in parser.links if href and not href.startswith(("#", "mailto:", "tel:", "javascript:"))]
    return text, links, final


def names(text: str, spellings: List[str]) -> bool:
    """Whether the text names the brand by any of its spellings, as whole words.

    A spelling of three letters or fewer is not looked for: an abbreviation like "TIS" sits inside other words
    and often belongs to another business too, so a match on it proves nothing.
    """
    lowered = text.casefold()
    for spelling in spellings:
        spelling = spelling.casefold().strip()
        if len(spelling) > 3 and re.search(rf"(?<!\w){re.escape(spelling)}(?!\w)", lowered):
            return True
    return False


# The pages of a business's site that hold the facts an assistant quotes: prices, programme, contacts
FACT_PAGES = re.compile(
    r"price|narx|цен|стоим|tarif|тариф|about|о-нас|о нас|biz haqimizda|haqida|contact|контакт|aloqa|bogʻlanish|"
    r"program|программ|dastur|услуг|xizmat|service|filial|филиал|branch|admission|поступлен|qabul|faq|вопрос",
    re.IGNORECASE,
)


def read_site(domain: str, language: str = "ru", pages: int = 8, limit: int = 60_000) -> List[dict]:
    """The home page and the inner pages most likely to state the business's facts, as text.

    Follows the site to where it really lives (an address that redirects to another domain), opens its version
    in the report's language when the home page links to one ("/ru"), and reads the pages whose address or
    label speaks of prices, the programme, branches, admission or contacts.
    """
    home = fetch(domain)
    if home is None:
        return []
    text, links, address = home
    site = domain_of(address)
    path = lambda url: urlparse(url).path.rstrip("/")  # noqa: E731
    if path(address) != f"/{language}":
        translated = next((href for href, _ in links if domain_of(href) == site and path(href) == f"/{language}"), None)
        version = fetch(translated) if translated else None
        if version:
            text, links, address = version
    read = [{"url": address, "text": text[: limit // 4]}]
    seen = {path(address)}
    for href, label in links:
        if len(read) > pages:
            break
        if domain_of(href) != site or path(href) in seen or not FACT_PAGES.search(f"{path(href)} {label}"):
            continue
        seen.add(path(href))
        page = fetch(href.split("#")[0])
        if page and page[0]:
            read.append({"url": page[2], "text": page[0][: limit // pages]})
    return read
