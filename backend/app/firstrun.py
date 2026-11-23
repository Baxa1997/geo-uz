"""A new account's first run: a website in, every assistant asked, the first statistics out.

    read the site      its pages as text, its robots.txt and markup          -> the four site checks
    profile            who the business is, its competitors, and the questions its customers ask
    -- the owner corrects all of it (`prepare` ends here, `check` goes on from what they confirmed) --
    ask                each question once to each assistant, several at a time
    ask about it       the brand questions: what each assistant says of the business itself, by name
    read the answers   which businesses each names, in order, in what tone, and which it recommends
    one name each      the spellings of one business brought together
    count              the Snapshot the frontend draws (`frontend/src/shared/types/api.ts`)
    what it says       each brand answer as short statements, each checked against the website
    conclude           a few sentences on what the counts mean and what to do first, in the three languages

Counting is plain code. A model writes the profile, reads the answers and words the conclusion from the
counts it is given; it never produces a number.
"""

from __future__ import annotations

import datetime
import json
import re
import socket
import urllib.error
import urllib.request
from urllib.parse import urljoin
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Callable, Dict, List, Optional, Tuple

from . import domains, engines, places, slots
from .config import settings
from .engines import web

Progress = Callable[[str, int, int], None]

AI_BOTS = ["gptbot", "oai-searchbot", "chatgpt-user", "google-extended", "perplexitybot", "claudebot"]

STR = {"type": "string"}


def obj(**properties: Any) -> Dict[str, Any]:
    return {"type": "object", "properties": properties, "required": list(properties), "additionalProperties": False}


def arr(item: Dict[str, Any]) -> Dict[str, Any]:
    return {"type": "array", "items": item}


class FirstRunError(RuntimeError):
    """A run that can't go on, with a code the frontend can put into words."""

    def __init__(self, code: str, detail: str = "") -> None:
        super().__init__(detail or code)
        self.code = code


def normalize(domain: str) -> str:
    """ "https://www.Example.uz/page" -> "example.uz". Raises on what isn't a website's address."""
    host = web.domain_of(domain.strip())
    if not re.fullmatch(r"[a-z0-9а-яё]([a-z0-9а-яё-]*[a-z0-9а-яё])?(\.[a-z0-9а-яё-]+)+", host):
        raise FirstRunError("bad_domain", domain)
    return host


# --- the website ---------------------------------------------------------------------------------------


def _raw(url: str) -> Optional[str]:
    try:
        request = urllib.request.Request(url, headers={"User-Agent": web.USER_AGENT})
        with web.opener.open(request, timeout=15) as reply:
            return reply.read(600_000).decode(reply.headers.get_content_charset() or "utf-8", "replace")
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        return None


def bots_blocked(robots: Optional[str]) -> bool:
    """Whether robots.txt shuts out the assistants' crawlers, by name or everyone at once."""
    if not robots:
        return False
    agents: List[str] = []
    fresh = True  # a new group starts with the first User-agent after any rule
    for line in robots.splitlines():
        key, _, value = line.split("#")[0].partition(":")
        key, value = key.strip().lower(), value.strip().lower()
        if key == "user-agent":
            agents = [value] if fresh else agents + [value]
            fresh = False
        elif key in ("disallow", "allow"):
            fresh = True
            if key == "disallow" and value == "/" and any(agent == "*" or agent in AI_BOTS for agent in agents):
                return True
    return False


# Words that show a page in Uzbek in Latin script; Cyrillic Uzbek has its own letters (ў, қ, ғ, ҳ)
UZBEK_WORDS = r"\b(va|uchun|bilan|haqida|bo[ʻ'‘`]yicha|sizning|xizmat\w*|narx\w*|biz|bizning|qanday|yoki)\b"
FAQ_WORDS = r"\bFAQ\b|часто задаваемые|вопросы и ответы|частые вопросы|ko[ʻ'‘`]p so[ʻ'‘`]raladigan|savol[- ]javob|frequently asked"


