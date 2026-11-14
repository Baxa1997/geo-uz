"""The assistants a customer's question is asked to, each answering in one shape.

ChatGPT goes through OpenAI's Responses API with web search (the pilot script's client). Gemini goes through
Google's Interactions API with Google Search (checked against Google's documentation on 14 Nov 2026; not yet
run with a key, so its cost and answers are unmeasured).
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

from .config import BACKEND, settings

# The pilot script's OpenAI client and page reader are the tested ones: used from where they are
sys.path.insert(0, str(BACKEND / "pilot"))
import llm  # noqa: E402
import web  # noqa: E402

ENGINE_NAMES = {"chatgpt": "ChatGPT", "gemini": "Gemini"}
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
# One Google search the model runs, in US dollars (after the free monthly allowance)
GEMINI_SEARCH_USD = 0.014


class EngineError(RuntimeError):
    pass


def ask(engine: str, question: str, country: str, city: str, timezone: str) -> Dict[str, Any]:
    """One question in a new conversation with web search on: the text, the pages cited, the searches run, the cost."""
    if engine == "chatgpt":
        return _chatgpt(question, country, city, timezone)
    if engine == "gemini":
        return _gemini(question)
    raise EngineError(f"Unknown assistant: {engine}")


def _chatgpt(question: str, country: str, city: str, timezone: str) -> Dict[str, Any]:
    try:
        response = llm.ask(settings.chatgpt_model, question, country, city, timezone)
    except llm.LlmError as error:
        raise EngineError(str(error)) from error
    return {
        "engine": "chatgpt",
        "model": settings.chatgpt_model,
        "text": llm.text_of(response),
        "citations": llm.citations_of(response),
        "searches": llm.searches_of(response),
        "usd": llm.cost_of(response)["usd"],
    }


def _gemini(question: str) -> Dict[str, Any]:
    body = {"model": settings.gemini_model, "input": question, "tools": [{"type": "google_search"}]}
    request = urllib.request.Request(
        GEMINI_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={"x-goog-api-key": settings.gemini_key or "", "Content-Type": "application/json", "Api-Revision": "2026-05-20"},
    )
    reply: Optional[Dict[str, Any]] = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=300) as response:
                reply = json.loads(response.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")[:300]
            if attempt < 2 and (error.code == 429 or error.code >= 500):
                time.sleep(4 * 2**attempt)
                continue
            raise EngineError(f"Gemini answered {error.code}: {detail}") from error
        except (urllib.error.URLError, TimeoutError) as error:
            if attempt < 2:
                time.sleep(4 * 2**attempt)
                continue
            raise EngineError(f"Gemini could not be reached: {error}") from error
    if reply is None:
        raise EngineError("Gemini gave no answer")

    text: List[str] = []
    citations: List[Dict[str, Optional[str]]] = []
    searches: List[str] = []
    for step in reply.get("steps") or []:
        kind = step.get("type")
        if kind == "google_search_call":
            searches += [query for query in (step.get("arguments") or {}).get("queries") or [] if query and query not in searches]
        elif kind == "model_output":
            for block in step.get("content") or []:
                text.append(block.get("text") or "")
                for note in block.get("annotations") or []:
                    url = note.get("url")
                    if note.get("type") == "url_citation" and url and all(url != seen["url"] for seen in citations):
                        citations.append({"url": url, "title": note.get("title")})
    return {
        "engine": "gemini",
        "model": settings.gemini_model,
        "text": "".join(text),
        "citations": citations,
        "searches": searches,
        # Tokens aren't priced here yet: the search fee alone, so the total is a floor until a real run is measured
        "usd": len(searches) * GEMINI_SEARCH_USD,
    }


def read(instructions: str, content: str, name: str, schema: Dict[str, Any]) -> Any:
    """Has the reading model answer in a JSON schema. Returns the answer and what the call cost."""
    try:
        answer, response = llm.structured(settings.read_model, instructions, content, name, schema)
    except llm.LlmError as error:
        raise EngineError(str(error)) from error
    return answer, llm.cost_of(response)["usd"] or 0.0


__all__ = ["ENGINE_NAMES", "EngineError", "ask", "read", "web"]
