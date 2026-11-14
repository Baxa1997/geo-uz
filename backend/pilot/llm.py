"""OpenAI's Responses API over plain HTTP: asking with web search, reading with a JSON schema, and what it cost.

No packages: the standard library only, so the script runs on any Python from 3.9.
API shapes checked against OpenAI's documentation on 14 Nov 2026 (web search tool, structured outputs, pricing).
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

API_URL = "https://api.openai.com/v1/responses"

# US dollars per million tokens (input, output), from OpenAI's pricing page on 14 Nov 2026.
# A model that isn't here is counted in tokens only: add its line before trusting the total.
PRICES: Dict[str, tuple] = {
    "gpt-6-astra": (10.0, 50.0),
    "gpt-6.1-sol": (2.0, 10.0),
    "gpt-6.1-terra": (1.0, 5.0),
    "gpt-6-luna": (0.10, 0.50),
    "gpt-5.4": (2.50, 15.0),
    "gpt-5.4-mini": (0.75, 4.50),
    "gpt-5-mini": (0.25, 2.0),
}
# One web search call; the pages it reads are billed as input tokens on top
SEARCH_CALL_USD = 0.01


class LlmError(RuntimeError):
    pass


def respond(body: Dict[str, Any], attempts: int = 4) -> Dict[str, Any]:
    """Sends one request and returns the response object. Retries rate limits and server errors."""
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise LlmError("OPENAI_API_KEY is not set")
    request = urllib.request.Request(
        API_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=600) as reply:
                response = json.loads(reply.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")[:500]
            if error.code in (408, 409, 429) or error.code >= 500:
                if attempt < attempts - 1:
                    time.sleep(5 * 2**attempt)
                    continue
            raise LlmError(f"OpenAI answered {error.code}: {detail}") from error
        except (urllib.error.URLError, TimeoutError) as error:
            if attempt < attempts - 1:
                time.sleep(5 * 2**attempt)
                continue
            raise LlmError(f"OpenAI could not be reached: {error}") from error
        if response.get("status") != "completed":
            raise LlmError(f"The response is {response.get('status')}: {response.get('incomplete_details') or response.get('error')}")
        return response
    raise LlmError("No response")


def ask(model: str, question: str, country: str, city: str, timezone: str, context: Optional[str] = None) -> Dict[str, Any]:
    """One customer's question in a new conversation, web search on, asked as from the customer's city.

    `context` is the search tool's `search_context_size` (low, medium, high): how much of the pages it reads,
    which is most of an answer's cost. None leaves the tool's default (medium).
    """
    tool: Dict[str, Any] = {"type": "web_search", "user_location": {"type": "approximate", "country": country, "city": city, "timezone": timezone}}
    if context:
        tool["search_context_size"] = context
    return respond(
        {
            "model": model,
            "input": question,
            "tools": [tool],
            # Every page the search consulted, not only the ones the answer shows as its sources
            "include": ["web_search_call.action.sources"],
        }
    )


def structured(model: str, instructions: str, content: str, name: str, schema: Dict[str, Any]) -> Any:
    """Has a model read `content` and answer in the given JSON schema. Returns the parsed answer and the response."""
    response = respond(
        {
            "model": model,
            "instructions": instructions,
            "input": content,
            "text": {"format": {"type": "json_schema", "name": name, "strict": True, "schema": schema}},
        }
    )
    return json.loads(text_of(response)), response


def _parts(response: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        part
        for item in response.get("output", [])
        if item.get("type") == "message"
        for part in item.get("content", [])
        if part.get("type") == "output_text"
    ]


def text_of(response: Dict[str, Any]) -> str:
    return "".join(part.get("text", "") for part in _parts(response))


def citations_of(response: Dict[str, Any]) -> List[Dict[str, Optional[str]]]:
    """The pages the answer shows as its sources, each once, in order."""
    seen, cited = set(), []
    for part in _parts(response):
        for note in part.get("annotations", []):
            url = clean_url(note.get("url") or "")
            if note.get("type") == "url_citation" and url and url not in seen:
                seen.add(url)
                cited.append({"url": url, "title": note.get("title")})
    return cited


def _search_actions(response: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [item.get("action") or {} for item in response.get("output", []) if item.get("type") == "web_search_call"]


def searches_of(response: Dict[str, Any]) -> List[str]:
    """The web searches the model ran, in order. The API gives one `query` or a list of `queries`."""
    queries: List[str] = []
    for action in _search_actions(response):
        for query in [action.get("query")] + list(action.get("queries") or []):
            if query and query not in queries:
                queries.append(query)
    return queries


def consulted_of(response: Dict[str, Any]) -> List[str]:
    """Every page the search consulted (retrieved), cited in the answer or not."""
    urls: List[str] = []
    for action in _search_actions(response):
        for source in action.get("sources") or []:
            url = clean_url(source.get("url") or "")
            if url and url not in urls:
                urls.append(url)
    return urls


def clean_url(url: str) -> str:
    """Without the `utm_source=openai` tag the search tool adds."""
    for tag in ("?utm_source=openai", "&utm_source=openai"):
        url = url.replace(tag, "")
    return url.rstrip("?&")


def cost_of(response: Dict[str, Any]) -> Dict[str, Any]:
    """Tokens, search calls and, when the model's price is known, dollars for one response."""
    usage = response.get("usage") or {}
    tokens_in, tokens_out = usage.get("input_tokens", 0), usage.get("output_tokens", 0)
    searches = sum(1 for action in _search_actions(response) if action.get("type", "search") == "search")
    model = str(response.get("model", ""))
    price = next((PRICES[name] for name in sorted(PRICES, key=len, reverse=True) if model.startswith(name)), None)
    usd = None if price is None else tokens_in / 1e6 * price[0] + tokens_out / 1e6 * price[1] + searches * SEARCH_CALL_USD
    return {"model": model, "input_tokens": tokens_in, "output_tokens": tokens_out, "searches": searches, "usd": usd}