def site_checks(pages: List[Dict[str, str]], html: Optional[str], robots: Optional[str], sitemap: Optional[str] = None, llms: Optional[str] = None, languages: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """The yes-or-no checks on the website, by rule, never by a model. `passed` false is a problem to fix. The first
    four are `backend/PLAN.md`'s; the SEO audit's six came on 23 Nov 2026 (the user: "seo and geo can be taken from
    research"): the home page's title, description and heading, a sitemap, a page of questions and answers, prices
    in the text, both of the market's languages, llms.txt. A check that can't be judged (the home page's code not
    read) is left out, not failed."""
    text = " ".join(page["text"] for page in pages)
    has_price = bool(re.search(r"\d[\d\s.,]*\s*(млн|тыс|ming|mln)?\.?\s*(сум|so[ʻ'‘`]?m|uzs|usd|\$|тенге|₸|руб|₽|eur|€)", text, re.IGNORECASE))
    price_page = any(re.search(r"price|narx|цен|стоим|tarif|тариф|pricing", page["url"], re.IGNORECASE) for page in pages)
    markup = bool(html and re.search(r'application/ld\+json[^>]*>[^<]*"@type"\s*:\s*"(LocalBusiness|Organization|School|EducationalOrganization|MedicalClinic|Dentist|Restaurant|Store|Hotel)', html, re.IGNORECASE))
    contacts = bool(re.search(r"\+?\s*(998|7)[\s(-]*\d{2,3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}", text))
    checks = [
        {"check": "ai_bots_blocked", "passed": not bots_blocked(robots)},
        # A page about prices with no price in its text: the prices are pictures, or not there at all
        {"check": "prices_as_images", "passed": has_price or not price_page},
        {"check": "no_business_markup", "passed": markup},
        {"check": "contacts_missing", "passed": contacts},
        # No price anywhere in the text, and no page about prices: AI can't answer "how much"
        {"check": "no_prices", "passed": has_price or price_page},
        {"check": "no_faq", "passed": bool(re.search(FAQ_WORDS, text + " " + " ".join(page["url"] for page in pages), re.IGNORECASE)) or bool(html and '"FAQPage"' in html)},
        {"check": "no_sitemap", "passed": bool(sitemap and re.search(r"<(urlset|sitemapindex)", sitemap, re.IGNORECASE)) or bool(robots and re.search(r"^\s*sitemap\s*:", robots, re.IGNORECASE | re.MULTILINE))},
        # Some AI tools read it; a page that answers 200 with HTML for every address isn't one
        {"check": "no_llms_txt", "passed": bool(llms and len(llms.strip()) > 20 and not llms.lstrip().startswith("<"))},
    ]
    if html:
        title = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        described = re.search(r"<meta[^>]+name=[\"']description[\"'][^>]*content=[\"']([^\"']*)", html, re.IGNORECASE) or re.search(r"<meta[^>]+content=[\"']([^\"']*)[\"'][^>]*name=[\"']description", html, re.IGNORECASE)
        heading = re.search(r"<h1[\s>]", html, re.IGNORECASE)
        named = len(" ".join((title.group(1) if title else "").split())) >= 15
        checks.append({"check": "weak_meta", "passed": bool(named and described and len(described.group(1).strip()) >= 50 and heading)})
    if languages and len(languages) > 1:
        # Uzbekistan's questions come in Uzbek and Russian: the site should answer in both. A link to another language's
        # version counts, since only one version was read
        letters = re.findall(r"[^\W\d_]", text)
        cyrillic = sum(1 for letter in letters if "\u0400" <= letter <= "\u04ff") / max(len(letters), 1)
        uzbek = len(re.findall(UZBEK_WORDS, text, re.IGNORECASE)) >= 5 or len(re.findall(r"[ўқғҳЎҚҒҲ]", text)) >= 5
        linked = bool(html and re.search(r"hreflang=[\"'](uz|ru)|href=[\"'][^\"']*/(uz|oz|ru)(/|[\"'?])|[?&](lang|language)=(uz|ru)", html, re.IGNORECASE))
        checks.append({"check": "one_language", "passed": linked or (cyrillic > 0.15 and uzbek)})
    return checks


def audit(pages: List[Dict[str, str]], languages: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """The checks on a website already read: its home page's code, robots.txt, sitemap.xml and llms.txt fetched
    together."""
    root = f"https://{web.domain_of(pages[0]['url'])}"
    with ThreadPoolExecutor(max_workers=4) as pool:
        html, robots, sitemap, llms = pool.map(_raw, [pages[0]["url"], f"{root}/robots.txt", f"{root}/sitemap.xml", f"{root}/llms.txt"])
    return site_checks(pages, html, robots, sitemap, llms, languages)


# --- the profile and the questions ---------------------------------------------------------------------

# The time zone told to the search tool with the country; left out for the others
# The countries' time zones live with the rest of where a call is told the customer is (`places`, Phase 0 item 0.7)
TIMEZONES = places.TIMEZONES

# The languages the questions are written in, by the country the business serves (the user's choice,
# 16 Nov 2026: "questions by country"): Uzbek and Russian in Uzbekistan, Russian where customers type in
# Russian, English everywhere else. Only these three: they are the ones the interface and the reading
# rules know. The first of a country's languages is also the one its topics and profile are written in.
RUSSIAN_SPEAKING = {"KZ", "KG", "TJ", "TM", "RU", "BY"}
QUESTION_LANGUAGES = ("ru", "uz", "en")


def languages_for(country: str) -> List[str]:
    code = (country or "").strip().upper()
    return ["ru", "uz"] if code in ("UZ", "") else ["ru"] if code in RUSSIAN_SPEAKING else ["en"]


LANGUAGE_RULES = """The languages, by the country the business mainly serves:
- Uzbekistan (UZ): half of the questions in Russian (language \"ru\") and half in Uzbek in Latin script (language \"uz\"); the profile's own texts (category, city, description, services, topics) in Russian.
- Kazakhstan, Kyrgyzstan, Tajikistan, Turkmenistan, Russia, Belarus: every question in Russian (language \"ru\"); the profile's own texts in Russian.
- Any other country: every question in English (language \"en\"); the profile's own texts in English."""

PROFILE_RULES = """You read a business's website and prepare a first check of how AI assistants answer its customers.

From the text, give:
- name: the business's name as customers write it. aliases: its other spellings on the site and in common use (Latin and Cyrillic, short forms); never a generic word, and never an abbreviation of three letters or fewer.
- country: the two-letter code of the country it mainly serves.
- category: what kind of business it is, two to four words (\"частная школа\", \"чат-боты для бизнеса\", \"furniture store\").
- city: the city it mainly serves, and cityEn, the same in English; both empty when it serves a whole country or several, or works online.
- description: one sentence on what it offers.
- services: up to six of its main services.
- questions: exactly {count} questions a customer there (in that city, or in that country when no city is given) would ask an AI assistant when choosing such a business, before knowing any business's name, in the languages set below. Each with a `topic` of one or two words. Follow QUESTION RULES below.
- competitors: up to five businesses a customer there would compare this one with: real ones you are sure exist and work for the same customers in the same country (or city), the best known first. `domain` is the competitor's own website without "https://", or empty when you are not sure of it. None rather than an invented one. Never this business itself.
- brandQuestions: exactly four questions a customer who has already heard of this business would ask an AI assistant about it by its name, in the languages set below (two and two where there are two languages). Each names the business as customers write it and asks about one of: its prices; whether it is good (or what people say about it); one of its main services; where it is or how to reach it (only when it has a place customers visit). Follow QUESTION RULES below.

QUESTION RULES (every question, customers' and brand ones):
- One question, about one thing, with one question mark. Never two questions joined by "and" / "и" / "va", never a list of things to answer ("what does it do, what are the prices, where is it").
- Short: four to twelve words, the way a person types into ChatGPT. Plain words; no marketing words or jargon from the website.
- Concrete: say the service and the place ("IELTS courses in Tashkent", not "education services").
- A customer's question must be one whose good answer names businesses: which is best, where to go, who does a service, which is cheaper or better for someone. Not "how to choose" or "what is X" questions, which answer without naming anybody. Cover different needs: the best overall, a main service, the price level, a kind of customer, the district when the site names one.
- Examples, good: "Toshkentda IELTS ga tayyorlash uchun qaysi markaz yaxshi?", "Где в Ташкенте недорогие курсы английского для детей?", "Which dental clinics in Tashkent do implants?", "Oq Tabassum narxlari qancha?", "Хорошая ли клиника «Oq Tabassum» для имплантов?".
- Examples, bad: "Что известно об «Oq Tabassum»? Чем занимается, какие цены, где находится и какие отзывы?" (five questions), "Oq Tabassum bilan qanday bogʻlanish va uni qayerdan topish mumkin?" (two questions), "How to choose a good IELTS course and how much does it cost?" (two questions, and names nobody).

""" + LANGUAGE_RULES


# How many competitors a first check follows: the ones the owner confirmed, then the ones the answers name most
COMPETITOR_LIMIT = 5


def profile(domain: str, pages: List[Dict[str, str]], category: Optional[str], city: Optional[str], count: int, country: Optional[str] = None, name: Optional[str] = None) -> Tuple[Dict[str, Any], float]:
    text = "\n\n".join(f"[{page['url']}]\n{page['text']}" for page in pages)[:40_000]
    given = "".join(f"\nThe owner says the {name} is: {value}. Use it." for name, value in (("business's name, as customers write it,", name), ("category", category), ("city", city), ("country it serves (two-letter code)", country)) if value)
    schema = obj(
        name=STR,
        aliases=arr(STR),
        category=STR,
        city=STR,
        cityEn=STR,
        country=STR,
        description=STR,
        services=arr(STR),
        questions=arr(obj(text=STR, language={"type": "string", "enum": list(QUESTION_LANGUAGES)}, topic=STR)),
        competitors=arr(obj(name=STR, domain=STR)),
        brandQuestions=arr(obj(text=STR, language={"type": "string", "enum": list(QUESTION_LANGUAGES)})),
    )
    found, usd = engines.write(PROFILE_RULES.replace("{count}", str(count)) + given, f"Website: {domain}\n\n{text}", "site_profile", schema)
    spellings = [found["name"]] + found["aliases"]
    # A question that names the business would measure nothing
    found["questions"] = [question for question in found["questions"] if not web.names(question["text"], spellings)][:count]
    if not found["questions"]:
        raise FirstRunError("no_questions")
    # And a brand question that doesn't name it would be one more customer's question
    found["brandQuestions"] = [question for question in found.get("brandQuestions") or [] if web.names(question["text"], spellings)][:4]
    # A suggested competitor: a name that isn't the business's own, once, with a website only when it reads as one
    rivals: List[Dict[str, str]] = []
    for rival in found.get("competitors") or []:
        name = " ".join(str(rival.get("name") or "").split())
        site = web.domain_of(str(rival.get("domain") or "").strip())
        if name and not web.names(name, spellings) and all(name.lower() != listed["name"].lower() for listed in rivals):
            rivals.append({"name": name, "domain": site if re.fullmatch(r"[a-z0-9-]+(\.[a-z0-9-]+)+", site) and site != domain else ""})
    found["competitors"] = rivals[:COMPETITOR_LIMIT]
    return found, usd


# --- reading an answer ---------------------------------------------------------------------------------

READ_RULES = """You read one answer an AI assistant gave to a customer's question and list the businesses it names (companies, schools, clinics, shops: named organizations a customer could choose), in the order they first appear. Add nothing the answer does not say.

For each:
- name: as written in the answer.
- tone: how the answer speaks of this business: positive (praised, suggested), negative (warned against, criticised) or neutral (plain facts).
- recommended: true when the assistant itself suggests the customer consider it and gives a reason to choose it (its closing advice, \"I would start with\", a shortlist where each entry says whom it suits), even when hedged. False when it only appears as a row of facts: a price table, a list of addresses, a mention in passing."""

READ_SCHEMA = obj(businesses=arr(obj(name=STR, tone={"type": "string", "enum": ["positive", "neutral", "negative"]}, recommended={"type": "boolean"})))

NAMES_RULES = (
    "These names of businesses come from several answers about one category in one city. Group the spellings that mean the same business "
    "(abbreviations, Latin and Cyrillic, with or without words like School or Clinic). Never merge two different businesses: when unsure, keep "
    "them apart. Give each group as `name` the short name people use, without the city or a slogan. List every given spelling exactly once."
)


# --- the brand questions -------------------------------------------------------------------------------

# Asked beside the customers' questions, by the business's name: what an assistant says of the business
# itself. Their answers are never counted in the scores: a question that names the business names it.
# The general brand question: one plain question, as people type it (the user, 17 Nov 2026: "not complex but
# clean exact prompt questions"; until then it asked five things at once: what it does, prices, where, reviews).
# An assistant asked what it knows tells all of that it knows anyway.
BRAND_QUESTIONS = {
    "ru": "Что вы знаете о «{name}»{place}?",
    "uz": "{name}{place} haqida nima bilasiz?",
    "en": "What do you know about {name}{place}?",
}

BRAND_RULES = """An AI assistant was asked about one business by its name. You are given the business as its own website describes it, and the assistant's answer. Say what the assistant states about the business, for its owner, who is not technical.

- known: \"knows\" when the answer describes this business; \"confuses\" when it describes another business with a similar name, or mixes the two; \"unknown\" when it says it finds nothing, or says nothing specific.
- statements: up to six things the answer states about the business that matter to a customer, the most important first, each one short sentence. None when known is \"unknown\". For each:
  - topic: what (what it is and offers), prices, place (address, branches, district), contacts (phone, hours, site), reputation (reviews, ratings, opinions), other.
  - text: the statement in three languages: uz (Uzbek in Latin script, with oʻ and gʻ), ru, en. Names, prices and addresses exactly as the answer gives them.
  - check, against the website's text only: \"confirmed\" when the website says the same; \"contradicted\" when the website says otherwise (a different price, address, phone, year, service); \"unverified\" when the website says nothing about it. Opinions and reviews are \"unverified\". When unsure, \"unverified\".
  - correct: for \"contradicted\" only, what the website says, one short sentence in the same three languages; otherwise three empty strings.
Add nothing the answer does not say."""

TEXTS = obj(uz=STR, ru=STR, en=STR)
BRAND_SCHEMA = obj(
    known={"type": "string", "enum": ["knows", "confuses", "unknown"]},
    statements=arr(obj(topic={"type": "string", "enum": ["what", "prices", "place", "contacts", "reputation", "other"]}, text=TEXTS, check={"type": "string", "enum": ["confirmed", "contradicted", "unverified"]}, correct=TEXTS)),
)


def brand_languages(engine: str, asked: List[str], languages: Optional[List[str]] = None) -> List[str]:
    """The brand questions an assistant gets: one in each of the country's languages, and ChatGPT only the
    first when Gemini is asked too (the same economy as `questions_for`)."""
    languages = languages or languages_for("UZ")
    return languages[:1] if engine == "chatgpt" and "gemini" in asked else list(languages)


def brand_question(language: str, name: str, city: str) -> str:
    return BRAND_QUESTIONS[language].format(name=name, place=f" ({city})" if city else "")


# How many brand questions a project keeps: each is asked to every assistant at every check
BRAND_QUESTION_LIMIT = 6


def brand_views_of(who: Dict[str, Any], site: str, about_it: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], float]:
    """The brand answers (each with `engine`, `language`, `asked`, `text`, `citations`) as the `brandView` list."""
    with ThreadPoolExecutor(max_workers=4) as pool:
        viewed = list(pool.map(lambda answer: brand_view(who, site, answer), about_it))
    return _views(about_it, viewed), sum(usd for _, usd in viewed)


def _views(about_it: List[Dict[str, Any]], viewed: List[Tuple[Optional[Dict[str, Any]], float]]) -> List[Dict[str, Any]]:
    return [
        {
            "engine": answer["engine"],
            "name": engines.ENGINE_NAMES[answer["engine"]],
            "language": answer["language"],
            "question": answer["asked"],
            **view,
            "citations": [{"url": citation["url"], "domain": web.domain_of(citation["url"]), "title": citation.get("title")} for citation in answer["citations"][:8]],
        }
        for answer, (view, _) in zip(about_it, viewed)
        if view
    ]


def brand_view(who: Dict[str, Any], site: str, answer: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], float]:
    """One brand answer as statements checked against the website. None when the model failed."""
    about = f"Business: {who['name']} ({who['category']}, {who['city'] or who['country']})\n\nIts website:\n{site[:15_000]}\n\nQuestion: {answer['asked']}\n\nThe assistant's answer:\n{answer['text'][:8000]}"
    try:
        read, usd = engines.write(BRAND_RULES, about, "brand_view", BRAND_SCHEMA)
    except engines.EngineError as error:
        print(f"first run: brand answer not read: {error}")
        return None, 0.0
    statements = [
        {"topic": statement["topic"], "text": statement["text"], "check": statement["check"], "correct": statement["correct"] if statement["check"] == "contradicted" and statement["correct"]["en"].strip() else None}
        for statement in read["statements"][:6]
        if all(statement["text"][language].strip() for language in ("uz", "ru", "en"))
    ]
    return {"known": read["known"], "statements": [] if read["known"] == "unknown" else statements}, usd


