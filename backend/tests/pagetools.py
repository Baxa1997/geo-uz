"""What the page tests read: the rendered report as a small tree of elements, and the servers that render it.

`Site` starts a backend on the tests' database and a frontend dev server reading from it, and stops both.
`Page` is one page's HTML as a tree, with the readers the acceptance tests use: a value marked `data-metric`,
a block marked `data-block`, a cited site's row (`data-domain`, `data-type`), the section numbers, headings
with nothing under them, and every percentage with the count it stands on (`data-k`, `data-n`).
"""

from __future__ import annotations

import json
import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple

BACKEND = Path(__file__).resolve().parent.parent
FRONTEND = BACKEND.parent / "frontend"

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
# Never read as text: scripts carry the page's data as JSON, which a reader doesn't see
HIDDEN = {"script", "style", "template", "noscript"}
# Elements that start a new line of text, so words of two cells don't run together
BLOCK = {
    "address", "article", "aside", "blockquote", "br", "button", "dd", "details", "div", "dl", "dt", "figcaption", "figure",
    "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "pre", "section",
    "summary", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul",
}
FRACTION = re.compile(r"(\d+)\s*(?:/|of)\s*(\d+)")
PERCENT = re.compile(r"(\d+(?:[.,]\d+)?)\s*%")


class Node:
    """An element: its tag, attributes, children (elements and text) and parent."""

    def __init__(self, tag: str, attrs: Dict[str, str], parent: Optional["Node"]) -> None:
        self.tag, self.attrs, self.parent = tag, attrs, parent
        self.children: List[Any] = []

    def walk(self) -> Iterator["Node"]:
        for child in self.children:
            if isinstance(child, Node):
                yield child
                yield from child.walk()

    def ancestors(self) -> Iterator["Node"]:
        node = self.parent
        while node is not None:
            yield node
            node = node.parent

    def find_all(self, attr: str, value: Optional[str] = None) -> List["Node"]:
        return [node for node in self.walk() if attr in node.attrs and (value is None or node.attrs[attr] == value)]

    def find(self, attr: str, value: Optional[str] = None) -> Optional["Node"]:
        return next(iter(self.find_all(attr, value)), None)

    @property
    def text(self) -> str:
        """The text a reader sees in it, one space between words."""
        parts: List[str] = []
        self._text(parts)
        return " ".join("".join(parts).split())

    def _text(self, parts: List[str]) -> None:
        for child in self.children:
            if isinstance(child, str):
                parts.append(child)
            elif child.tag not in HIDDEN:
                gap = " " if child.tag in BLOCK else ""
                parts.append(gap)
                child._text(parts)
                parts.append(gap)

    def links(self) -> List[str]:
        return [node.attrs["href"] for node in self.walk() if node.tag == "a" and node.attrs.get("href")]

    def has_content(self) -> bool:
        return bool(self.text) or any(node.tag in ("svg", "img", "table", "canvas") for node in self.walk())


