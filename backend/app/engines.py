"""The assistants a customer's question is asked to, each answering in one shape.

ChatGPT goes through OpenAI's Responses API with web search (the pilot script's client). Gemini goes through
Vertex AI's `generateContent` with Google Search when `GOOGLE_CLOUD_PROJECT` is set (the way the user's other
project on the same server reaches it: a credentials file and a plain POST), else through Google's
Interactions API with a key.

The models that read and write for us (who an answer names, a website's profile and questions, a conclusion,
a brief) are Gemini's on Vertex too when a Google Cloud project is set (`READ_MODEL`, `WRITE_MODEL`). Measured
on 15 Nov 2026 on a saved run's ten answers: Gemini 4 Hydrogen, Gemini 4 Argon and Gemini 3.6 Flash each read
them as OpenAI's model had, but the two Gemini 4 models now and then held a call for 70 to 130 seconds. So
such a call has a time limit, after which a Flash model does it, and OpenAI's model after that. Since the
same day the Flash model is Gemini 3.8 Flash (the user's choice), for asking, reading and standing in.
"""

from __future__ import annotations

import json
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
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
# An answer grounded with Google Search on Vertex, in US dollars: Google's list price per grounded request.
# Tokens come on top and aren't priced here, so the total is a floor until a real run is measured.
VERTEX_GROUNDED_USD = 0.035
# US dollars per million tokens (input, output) of the Gemini models that read and write for us. Thinking
# tokens are billed as output. Hydrogen's is the launch price (12 Nov 2026) as price lists give it; Argon's
# doubles on 1 Dec 2026 and the Flash models' on 1 Jan 2027. A model that isn't here is counted as costing
# nothing: add its line.
GEMINI_PRICES: Dict[str, tuple] = {
    "gemini-4-hydrogen": (1.50, 7.50),
    "gemini-4-argon": (2.0, 10.0),
    "gemini-3.6-flash": (0.75, 3.75),
    "gemini-3.8-flash": (0.75, 3.75),
}
# Who does a reading or writing call when its model fails or is too slow: this Gemini model, then OpenAI's
STANDIN_MODEL = "gemini-3.8-flash"
FALLBACK_MODEL = "gpt-6.1-terra"
# Seconds a reading and a writing call may take before the stand-in does it (a usual one: 4-14 and 20-30)
# Seconds an answer with Google Search may take before it is asked again: a usual one takes 12 to 30, and
# a held one has taken five minutes (15 Nov 2026: ten answers took 348 seconds because of them)
ASK_SECONDS = 75
READ_SECONDS = 30
WRITE_SECONDS = 60


class EngineError(RuntimeError):
    pass


def ask(engine: str, question: str, country: str, city: str, timezone: str) -> Dict[str, Any]:
    """One question in a new conversation with web search on: the text, the pages cited, the searches run, the cost."""
    if engine == "chatgpt":
        return _chatgpt(question, country, city, timezone)
    if engine == "gemini":
        return _gemini(question, country, city)
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


_vertex_token: Dict[str, Any] = {"token": None, "expiry": 0.0}
_vertex_lock = threading.Lock()


def _vertex_bearer() -> str:
    """A Google Cloud access token from the credentials file, kept until five minutes before it expires."""
    with _vertex_lock:
        if _vertex_token["token"] and time.time() < _vertex_token["expiry"] - 300:
            return _vertex_token["token"]
        try:
            from google.auth import default as credentials_default
            from google.auth.transport.requests import Request as AuthRequest

            credentials, _ = credentials_default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
            credentials.refresh(AuthRequest())
        except Exception as error:  # no library, no file, or Google unreachable
            raise EngineError(f"Vertex credentials: {error}") from error
        _vertex_token["token"] = credentials.token
        _vertex_token["expiry"] = credentials.expiry.timestamp() if credentials.expiry else time.time() + 3000
        return credentials.token


def _landing(url: str) -> str:
    """Vertex cites pages through its own redirect links: the address the link leads to, or the link itself."""
    if "grounding-api-redirect" not in url:
        return url
    try:
        request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": web.USER_AGENT})
        with urllib.request.urlopen(request, timeout=8) as reply:
            return reply.geturl()
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        return url


def _vertex(model: str, body: Dict[str, Any], seconds: int = 300, patient: bool = True) -> Dict[str, Any]:
    """One `generateContent` on Vertex. Retries rate limits and server errors twice; a call that runs out
    of time is tried again only when `patient`."""
    location = settings.google_cloud_location
    host = "aiplatform.googleapis.com" if location == "global" else f"{location}-aiplatform.googleapis.com"
    url = f"https://{host}/v1/projects/{settings.google_cloud_project}/locations/{location}/publishers/google/models/{model}:generateContent"
    for attempt in range(3):
        request = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers={"Authorization": f"Bearer {_vertex_bearer()}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")[:300]
            if attempt < 2 and (error.code == 429 or error.code >= 500):
                time.sleep(4 * 2**attempt)
                continue
            raise EngineError(f"Vertex answered {error.code}: {detail}") from error
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            if attempt < 2 and patient:
                time.sleep(4 * 2**attempt)
                continue
            raise EngineError(f"Vertex could not be reached: {error}") from error
    raise EngineError("Vertex gave no answer")


def _text(reply: Dict[str, Any]) -> str:
    candidate = (reply.get("candidates") or [{}])[0]
    return "".join(part.get("text") or "" for part in (candidate.get("content") or {}).get("parts") or [] if not part.get("thought"))