# --- the conclusion ------------------------------------------------------------------------------------

CONCLUSION_RULES = """You write the conclusion of a first check of how AI assistants answer customers' questions about one kind of business. You are given what was counted. The reader owns the business and is not technical.

Write three sentences, at most 70 words together: where the business stands against the others; the main reason the counts show (the questions it is missing from, the sites the assistants cite that don't list it, a problem on its website, or an assistant that doesn't know the business by name or states something its website contradicts); the one thing to do first. Use only the numbers and names given, as counts of answers (\"3 of 10 answers\"), never percentages. A site that is another business's own website is not a place to get listed: for a listing, name only catalogues, rating and news sites. Plain words: no \"visibility\", \"share of voice\", \"GEO\", \"LLM\". Don't promise a result.

Give the same conclusion in three languages: `uz` (Uzbek in Latin script, with oʻ and gʻ), `ru` (Russian) and `en` (English). Keep the businesses' and sites' names as given."""

CONCLUSION_SCHEMA = obj(uz=STR, ru=STR, en=STR)


def conclusion(facts: Dict[str, Any]) -> Tuple[Optional[Dict[str, str]], float]:
    """The conclusion in the three languages, or None when the model failed: the page then shows the counts alone."""
    try:
        written, usd = engines.write(CONCLUSION_RULES, json.dumps(facts, ensure_ascii=False), "first_conclusion", CONCLUSION_SCHEMA)
    except engines.EngineError as error:
        print(f"first run: no conclusion: {error}")
        return None, 0.0
    return ({language: " ".join(written[language].split()) for language in ("uz", "ru", "en")} if all(written.get(language, "").strip() for language in ("uz", "ru", "en")) else None), usd


