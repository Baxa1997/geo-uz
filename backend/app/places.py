"""Where an assistant is told the customer is (report spec §9.1, §9.4; Phase 0 item 0.7).

Every call is told a city: the project's own, or when it has none its market's main city (Uzbekistan Tashkent,
Kazakhstan Almaty, Kyrgyzstan Bishkek: the user's decision, 21 Nov 2026), with the country's time zone. ChatGPT's
search tool takes them as its `user_location`; Gemini on Vertex takes the city's latitude and longitude for its
Google Search grounding (`toolConfig.retrievalConfig.latLng`) when the city is one of `COORDINATES`, and is told
the place in a sentence of its instructions besides.
"""

from __future__ import annotations

import re
from typing import Dict, Optional, Tuple

TIMEZONES = {"UZ": "Asia/Tashkent", "KZ": "Asia/Almaty", "KG": "Asia/Bishkek", "TJ": "Asia/Dushanbe", "TM": "Asia/Ashgabat"}
# A market's main city, told when the project has none (spec §9.1: UZ Tashkent, KZ Almaty, KG Bishkek)
MAIN_CITY = {"UZ": "Tashkent", "KZ": "Almaty", "KG": "Bishkek"}

# The centres of the cities a project is most likely in, by every spelling it may be written in (English,
# Uzbek Latin, Russian), for Gemini's grounding. A city not here gets no coordinates: Gemini is told it in words.
_CITIES: Dict[Tuple[float, float], Tuple[str, ...]] = {
    (41.2995, 69.2401): ("tashkent", "toshkent", "ташкент"),
    (39.6542, 66.9597): ("samarkand", "samarqand", "самарканд"),
    (39.7747, 64.4286): ("bukhara", "buxoro", "бухара"),
    (40.9983, 71.6726): ("namangan", "наманган"),
    (40.7821, 72.3442): ("andijan", "andijon", "андижан"),
    (40.3864, 71.7864): ("fergana", "fargona", "farg'ona", "фергана"),
    (42.4600, 59.6100): ("nukus", "нукус"),
    (38.8606, 65.7891): ("karshi", "qarshi", "карши"),
    (40.0844, 65.3792): ("navoi", "navoiy", "навои"),
    (41.5500, 60.6333): ("urgench", "urganch", "ургенч"),
    (37.2242, 67.2783): ("termez", "termiz", "термез"),
    (40.1158, 67.8422): ("jizzakh", "jizzax", "джизак"),
    (43.2389, 76.8897): ("almaty", "алматы"),
    (51.1694, 71.4491): ("astana", "астана"),
    (42.8746, 74.5698): ("bishkek", "бишкек"),
    (40.5283, 72.7985): ("osh", "ош"),
}
COORDINATES: Dict[str, Tuple[float, float]] = {spelling: spot for spot, spellings in _CITIES.items() for spelling in spellings}


def place(country: str, city: Optional[str]) -> Tuple[str, str, str]:
    """What a call is told: the country, the city (the project's, else its market's main city, else none) and
    the country's time zone."""
    country = country or ""
    return country, (city or "").strip() or MAIN_CITY.get(country, ""), TIMEZONES.get(country, "")


def coordinates(city: Optional[str]) -> Optional[Tuple[float, float]]:
    """A city's latitude and longitude, whatever its spelling or the words around it ("Tashkent city"), or None."""
    words = re.sub(r"[ʻʼ‘’`]", "'", (city or "").lower())
    for word in [words.strip(), *re.findall(r"[\w']+", words)]:
        if word in COORDINATES:
            return COORDINATES[word]
        if word.replace("'", "") in COORDINATES:
            return COORDINATES[word.replace("'", "")]
    return None
