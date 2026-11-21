"""Where every assistant call is told the customer is (Phase 0 item 0.7, report spec §9.1): the market's main city
when a project has none, the city's coordinates for Gemini's grounding, and the slot log saying so. Nothing is
asked: Gemini's request is built and caught before it would be sent."""

from __future__ import annotations

from typing import Any, Dict, List

from app import engines, places, slots, weekly


def test_a_project_without_a_city_is_asked_from_its_markets_main_city() -> None:
    assert places.place("UZ", "") == ("UZ", "Tashkent", "Asia/Tashkent")
    assert places.place("KZ", None) == ("KZ", "Almaty", "Asia/Almaty")
    assert places.place("KG", " ") == ("KG", "Bishkek", "Asia/Bishkek")
    # Its own city wins; a country with no main city here is told the country alone
    assert places.place("UZ", "Samarqand") == ("UZ", "Samarqand", "Asia/Tashkent")
    assert places.place("DE", "") == ("DE", "", "")
    assert weekly._place("UZ", "") == ("UZ", "Tashkent", "Asia/Tashkent")


def test_a_city_has_coordinates_in_any_of_its_spellings() -> None:
    tashkent = places.coordinates("Tashkent")
    assert tashkent and places.coordinates("Toshkent") == places.coordinates("Ташкент") == places.coordinates("Tashkent city") == tashkent
    assert places.coordinates("Fargʻona") == places.coordinates("Fergana")
    assert places.coordinates("Springfield") is None and places.coordinates("") is None


def test_the_slot_log_says_how_each_assistant_was_located() -> None:
    chatgpt = slots.location("chatgpt", *places.place("UZ", ""), live=True)
    assert chatgpt == {"country": "UZ", "city": "Tashkent", "timezone": "Asia/Tashkent", "set": True, "how": "user_location"}
    gemini = slots.location("gemini", *places.place("UZ", ""), vertex=True, live=True)
    assert gemini["set"] and gemini["how"] == "lat_lng" and gemini["city"] == "Tashkent"
    # A city without coordinates is told in words only; a check rebuilt from before 0.7 had the sentence alone
    assert slots.location("gemini", "UZ", "Springfield", "", vertex=True, live=True)["how"] == "instruction"
    assert slots.location("gemini", "UZ", "Tashkent", "", vertex=True)["how"] == "instruction"


def test_gemini_is_sent_the_citys_coordinates(monkeypatch: Any) -> None:
    sent: List[Dict[str, Any]] = []

    def caught(model: str, body: Dict[str, Any], seconds: int = 300, patient: bool = True) -> Dict[str, Any]:
        sent.append(body)
        return {"candidates": [{"content": {"parts": [{"text": "An answer"}]}, "groundingMetadata": {"groundingChunks": [{"web": {"uri": "https://example.org/", "title": "example.org"}}], "webSearchQueries": ["a search"]}}]}

    monkeypatch.setattr(engines, "_vertex", caught)
    monkeypatch.setattr(engines, "_landing", lambda url: url)
    engines._gemini_vertex("Best bot?", "UZ", "Tashkent")
    body = sent[0]
    assert body["toolConfig"]["retrievalConfig"]["latLng"] == {"latitude": 41.2995, "longitude": 69.2401}
    assert body["systemInstruction"]["parts"][0]["text"] == "The user's location: Tashkent, country code UZ."
    assert body["contents"][0]["parts"][0]["text"] == "Best bot?"
    engines._gemini_vertex("Best bot?", "DE", "")
    assert "toolConfig" not in sent[-1]