# --- the run -------------------------------------------------------------------------------------------


def _kind(domain: str, own: str, competitors: List[Tuple[str, Optional[str]]]) -> str:
    """A cited site's kind in the six the first check's statistics show, from its type by the seed list and the
    competitors (`domains`; the AI types sites once the check is a project's)."""
    return domains.kind(domains.resolve(domain, own, competitors, {})["type"])


def questions_for(engine: str, asked: List[str], count: int) -> List[int]:
    """Which questions an assistant gets in a first run. With Gemini beside it, ChatGPT gets
    `FIRST_RUN_CHATGPT_QUESTIONS` of them, spread evenly so both languages are among them; otherwise all."""
    limit = settings.first_run_chatgpt_questions
    if engine != "chatgpt" or "gemini" not in asked or limit >= count:
        return list(range(count))
    return sorted({round(index * count / limit) for index in range(limit)}) if limit > 0 else []


# --- the competitors, by a web search -------------------------------------------------------------------

# Asked once while the website is prepared, of an assistant with web search: who a customer would compare the
# business with. The writing model's own list (`profile`) came from memory and could be wrong or made up
# (the user, 16 Nov 2026: "better competitors"); it now only fills the places a search leaves.
COMPETITOR_QUESTIONS = {
    "ru": "Какие компании — главные конкуренты и альтернативы для «{name}» ({site}): {category}{place}? Назови до восьми реальных компаний того же типа, которые выбирают те же клиенты, и для каждой укажи официальный сайт.",
    "uz": "«{name}» ({site}) uchun asosiy raqobatchilar va muqobillar qaysi kompaniyalar: {category}{place}? Xuddi shu mijozlar tanlaydigan, shu turdagi sakkiztagacha haqiqiy kompaniyani ayting va har birining rasmiy saytini koʻrsating.",
    "en": "Which companies are the main competitors of and alternatives to {name} ({site}): {category}{place}? Name up to eight real companies of the same kind that the same customers choose between, each with its official website.",
}

COMPETITOR_RULES = """An AI assistant with web search was asked who competes with one business. You are given the business, the assistant's answer and the pages it cited. List the competitors the answer names: businesses of the same kind that the same customers would choose between, the strongest first, eight at most.

- name: the short name customers use, as the answer writes it.
- domain: the competitor's own official website, without "https://" and without a path, only when the answer or a cited page's address gives it; otherwise empty. Never a catalogue, a marketplace, a news site, a social network or an app store page.
Leave out the business itself, and anything that is not a company a customer could choose (catalogues, rating sites, media, exams, authorities). Add nothing the answer does not name."""

COMPETITOR_SCHEMA = obj(competitors=arr(obj(name=STR, domain=STR)))

SITE = re.compile(r"[a-z0-9-]+(\.[a-z0-9-]+)+")