def _gemini_vertex(question: str, country: str, city: str) -> Dict[str, Any]:
    body: Dict[str, Any] = {"contents": [{"role": "user", "parts": [{"text": question}]}], "tools": [{"googleSearch": {}}]}
    # Where the customer is, as the Gemini app knows it of its user and as ChatGPT's search tool is told.
    # Nothing else is added to the question.
    place = ", ".join(part for part in (city, f"country code {country}" if country else "") if part)
    if place:
        body["systemInstruction"] = {"parts": [{"text": f"The user's location: {place}."}]}
    reply = _vertex(settings.gemini_model, body, ASK_SECONDS)
    # Google Search is on, but Gemini decides itself whether to search, and now and then answers from memory
    # (one answer in five on gemini-3.8-flash, 15 Nov 2026). Such an answer has no sources: asked once more.
    if not ((reply.get("candidates") or [{}])[0].get("groundingMetadata") or {}).get("groundingChunks"):
        again = _vertex(settings.gemini_model, body, ASK_SECONDS)
        if ((again.get("candidates") or [{}])[0].get("groundingMetadata") or {}).get("groundingChunks"):
            reply = again
    candidate = (reply.get("candidates") or [{}])[0]
    text = _text(reply)
    grounding = candidate.get("groundingMetadata") or {}
    pages = [chunk["web"] for chunk in grounding.get("groundingChunks") or [] if (chunk.get("web") or {}).get("uri")]
    with ThreadPoolExecutor(max_workers=6) as pool:
        landed = list(pool.map(lambda page: _landing(page["uri"]), pages))
    citations: List[Dict[str, Optional[str]]] = []
    for page, address in zip(pages, landed):
        # A link that didn't resolve still names its site: Vertex puts the site's domain in the title
        if "grounding-api-redirect" in address and "." in (page.get("title") or ""):
            address = f"https://{page['title'].strip()}"
        if all(address != seen["url"] for seen in citations):
            citations.append({"url": address, "title": page.get("title")})
    searches = list(grounding.get("webSearchQueries") or [])
    return {"engine": "gemini", "model": settings.gemini_model, "text": text, "citations": citations, "searches": searches, "usd": VERTEX_GROUNDED_USD if searches or citations else 0.0}


def _gemini(question: str, country: str = "", city: str = "") -> Dict[str, Any]:
    if settings.google_cloud_project:
        return _gemini_vertex(question, country, city)
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


def _plain(schema: Any) -> Any:
    """Our JSON schemas in the form Vertex's `responseSchema` takes: without `additionalProperties`."""
    if isinstance(schema, dict):
        return {key: _plain(value) for key, value in schema.items() if key != "additionalProperties"}
    return [_plain(item) for item in schema] if isinstance(schema, list) else schema


def _gemini_structured(model: str, instructions: str, content: str, schema: Dict[str, Any], seconds: int) -> Any:
    reply = _vertex(
        model,
        {
            "systemInstruction": {"parts": [{"text": instructions}]},
            "contents": [{"role": "user", "parts": [{"text": content}]}],
            "generationConfig": {"responseMimeType": "application/json", "responseSchema": _plain(schema)},
        },
        seconds,
        patient=False,
    )
    try:
        answer = json.loads(_text(reply))
    except ValueError as error:
        raise EngineError(f"{model} gave no JSON: {(reply.get('candidates') or [{}])[0].get('finishReason')}") from error
    usage = reply.get("usageMetadata") or {}
    price = next((GEMINI_PRICES[name] for name in sorted(GEMINI_PRICES, key=len, reverse=True) if model.startswith(name)), (0.0, 0.0))
    usd = usage.get("promptTokenCount", 0) / 1e6 * price[0] + (usage.get("candidatesTokenCount", 0) + usage.get("thoughtsTokenCount", 0)) / 1e6 * price[1]
    return answer, usd


def _structured(model: str, instructions: str, content: str, name: str, schema: Dict[str, Any], seconds: int) -> Any:
    if model.startswith("gemini") and settings.google_cloud_project:
        for gemini in dict.fromkeys([model, STANDIN_MODEL]):
            try:
                return _gemini_structured(gemini, instructions, content, schema, seconds)
            except EngineError as error:
                failure = error
                print(f"{name}: {gemini} failed: {error}")
        if not settings.openai_key:
            raise failure
    try:
        answer, response = llm.structured(FALLBACK_MODEL if model.startswith("gemini") else model, instructions, content, name, schema)
    except llm.LlmError as error:
        raise EngineError(str(error)) from error
    return answer, llm.cost_of(response)["usd"] or 0.0


def read(instructions: str, content: str, name: str, schema: Dict[str, Any]) -> Any:
    """Has the reading model answer in a JSON schema (who an answer names, which spellings are one business,
    which statements are wrong). Returns the answer and what the call cost."""
    return _structured(settings.read_model, instructions, content, name, schema, READ_SECONDS)


def write(instructions: str, content: str, name: str, schema: Dict[str, Any]) -> Any:
    """The same with the writing model: a website's profile and questions, a conclusion, a page's brief."""
    return _structured(settings.write_model, instructions, content, name, schema, WRITE_SECONDS)


__all__ = ["ENGINE_NAMES", "EngineError", "ask", "read", "write", "web"]
