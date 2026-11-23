"""Why AI names others and not the client (`app/research.py`, report spec §4.5, 23 Nov 2026): the lost questions found
in a check, the rival's own cited page picked, and what the model returns checked in code before it is kept. Nothing is
fetched or asked: the pages and the model's answers are written here."""

from __future__ import annotations

from typing import Any, Dict, List

from app import engines, research

CLIENT = "client-id"
RIVAL = "rival-id"
SITE = "[https://client.example/]\nClient Bots builds chat bots for shops in Tashkent. Prices from 990 000 so'm a month.\n\n[https://client.example/contacts]\nCall +998 90 123 45 67."
PAGE = "Rivalbot connects to two payment systems. Setup takes one day. Plans from 290 000 so'm. Works in Uzbek and Russian."


def answer(text: str, mentions: List[str], others: List[str], cited: List[str]) -> Dict[str, Any]:
    return {"engine": "chatgpt", "text": text, "mentions": [{"brandId": brand} for brand in mentions], "others": others, "citations": [{"url": url, "domain": url.split("/")[2], "title": None} for url in cited]}


def words(english: str) -> Dict[str, str]:
    return {"uz": f"{english} (uz)", "ru": f"{english} (ru)", "en": english}


def report(*results: Dict[str, Any]) -> Dict[str, Any]:
    return {"project": {"brand": {"id": CLIENT}}, "prompts": list(results)}


def result(prompt_id: str, *answers: Dict[str, Any]) -> Dict[str, Any]:
    return {"prompt": {"id": prompt_id, "text": f"Question {prompt_id}?", "language": "ru", "topic": "t"}, "answers": list(answers)}


def test_the_lost_questions_and_the_rivals_own_page() -> None:
    rivals = {RIVAL: ("Tracked Rival", "tracked.example")}
    found = research.lost_questions(
        report(
            # Named the client: not lost
            result("won", answer("Client Bots and Rivalbot.", [CLIENT], ["Rivalbot"], ["https://rivalbot.example/a"])),
            # Rivalbot named, its own page cited: compared with it
            result("lost", answer("Try OtherChat. Rivalbot is the best for shops.", [], ["OtherChat", "Rivalbot"], ["https://blog.example/x", "https://rivalbot.example/shops"])),
            # A tracked rival named, its site cited by its domain
            result("tracked", answer("Tracked Rival does it.", [RIVAL], [], ["https://www.tracked.example/p"])),
            # Someone named, no page of theirs: kept, with no page to compare
            result("no-page", answer("Ask NamedBot.uz.", [], ["NamedBot.uz"], ["https://news.example/n"])),
            # Nobody named: no question to research
            result("open", answer("It depends on your needs.", [], [], [])),
        ),
        rivals,
    )
    assert [question["prompt"]["id"] for question in found] == ["lost", "tracked", "no-page"]
    lost, tracked, no_page = found
    assert lost["name"] == "Rivalbot" and [page["url"] for page in lost["pages"]] == ["https://rivalbot.example/shops"]
    assert tracked["name"] == "Tracked Rival" and tracked["tracked"] and tracked["pages"][0]["url"] == "https://www.tracked.example/p"
    assert no_page["name"] == "NamedBot.uz" and no_page["pages"] == []
    # The sentence about the business is the answer's own, cut by code
    assert research.sentence_about(lost["answer"]["text"], "Rivalbot") == "Rivalbot is the best for shops."
    # The answer's Markdown is left out of its words
    assert research.sentence_about("Qisqa javob:** **OtherChat**ni sinab ko‘ring.", "OtherChat") == "Qisqa javob: OtherChatni sinab ko‘ring."


def test_only_what_the_pages_say_is_kept(monkeypatch: Any) -> None:
    def model(instructions: str, content: str, name: str, schema: Dict[str, Any]) -> Any:
        return {
            "their_passage": "Rivalbot connects to two payment systems.",
            "missing": [
                {"fact": words("Payment integrations"), "quote": "connects to two payment systems"},
                # Not on the page: dropped
                {"fact": words("A free trial"), "quote": "Try it free for 30 days"},
                # A figure in the fact: dropped (the model never types a number)
                {"fact": words("Setup in 1 day"), "quote": "Setup takes one day"},
                # A language missing: dropped
                {"fact": {"en": "Fast setup", "ru": "", "uz": "Tez ulanish"}, "quote": "Setup takes one day"},
                {"fact": words("Both languages"), "quote": "Works in Uzbek and Russian"},
            ],
            "client_url": "https://client.example/contacts",
            "client_passage": "Client Bots builds chat bots for shops in Tashkent.",
            "fix": "Client Bots connects to [payment systems]. Plans from 990 000 so'm, setup in 2 days, 24 languages.",
        }, 0.002

    monkeypatch.setattr(engines, "read", model)
    question = {"prompt": {"id": "lost", "text": "Best chat bot for shops?", "language": "ru"}, "name": "Rivalbot", "tracked": False, "answer": answer("Rivalbot is the best for shops.", [], ["Rivalbot"], ["https://rivalbot.example/shops"]), "pages": [{"url": "https://rivalbot.example/shops"}]}
    finding, usd = research.compare(question, ("https://rivalbot.example/shops", "Shops", PAGE), SITE, "en")
    assert finding["status"] == "compared" and finding["review"] == "automated" and usd == 0.002
    assert finding["theirPassage"] == "Rivalbot connects to two payment systems."
    assert [fact["fact"]["en"] for fact in finding["missing"]] == ["Payment integrations", "Both languages"]
    assert finding["clientUrl"] == "https://client.example/contacts" and finding["clientPassage"]
    # A number that is on the client's website stays; the others become blanks to fill
    assert "990 000" in finding["fix"] and "[…] days" in finding["fix"] and "[…] languages" in finding["fix"]
    assert finding["sentence"] == "Rivalbot is the best for shops."


def test_a_made_up_address_and_passage_are_dropped(monkeypatch: Any) -> None:
    monkeypatch.setattr(engines, "read", lambda *args: ({"their_passage": "We are the market leader", "missing": [], "client_url": "https://client.example/pricing", "client_passage": "We guarantee results", "fix": ""}, 0.0))
    question = {"prompt": {"id": "q", "text": "?", "language": "ru"}, "name": "Rivalbot", "tracked": False, "answer": answer("Rivalbot.", [], ["Rivalbot"], []), "pages": []}
    finding, _ = research.compare(question, ("https://rivalbot.example/", "", PAGE), SITE, "en")
    assert finding["theirPassage"] is None and finding["clientUrl"] is None and finding["clientPassage"] is None and finding["fix"] is None
    # No page of theirs, or one that can't be read: nothing asked
    assert research.compare(question, None, SITE, "en")[0]["status"] == "no_page"
    assert research.compare(question, ("https://rivalbot.example/", "", ""), SITE, "en")[0]["status"] == "unreadable"