ICON = re.compile(r"<link\b[^>]*\brel=[\"'][^\"']*\bicon\b[^\"']*[\"'][^>]*>", re.IGNORECASE)
HREF = re.compile(r"\bhref=[\"']([^\"']+)[\"']", re.IGNORECASE)


def site_icon(domain: str) -> Tuple[bool, Optional[str]]:
    """Whether the site opens, and the address of the icon its home page names (its logo in our lists)."""
    try:
        request = urllib.request.Request(f"https://{domain}", headers={"User-Agent": web.USER_AGENT})
        with web.opener.open(request, timeout=12) as reply:
            html = reply.read(300_000).decode(reply.headers.get_content_charset() or "utf-8", "replace")
    except urllib.error.HTTPError:
        # The site is there and refuses our reader (a large site's protection): its address stands, without an icon
        return True, None
    except (urllib.error.URLError, OSError, ValueError) as error:
        # No answer in time is a site that ignores our reader, not a missing one: only an address that
        # doesn't exist, or refuses the connection, loses the website
        late = (TimeoutError, socket.timeout)  # two classes before Python 3.10
        slow = isinstance(error, late) or isinstance(getattr(error, "reason", None), late)
        return slow, None
    for tag in ICON.findall(html[:200_000]):
        href = HREF.search(tag)
        if href and not href.group(1).startswith("data:"):
            return True, urljoin(f"https://{domain}/", href.group(1).strip())[:500]
    return True, None


def search_competitors(who: Dict[str, Any], domain: str, country: str) -> Tuple[List[Dict[str, Any]], float]:
    """Competitors found by one web search, each with its own website when the search gave one that opens.
    Empty when no assistant can be asked or the search failed: the profile's own list then stands."""
    asked = [engine for engine in ("gemini", "chatgpt") if engine in settings.engines][:1]
    if not asked:
        return [], 0.0
    language = languages_for(country)[0]
    city = who["city"] if language == "ru" else who["cityEn"]
    place = f", {city}" if city else f", {country}"
    question = COMPETITOR_QUESTIONS[language].format(name=who["name"], site=domain, category=who["category"], place=place)
    try:
        answer = engines.ask(asked[0], question, *places.place(country, who["cityEn"] or who["city"]))
        cited = "\n".join(f"- {citation.get('title') or ''} {citation['url']}" for citation in answer["citations"][:30])
        found, usd = engines.read(COMPETITOR_RULES, f"Business: {who['name']} ({domain}), {who['category']}\n\nAnswer:\n{answer['text'][:8000]}\n\nCited pages:\n{cited}", "competitors", COMPETITOR_SCHEMA)
    except engines.EngineError as error:
        print(f"first run {domain}: competitors not searched: {error}")
        return [], 0.0
    spellings = [who["name"]] + who["aliases"]
    rivals: List[Dict[str, Any]] = []
    for rival in found["competitors"]:
        name = " ".join(rival["name"].split())
        site = web.domain_of(rival["domain"].strip()) if rival["domain"].strip() else ""
        if not name or web.names(name, spellings) or site == domain or any(name.lower() == listed["name"].lower() or (site and site == listed["domain"]) for listed in rivals):
            continue
        rivals.append({"name": name, "domain": site if SITE.fullmatch(site) else ""})
    rivals = rivals[:8]
    # A website is kept only when it opens: an address that leads nowhere would mark the wrong company
    with ThreadPoolExecutor(max_workers=8) as pool:
        opens = list(pool.map(lambda rival: site_icon(rival["domain"]) if rival["domain"] else (False, None), rivals))
    for rival, (alive, icon) in zip(rivals, opens):
        rival["logo"] = icon if alive else None
        if not alive:
            rival["domain"] = ""
    return rivals, (answer["usd"] or 0.0) + usd


def prepare(domain: str, category: Optional[str], city: Optional[str], country: Optional[str] = None, name: Optional[str] = None, search: bool = True) -> Tuple[Dict[str, Any], float]:
    """The first half of a first check, before anybody is asked: the website read, and from it the profile,
    the competitors and the questions, for the owner to correct. Returns the draft the check is then made
    from (`check`) and what writing it cost."""
    # The site's version to read: English for a country whose questions are English, when the owner named it
    pages = web.read_site(domain, "en" if country and languages_for(country) == ["en"] else "ru")
    if not pages:
        raise FirstRunError("site_unreadable", domain)
    who, usd = profile(domain, pages, category, city, settings.first_run_questions, country, name)
    # The owner's own word on the country wins over what the website suggests
    country = country or who["country"].strip().upper()[:2] or "UZ"
    languages = languages_for(country)
    checks = audit(pages, languages)
    # The rules name the languages; a question that came in another one is left out
    who["questions"] = [question for question in who["questions"] if question["language"] in languages] or who["questions"]
    who["brandQuestions"] = [question for question in who["brandQuestions"] if question["language"] in languages]
    general = [{"text": brand_question(language, who["name"], who["city"] if language == "ru" else who["cityEn"]), "language": language} for language in languages]
    # The competitors a search finds come first; the ones the profile recalled fill the places left
    # `search` False: the day's free checks are taken, so the check joins the queue and the search's cost is saved
    searched, spent = search_competitors(who, web.domain_of(pages[0]["url"]), country) if search else ([], 0.0)
    usd += spent
    recalled = [rival for rival in who.get("competitors") or [] if all(rival["name"].lower() != found["name"].lower() and not (rival["domain"] and rival["domain"] == found["domain"]) for found in searched)]
    who["competitors"] = (searched + ([] if len(searched) >= 3 else recalled))[:COMPETITOR_LIMIT]
    who["competitorsSearched"] = bool(searched)
    return {
        "who": who,
        "country": country,
        "own": web.domain_of(pages[0]["url"]),
        "checks": checks,
        "siteText": "\n\n".join(f"[{page['url']}]\n{page['text']}" for page in pages)[:40_000],
        # The general brand questions first, then the ones written for this business
        "brandQuestions": general + [{"text": question["text"], "language": question["language"]} for question in who["brandQuestions"]],
    }, usd


def confirmed_of(draft: Dict[str, Any]) -> Dict[str, Any]:
    """The draft as it stands, for a check nobody corrected."""
    who = draft["who"]
    return {
        "name": who["name"],
        "aliases": who["aliases"],
        "category": who["category"],
        "city": who["city"],
        "country": draft["country"],
        "description": who["description"],
        "services": who["services"],
        "competitors": [{"name": rival["name"], "aliases": [], "domain": rival["domain"]} for rival in who.get("competitors") or []],
        "prompts": who["questions"],
        "brandQuestions": draft["brandQuestions"],
    }


