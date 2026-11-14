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


def fetch(url: str, timeout: int = 20) -> Optional[Tuple[str, List[Tuple[str, str]]]]:
    """The page's text and its links (address, label). None when it can't be read."""
    if "//" not in url:
        url = f"https://{url}"
    if urlparse(url).scheme not in ("http", "https"):
        return None
    try:
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "ru,uz;q=0.9,en;q=0.8"})
        with urllib.request.urlopen(request, timeout=timeout) as reply:
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
    return text, links


def names(text: str, spellings: List[str]) -> bool:
    """Whether the text names the brand by any of its spellings."""
    lowered = text.casefold()
    return any(spelling.casefold() in lowered for spelling in spellings if spelling.strip())


# The pages of a business's site that hold the facts an assistant quotes: prices, programme, contacts
FACT_PAGES = re.compile(
    r"price|narx|цен|стоим|tarif|тариф|about|о-нас|о нас|biz haqimizda|haqida|contact|контакт|aloqa|bogʻlanish|"
    r"program|программ|dastur|услуг|xizmat|service|filial|филиал|branch|admission|поступлен|qabul|faq|вопрос",
    re.IGNORECASE,
)


def read_site(domain: str, pages: int = 6, limit: int = 45_000) -> List[dict]:
    """The home page and the few inner pages most likely to state the business's facts, as text."""
    home = fetch(domain)
    if home is None:
        return []
    text, links = home
    read = [{"url": f"https://{domain_of(domain)}/", "text": text[: limit // 3]}]
    seen = {read[0]["url"].rstrip("/")}
    for href, label in links:
        address = href.split("#")[0].rstrip("/")
        if len(read) > pages or address in seen or domain_of(href) != domain_of(domain):
            continue
        if not FACT_PAGES.search(f"{href} {label}"):
            continue
        seen.add(address)
        page = fetch(href)
        if page and page[0]:
            read.append({"url": href, "text": page[0][: limit // pages]})
    return read