class _Builder(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("#document", {}, None)
        self.current = self.root

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        node = Node(tag, {name: value or "" for name, value in attrs}, self.current)
        self.current.children.append(node)
        if tag not in VOID:
            self.current = node

    def handle_startendtag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        self.current.children.append(Node(tag, {name: value or "" for name, value in attrs}, self.current))

    def handle_endtag(self, tag: str) -> None:
        # Closes the nearest open element of this tag; a stray end tag changes nothing
        node: Optional[Node] = self.current
        while node is not None and node.tag != tag:
            node = node.parent
        if node is not None and node.parent is not None:
            self.current = node.parent

    def handle_data(self, data: str) -> None:
        self.current.children.append(data)


def _place_streamed(root: Node) -> None:
    """React sends a part of the page that was late as `<div hidden id="S:n">` at the end, and a script moves its
    content into the place held by `<template id="P:n">`. A browser runs that script; this reader doesn't, so it
    moves them the same way, until none is left (a late part may hold the places of others). Seen on 21 Nov 2026:
    the evidence cards' contents (Phase 0 item 0.5) arrived that way, and read empty where they stand."""
    # A part is held in a `<div hidden>`, or inside a table in a `<tbody>` or `<tr>` (of a `<table hidden>`)
    segments = {node.attrs["id"][2:]: node for node in root.walk() if node.tag in ("div", "tbody", "tr") and node.attrs.get("id", "").startswith("S:")}
    for _ in range(len(segments) + 1):
        moved = False
        for node in list(root.walk()):
            segment = segments.get(node.attrs.get("id", "")[2:]) if node.tag == "template" and node.attrs.get("id", "").startswith("P:") else None
            if segment is None or segment.parent is None or node.parent is None:
                continue
            segment.parent.children.remove(segment)
            for child in segment.children:
                if isinstance(child, Node):
                    child.parent = node.parent
            at = node.parent.children.index(node)
            node.parent.children[at : at + 1] = segment.children
            segment.parent = None
            moved = True
        if not moved:
            break


class Page:
    def __init__(self, html: str, url: str = "") -> None:
        builder = _Builder()
        builder.feed(html)
        builder.close()
        _place_streamed(builder.root)
        self.root, self.html, self.url = builder.root, html, url

    @property
    def text(self) -> str:
        return self.root.text

    def metric(self, key: str) -> Optional[str]:
        """The text of the element marked `data-metric="<key>"`, or None when the page has none."""
        node = self.root.find("data-metric", key)
        return node.text if node else None

    def metric_keys(self, prefix: str = "") -> List[str]:
        return [node.attrs["data-metric"] for node in self.root.find_all("data-metric") if node.attrs["data-metric"].startswith(prefix)]

    def number(self, key: str) -> Optional[int]:
        """The first whole number a metric shows."""
        match = re.search(r"\d+", self.metric(key) or "")
        return int(match.group()) if match else None

    def fraction(self, key: str) -> Optional[Tuple[int, int]]:
        """A count a metric shows as "k/n" (or "k of n")."""
        match = FRACTION.search(self.metric(key) or "")
        return (int(match.group(1)), int(match.group(2))) if match else None

    def block(self, name: str) -> Optional[Node]:
        return self.root.find("data-block", name)

    def section(self, key: str) -> Optional[Node]:
        return next((node for node in self.root.walk() if node.tag == "section" and node.attrs.get("id") == key), None)

    def domains(self) -> Dict[str, str]:
        """Each cited site's row: its domain and the type it is shown with."""
        return {node.attrs["data-domain"]: node.attrs.get("data-type", "") for node in self.root.find_all("data-domain")}

    def section_numbers(self) -> List[int]:
        """The numbers the sections' titles start with ("3. Key figures"), in the page's order."""
        numbers = []
        for node in self.root.walk():
            match = re.match(r"(\d+)\.", node.text) if node.tag == "h2" else None
            if match:
                numbers.append(int(match.group(1)))
        return numbers

    def empty_headings(self) -> List[str]:
        """Headings with nothing under them: a section with nothing beyond the header its title is in, or a
        block's title with nothing after it in its block."""
        empty = []
        for node in self.root.walk():
            if node.tag == "h2":
                section = next((up for up in node.ancestors() if up.tag == "section"), None)
                header = next((up for up in node.ancestors() if up.tag == "header"), None)
                rest = [child for child in (section.children if section else []) if isinstance(child, Node) and child is not header]
                if section is not None and not any(child.has_content() for child in rest):
                    empty.append(node.text)
            elif node.tag == "h3" and node.parent is not None:
                after = node.parent.children[node.parent.children.index(node) + 1 :]
                if not any(child.has_content() if isinstance(child, Node) else child.strip() for child in after):
                    empty.append(node.text)
        return empty

    def percentages(self) -> List[Tuple[str, Optional[int], Optional[int]]]:
        """Every percentage a reader sees, with the count it stands on: the `data-k` and `data-n` of the
        nearest element that carries both, else None. Glossary examples (`data-example`) are left out, and so are
        the answers quoted word for word as evidence (`data-verbatim`, Phase 0 item 0.5): a percentage an
        assistant wrote is its, not a number of the report's."""
        found: List[Tuple[str, Optional[int], Optional[int]]] = []

        def visit(node: Node) -> None:
            if node.tag in HIDDEN or "data-example" in node.attrs or "data-verbatim" in node.attrs:
                return
            for child in node.children:
                if isinstance(child, Node):
                    visit(child)
                    continue
                for match in PERCENT.finditer(child):
                    holder = next((up for up in [node, *node.ancestors()] if "data-k" in up.attrs and "data-n" in up.attrs), None)
                    found.append((match.group(1), int(holder.attrs["data-k"]) if holder else None, int(holder.attrs["data-n"]) if holder else None))

        visit(self.root)
        return found


class SiteError(RuntimeError):
    """The servers couldn't be started; the message says why, with the end of their logs."""


class SiteBusy(SiteError):
    """Something on this computer stands in the way (the frontend's own dev server): the tests are skipped."""


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def npm() -> Optional[str]:
    """npm on the PATH, else the newest one nvm installed (on this computer node isn't on the shell's path)."""
    found = shutil.which("npm")
    if found:
        return found
    installed = sorted(Path.home().glob(".nvm/versions/node/*/bin/npm"), key=lambda path: [int(part) for part in re.findall(r"\d+", path.parent.parent.name)])
    return str(installed[-1]) if installed else None


def dev_server_running() -> Optional[str]:
    """The frontend's own dev server, when one runs: Next 16 allows one per project and keeps its lock at
    `.next/dev/lock` (its process id, port and address)."""
    lock = FRONTEND / ".next" / "dev" / "lock"
    if not lock.exists():
        return None
    text = lock.read_text(errors="replace")
    try:
        pid: Optional[int] = int(json.loads(text)["pid"])
    except (ValueError, TypeError, KeyError):
        match = re.search(r"\d+", text)
        pid = int(match.group()) if match else None
    if pid is None:
        return f"a lock at {lock} that names no process"
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return None  # a lock left behind by a server that stopped
    except PermissionError:
        pass
    return f"process {pid}"


class Site:
    """A backend on the tests' database and a frontend dev server reading from it, on ports of their own."""

    def __init__(self, backend_env: Dict[str, str], logs: Path) -> None:
        self.backend_env, self.logs = backend_env, logs
        self.api_url = f"http://127.0.0.1:{free_port()}"
        self.web_url = f"http://127.0.0.1:{free_port()}"
        self.processes: List[Tuple[str, subprocess.Popen, Any]] = []

    def start(self) -> None:
        running = dev_server_running()
        if running:
            raise SiteBusy(f"The frontend's dev server is running ({running}). Next allows one per project: stop it to run the page tests.")
        node = npm()
        if node is None:
            raise SiteBusy("npm isn't on the PATH or under ~/.nvm: the page tests need it to start the frontend.")
        api_port = self.api_url.rsplit(":", 1)[1]
        self._spawn("backend", [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", api_port], BACKEND, {**os.environ, **self.backend_env})
        self._wait(f"{self.api_url}/health", 60)
        web_env = {
            **os.environ,
            "NEXT_PUBLIC_API_URL": self.api_url,
            "NEXT_PUBLIC_LIVE": "auth,first-run,projects",
            "NEXT_PUBLIC_USE_MOCKS": "true",
            "NEXT_TELEMETRY_DISABLED": "1",
            "PATH": f"{Path(node).parent}{os.pathsep}{os.environ.get('PATH', '')}",
        }
        self._spawn("frontend", [node, "run", "dev", "--", "--hostname", "127.0.0.1", "--port", self.web_url.rsplit(":", 1)[1]], FRONTEND, web_env)
        # The rewrite to the backend answers as soon as the dev server is up, before any page is compiled
        self._wait(f"{self.web_url}/api/backend/health", 180)

    def _spawn(self, name: str, command: List[str], cwd: Path, env: Dict[str, str]) -> None:
        log = open(self.logs / f"{name}.log", "w", encoding="utf-8")
        # Its own process group: npm starts node, and both must stop with it
        process = subprocess.Popen(command, cwd=str(cwd), env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        self.processes.append((name, process, log))

    def _wait(self, url: str, seconds: float) -> None:
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            for name, process, _ in self.processes:
                if process.poll() is not None:
                    raise SiteError(f"The {name} stopped (exit {process.returncode}):\n{self.tail(name)}")
            try:
                with urllib.request.urlopen(url, timeout=5) as reply:
                    if reply.status == 200:
                        return
            except (urllib.error.URLError, OSError):
                pass
            time.sleep(0.5)
        raise SiteError(f"{url} didn't answer in {seconds:.0f} s:\n" + "\n".join(self.tail(name) for name, _, _ in self.processes))

    def tail(self, name: str, lines: int = 30) -> str:
        path = self.logs / f"{name}.log"
        return f"--- {name} ---\n" + "\n".join(path.read_text(errors="replace").splitlines()[-lines:]) if path.exists() else ""

    def stop(self) -> None:
        for _, process, log in reversed(self.processes):
            if process.poll() is None:
                try:
                    os.killpg(process.pid, signal.SIGTERM)
                    process.wait(timeout=15)
                except (ProcessLookupError, PermissionError):
                    pass
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait(timeout=5)
            log.close()
        self.processes = []

    def api(self, path: str) -> Any:
        """A backend answer, as JSON."""
        with urllib.request.urlopen(f"{self.api_url}{path}", timeout=60) as reply:
            return json.loads(reply.read().decode("utf-8"))

    def page(self, path: str, seconds: float = 300) -> Page:
        """A page as the frontend renders it on the server. The first request of a route compiles it."""
        with urllib.request.urlopen(f"{self.web_url}{path}", timeout=seconds) as reply:
            return Page(reply.read().decode("utf-8"), path)