def run(domain: str, category: Optional[str], city: Optional[str], progress: Progress, engine_names: Optional[List[str]] = None, country: Optional[str] = None) -> Tuple[Dict[str, Any], Dict[str, Any], float]:
    """A whole first check with nothing corrected: the website read, then everybody asked."""
    progress("reading_site", 0, 0)
    draft, usd = prepare(domain, category, city, country)
    snapshot, raw, cost = check(draft, confirmed_of(draft), progress, engine_names)
    return snapshot, raw, round(cost + usd, 4)


JOINING = {"by", "of", "and", "the", "for", "in", "va", "и", "в", "для"}


def _named_so_far(text: str, name: str) -> bool:
    """Whether an answer's words name a competitor, before any model has read it: its name as given, or the
    name's first words (two at least) written exactly so, capitals too: "British Council" for "British
    Council IELTS Ready". A shortened name must not end on a joining word or be short enough to be a phrase."""
    if web.names(text, [name]):
        return True
    words = name.split()
    for count in range(len(words) - 1, 1, -1):
        short = " ".join(words[:count])
        if len(short) >= 8 and words[count - 1].lower() not in JOINING and re.search(rf"(?<!\w){re.escape(short)}(?!\w)", text):
            return True
    return False


def partial_of(name: str, spellings: List[str], rivals: List[str], questions: List[Dict[str, Any]], answers: List[Dict[str, Any]], total: int) -> Dict[str, Any]:
    """What a check has so far, for the page to show while it still runs (the user's picture, 16 Nov 2026:
    "still collecting"): who the answers in hand name, the sites and pages they cite, and their beginnings.
    Counted from the answers' own words, with no model: a business is named when its name stands in the
    text. The finished check counts again, with the answers read, and may differ by a spelling."""
    brands = [{"name": name, "isYou": True, "named": sum(1 for answer in answers if web.names(answer["text"], spellings))}]
    brands += [{"name": rival, "isYou": False, "named": sum(1 for answer in answers if _named_so_far(answer["text"], rival))} for rival in rivals]
    sites: Counter = Counter()
    pages: Counter = Counter()
    titles: Dict[str, Optional[str]] = {}
    for answer in answers:
        cited = {citation["url"]: citation.get("title") for citation in answer["citations"]}
        sites.update({web.domain_of(url) for url in cited})
        pages.update(cited.keys())
        for url, title in cited.items():
            titles.setdefault(url, title)
    return {
        "brand": name,
        "answered": len(answers),
        "total": total,
        "brands": brands,
        "sites": [{"domain": domain, "count": count} for domain, count in sites.most_common(15)],
        "pages": [{"url": url, "title": titles.get(url), "count": count} for url, count in pages.most_common(15)],
        # The latest first
        "answers": [
            {"question": questions[answer["question"]]["text"], "engine": answer["engine"], "name": engines.ENGINE_NAMES.get(answer["engine"], answer["engine"]), "text": answer["text"][:600], "named": web.names(answer["text"], spellings)}
            for answer in reversed(answers[-20:])
        ],
    }


Live = Callable[[Dict[str, Any]], None]


def _plan_slots(log: Optional[slots.SlotLog], questions: List[Dict[str, Any]], jobs: List[Tuple[int, str]], asked: List[str], named_asks: List[Tuple[str, str, str]], brand_order: List[str], first_named: Dict[str, str], place: Tuple[str, str, str]) -> Dict[Tuple[str, Any, str], str]:
    """The check's slot log before anything is asked: each question to each assistant, planned or left out by
    the free check (`questions_for`), and each brand question the same (`brand_languages`). Returns the
    slots' ids by what they are, for closing them."""
    if log is None:
        return {}
    planned, named = set(jobs), {(engine, language) for engine, language, _ in named_asks}
    left_out = {"status": "excluded", "reason": "free_check_subset"}
    entries = [
        (("discovery", q, engine), {"question_index": q, "question": questions[q]["text"], "language": questions[q]["language"], "prompt_group": "discovery", "engine": engine, "location": slots.location(engine, *place, live=True), **({} if (q, engine) in planned else left_out)})
        for engine in asked
        for q in range(len(questions))
    ]
    entries += [
        (("branded", language, engine), {"question": first_named[language], "language": language, "prompt_group": "branded", "engine": engine, "location": slots.location(engine, *place, live=True), **({} if (engine, language) in named else left_out)})
        for engine in asked
        for language in brand_order
    ]
    return dict(zip([key for key, _ in entries], log.plan([row for _, row in entries])))


def check(draft: Dict[str, Any], confirmed: Dict[str, Any], progress: Progress, engine_names: Optional[List[str]] = None, live: Optional[Live] = None, log: Optional[slots.SlotLog] = None) -> Tuple[Dict[str, Any], Dict[str, Any], float]:
    """The second half: the questions the owner confirmed asked to every assistant, and the answers counted.
    `confirmed` is the draft as the owner left it (`confirmed_of` gives its shape). Returns the Snapshot, the
    raw answers and the cost in US dollars. With `log`, every call is written to the slot log as it goes."""
    asked = engine_names or settings.engines
    if not asked:
        raise FirstRunError("no_engines", "No assistant has a key")
    cost = 0.0
    site = draft["who"]
    city = confirmed["city"]
    who = {
        **site,
        "name": confirmed["name"],
        "aliases": confirmed["aliases"],
        "category": confirmed["category"],
        "city": city,
        # The city in English is the website's reading; a city the owner typed is told as typed
        "cityEn": site["cityEn"] if city == site["city"] else city,
        "description": confirmed["description"],
        "services": confirmed["services"],
        "questions": confirmed["prompts"][: settings.first_run_questions],
    }
    if not who["questions"]:
        raise FirstRunError("no_questions")
    domain = draft["own"]
    checks = draft["checks"]
    spellings = [who["name"]] + who["aliases"]
    country = confirmed["country"] or draft["country"]
    # Where every call is told the customer is: the business's city, else its market's main city (0.7)
    place = places.place(country, who["cityEn"] or who["city"])
    languages = languages_for(country)
    chosen = [rival for rival in confirmed["competitors"] if not web.names(rival["name"], spellings)][:COMPETITOR_LIMIT]
    # Of the brand questions the owner kept, the first in each language is asked now; all are kept for the weekly checks
    first_named: Dict[str, str] = {}
    for question in confirmed["brandQuestions"]:
        first_named.setdefault(question["language"], question["text"])

    # Every question to every assistant, a few at a time; one that fails is left out and the run goes on
    count = len(who["questions"])
    jobs = [(q, engine) for engine in asked for q in questions_for(engine, asked, count)]
    # The brand questions go with them and are kept apart: not counted in the progress or in any score
    brand_order = [language for language in languages if language in first_named] or list(first_named)
    named_asks = [(engine, language, first_named[language]) for engine in asked for language in brand_languages(engine, asked, brand_order)] if first_named else []
    slot_of = _plan_slots(log, who["questions"], jobs, asked, named_asks, brand_order, first_named, place)
    answers: List[Dict[str, Any]] = []
    progress("asking", 0, len(jobs))
    about_it: List[Dict[str, Any]] = []
    try:
        with ThreadPoolExecutor(max_workers=5) as pool:
            futures = {pool.submit(engines.ask, engine, who["questions"][q]["text"], *place): (q, engine) for q, engine in jobs}
            named_futures = [(pool.submit(engines.ask, engine, text, *place), engine, language, text) for engine, language, text in named_asks]
            for done, future in enumerate(as_completed(futures), start=1):
                q, engine = futures[future]
                slot = slot_of.get(("discovery", q, engine))
                try:
                    answer = future.result()
                except engines.EngineError as error:
                    answer = None
                    print(f"first run {domain}: {engine} failed on question {q + 1}: {error}")
                    if log:
                        log.close(slot, "failed", reason="error", detail=str(error))
                if answer and answer["text"].strip():
                    answers.append({"question": q, **answer})
                    cost += answer["usd"] or 0.0
                    if log:
                        log.close(slot, "completed", answer=answer)
                    if live:
                        live(partial_of(who["name"], spellings, [rival["name"] for rival in chosen], who["questions"], answers, len(jobs)))
                elif answer is not None and log:
                    log.close(slot, "failed", reason="empty_answer", answer=answer)
                progress("asking", done, len(jobs))
            for future, engine, language, text in named_futures:
                slot = slot_of.get(("branded", language, engine))
                try:
                    answer = future.result()
                except engines.EngineError as error:
                    print(f"first run {domain}: {engine} failed on the brand question ({language}): {error}")
                    if log:
                        log.close(slot, "failed", reason="error", detail=str(error))
                    continue
                if answer["text"].strip():
                    about_it.append({"language": language, "asked": text, **answer})
                    cost += answer["usd"] or 0.0
                    if log:
                        log.close(slot, "completed", answer=answer)
                elif log:
                    log.close(slot, "failed", reason="empty_answer", answer=answer)
    finally:
        if log:
            log.flush()
    if not answers:
        raise FirstRunError("no_answers")

    progress("reading_answers", len(answers), len(jobs))
    # The brand answers are read while the others are: each is one slow call, and nothing else waits on them
    site_text = draft["siteText"]
    view_pool = ThreadPoolExecutor(max_workers=4)
    view_futures = [view_pool.submit(brand_view, who, site_text, answer) for answer in about_it]
    view_pool.shutdown(wait=False)
    with ThreadPoolExecutor(max_workers=6) as pool:
        for answer, (read, usd) in zip(answers, pool.map(lambda answer: engines.read(READ_RULES, f"Question: {who['questions'][answer['question']]['text']}\n\nAnswer:\n{answer['text']}", "answer_reading", READ_SCHEMA), answers)):
            answer["businesses"] = read["businesses"]
            cost += usd

    seen = sorted({business["name"].strip() for answer in answers for business in answer["businesses"] if business["name"].strip()} | {rival["name"] for rival in chosen})
    mapping: Dict[str, str] = {}
    if seen:
        groups, usd = engines.read(NAMES_RULES, json.dumps({"category": who["category"], "city": who["city"], "names": seen}, ensure_ascii=False), "name_groups", obj(groups=arr(obj(name=STR, spellings=arr(STR)))))
        cost += usd
        mapping = {spelling: group["name"] for group in groups["groups"] for spelling in group["spellings"]}
        # A business the owner confirmed keeps the name they gave it, whatever the answers call it
        for rival in chosen:
            group = mapping.get(rival["name"])
            if group and group != rival["name"]:
                mapping = {spelling: rival["name"] if name == group else name for spelling, name in mapping.items()}

    client = who["name"]

    def canonical(name: str) -> str:
        name = mapping.get(name.strip(), name.strip())
        return client if web.names(name, spellings) else name

    # Per answer: the businesses in order, each once, the client added when only the text holds its name
    for answer in answers:
        order: List[Dict[str, Any]] = []
        for business in answer["businesses"]:
            name = canonical(business["name"])
            if all(name != listed["name"] for listed in order):
                order.append({"name": name, "tone": business["tone"], "recommended": business["recommended"]})
        if web.names(answer["text"], spellings) and all(listed["name"] != client for listed in order):
            order.append({"name": client, "tone": "neutral", "recommended": False})
        answer["order"] = order

    named = Counter(listed["name"] for answer in answers for listed in answer["order"])
    # The competitors the owner confirmed, named or not, then the businesses the answers name most
    rivals = [rival["name"] for rival in chosen]
    rivals += [name for name, _ in named.most_common() if name != client and name not in rivals][: COMPETITOR_LIMIT - len(rivals)]
    given = {rival["name"]: rival for rival in chosen}
    # A confirmed competitor keeps the icon found with its website, while the website is still the one found
    icons = {rival["domain"]: rival.get("logo") for rival in draft["who"].get("competitors") or [] if rival.get("domain")}
    tracked = [client] + rivals
    ids = {name: f"b{index}" for index, name in enumerate(tracked)}
    mentions = sum(named[name] for name in tracked) or 1

    def score(name: str, over: List[Dict[str, Any]]) -> Dict[str, Any]:
        places = [position for answer in over for position, listed in enumerate(answer["order"], start=1) if listed["name"] == name]
        tones = [{"positive": 100, "neutral": 50, "negative": 0}[listed["tone"]] for answer in over for listed in answer["order"] if listed["name"] == name]
        return {
            "brandId": ids[name],
            "visibility": len(places) / len(over) if over else 0.0,
            "shareOfVoice": named[name] / mentions,
            "avgPosition": round(sum(places) / len(places), 1) if places else None,
            "sentiment": round(sum(tones) / len(tones)) if tones else None,
            "trend": 0.0,
        }

    # The cited sites, the most cited first; the first five are read to see whether they name the client
    sites: Dict[str, Dict[str, Any]] = {}
    for index, answer in enumerate(answers):
        for citation in answer["citations"]:
            site = sites.setdefault(web.domain_of(citation["url"]), {"answers": set(), "pages": Counter(), "titles": {}})
            site["answers"].add(index)
            site["pages"][citation["url"]] += 1
            site["titles"].setdefault(citation["url"], citation.get("title"))
    own = domain
    rival_sites = {rival["domain"] for rival in chosen if rival["domain"]}
    ranked = sorted(sites, key=lambda site: (-len(sites[site]["answers"]), site))[:12]
    kinds = {site: "competitor" if site in rival_sites else _kind(site, own, [(name, (given.get(name) or {}).get("domain")) for name in rivals]) for site in ranked}
    to_read = [site for site in ranked if kinds[site] not in ("own", "competitor")][:5]
    with ThreadPoolExecutor(max_workers=5) as pool:
        fetched = dict(zip(to_read, pool.map(lambda site: web.fetch(sites[site]["pages"].most_common(1)[0][0]), to_read)))
    sources = [
        {
            "domain": site,
            "type": kinds[site],
            "count": len(sites[site]["answers"]),
            "brandListed": kinds[site] == "own" or bool(fetched.get(site) and web.names(fetched[site][0], spellings)),
            "pages": [{"url": url, "title": sites[site]["titles"].get(url), "count": count, "mentions": None} for url, count in sites[site]["pages"].most_common(5)],
        }
        for site in ranked
    ]

    collected = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    by_question: List[Dict[str, Any]] = []
    for q, question in enumerate(who["questions"]):
        mine = [answer for answer in answers if answer["question"] == q]
        by_question.append(
            {
                "prompt": {"id": f"q{q + 1}", "text": question["text"], "language": question["language"], "topic": question["topic"], "createdAt": collected, "archivedAt": None, "location": who["city"], "factCheck": True, "tags": []},
                "answers": [
                    {
                        "sample": sample,
                        "engine": answer["engine"],
                        "text": answer["text"],
                        "mentions": [{"brandId": ids[listed["name"]], "position": position, "tone": listed["tone"], "recommended": listed["recommended"]} for position, listed in enumerate(answer["order"], start=1) if listed["name"] in ids],
                        "citations": [{"url": citation["url"], "domain": web.domain_of(citation["url"]), "title": citation.get("title")} for citation in answer["citations"]],
                        "searches": answer["searches"],
                    }
                    for sample, answer in enumerate(mine, start=1)
                ],
            }
        )

    # What each assistant says of the business itself, checked against its website
    viewed = [future.result() for future in view_futures]
    brand_views = _views(about_it, viewed)
    cost += sum(usd for _, usd in viewed)

    recommended = {name: sum(1 for answer in answers for listed in answer["order"] if listed["name"] == name and listed["recommended"]) for name in tracked}
    progress("reading_answers", len(jobs), len(jobs))
    concluded, usd = conclusion(
        {
            "business": client,
            "kind": who["category"],
            "place": who["city"] or country,
            "answers": len(answers),
            "assistants": [engines.ENGINE_NAMES[engine] for engine in asked],
            "businesses": [{"name": name, "isTheBusiness": name == client, "answersNamingIt": named[name], "answersRecommendingIt": recommended[name]} for name in tracked],
            "questionsWithoutTheBusiness": [
                {"question": who["questions"][q]["text"], "named": sorted({listed["name"] for answer in answers if answer["question"] == q for listed in answer["order"]})[:5]}
                for q in range(len(who["questions"]))
                if any(answer["question"] == q for answer in answers) and not any(listed["name"] == client for answer in answers if answer["question"] == q for listed in answer["order"])
            ],
            "sitesTheAssistantsCite": [{"site": source["domain"], "kind": source["type"], "answersCitingIt": source["count"], "listsTheBusiness": source["brandListed"]} for source in sources[:8]],
            "problemsOnItsWebsite": [check["check"] for check in checks if not check["passed"]],
            "askedAboutTheBusinessByName": [
                {"assistant": view["name"], "result": view["known"], "statementsTheWebsiteContradicts": [statement["text"]["en"] for statement in view["statements"] if statement["check"] == "contradicted"]}
                for view in brand_views
            ],
        }
    )
    cost += usd

    snapshot = {
        "domain": own,
        "category": who["category"],
        "city": who["city"],
        "country": country,
        "description": who["description"],
        "services": who["services"],
        "method": {"engine": " + ".join(engines.ENGINE_NAMES[engine] for engine in asked), "model": ", ".join(sorted({answer["model"] for answer in answers})), "webSearch": True, "samples": 1, "collectedAt": collected},
        "brand": {"id": ids[client], "name": client, "aliases": who["aliases"], "domain": own, "logo": None},
        "competitors": [{"id": ids[name], "name": name, "aliases": given.get(name, {}).get("aliases") or [], "domain": given.get(name, {}).get("domain") or "", "logo": icons.get(given.get(name, {}).get("domain") or "")} for name in rivals],
        "scores": [score(name, answers) for name in tracked],
        # The same numbers per assistant, and how often each business is recommended: new beside the old contract
        "engines": [
            {"engine": engine, "name": engines.ENGINE_NAMES[engine], "answers": len(theirs), "scores": [score(name, theirs) for name in tracked]}
            for engine in asked
            for theirs in [[answer for answer in answers if answer["engine"] == engine]]
        ],
        "recommended": {ids[name]: recommended[name] for name in tracked},
        # Worded by a model from the counts above, in the interface's three languages; None when it failed
        "conclusion": concluded,
        # What each assistant says when asked about the business by name: statements checked against the website
        "brandView": brand_views,
        # The brand questions the owner kept (asked in this check where `asked`): the weekly checks ask them all
        "brandQuestions": [{"text": question["text"], "language": question["language"], "asked": any(answer["asked"] == question["text"] for answer in about_it)} for question in confirmed["brandQuestions"]],
        "answers": len(answers),
        "prompts": by_question,
        "topSources": sources,
        "siteChecks": checks,
    }
    # `order`: every business an answer names, one name each, in order; a project keeps those it doesn't track too
    raw = {"profile": who, "brandAnswers": [{key: answer[key] for key in ("engine", "model", "language", "asked", "text", "citations", "searches")} for answer in about_it], "answers": [{key: answer[key] for key in ("question", "engine", "model", "text", "citations", "searches", "businesses", "order")} for answer in answers]}
    return snapshot, raw, round(cost, 4)
