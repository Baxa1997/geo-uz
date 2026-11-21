"""The Telegram digest (report spec §4.15, Phase 0 item 0.8): at most six lines in the client's language, every
number from the check's data object and its metrics, one link. There is no Telegram bot: the digest is copied by
hand from Hisobotlar or the Free Snapshot, and opens the report's email (the user's choice, 21 Nov 2026).

    Seenova · <brand> · <date> · <assistants>
    In AI answers: <brand> k/n (baseline, or what it was at the check before)
    Most named instead of you: <competitors> k/n
    Biggest change: <one line over the questions asked the same way in both checks, or no change>
    This week's action: <one line and its owner, or monitoring>
    Full report: <link>
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session as Db

from . import fixes, wave
from .db import Project, Run
from .engines import ENGINE_NAMES

WORDS: Dict[str, Dict[str, Any]] = {
    "en": {
        "months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        "date": "{day} {month} {year}",
        "and": "and",
        "visibility": "In AI answers: {brand} {named}/{answers} ({change})",
        "baseline": "baseline",
        "was": "was {named}/{answers}",
        "wasOther": "was {named}/{answers}, asked another way",
        "instead": "Most named instead of you: {names} {named}/{answers}",
        "nobody": "Most named instead of you: no tracked competitor",
        "change": "Biggest change: {name} {named}/{answers}, was {before}/{of} on the same questions",
        "first": "Biggest change: none yet, this is the first check",
        "same": "Biggest change: no material change on the same questions",
        "unmatched": "Biggest change: can't compare, no question was asked the same way in both checks",
        "action": "This week's action: {title} ({owner})",
        "monitoring": "This week's action: no confirmed action, monitoring",
        "report": "Full report: {link}",
        "owners": {"listing": "Marketing", "content": "Content", "technical": "Developer", "fact": "Marketing"},
        "titles": {
            "listing": "get listed on {domain}",
            "content": "write a page about “{topic}”",
            "fact": "correct “{claim}”",
            "ai_bots_blocked": "let AI bots read the website",
            "prices_as_images": "write the prices as text",
            "no_business_markup": "add business markup to the website",
            "contacts_missing": "put the contacts on the website",
            "technical": "fix the website",
        },
    },
    "ru": {
        "months": ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
        "date": "{day} {month} {year}",
        "and": "и",
        "visibility": "В ответах ИИ: {brand} {named}/{answers} ({change})",
        "baseline": "первая проверка",
        "was": "было {named}/{answers}",
        "wasOther": "было {named}/{answers}, спрашивали иначе",
        "instead": "Чаще всего вместо вас: {names} {named}/{answers}",
        "nobody": "Чаще всего вместо вас: ни один отслеживаемый конкурент",
        "change": "Главное изменение: {name} {named}/{answers}, было {before}/{of} на тех же вопросах",
        "first": "Главное изменение: пока нет, это первая проверка",
        "same": "Главное изменение: на тех же вопросах без заметных изменений",
        "unmatched": "Главное изменение: сравнить нельзя, ни один вопрос не задавали одинаково в обеих проверках",
        "action": "Действие недели: {title} ({owner})",
        "monitoring": "Действие недели: подтверждённого действия нет, наблюдаем",
        "report": "Полный отчёт: {link}",
        "owners": {"listing": "маркетинг", "content": "контент", "technical": "разработчик", "fact": "маркетинг"},
        "titles": {
            "listing": "разместиться на {domain}",
            "content": "написать страницу о «{topic}»",
            "fact": "исправить «{claim}»",
            "ai_bots_blocked": "открыть сайт для ИИ-ботов",
            "prices_as_images": "написать цены текстом",
            "no_business_markup": "добавить на сайт разметку компании",
            "contacts_missing": "разместить контакты на сайте",
            "technical": "исправить сайт",
        },
    },
    "uz": {
        "months": ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
        "date": "{day}-{month}, {year}",
        "and": "va",
        "visibility": "AI javoblarida: {brand} {named}/{answers} ({change})",
        "baseline": "birinchi tekshiruv",
        "was": "avval {named}/{answers}",
        "wasOther": "avval {named}/{answers}, boshqacha soʻralgan",
        "instead": "Sizning oʻrningizga eng koʻp: {names} {named}/{answers}",
        "nobody": "Sizning oʻrningizga eng koʻp: kuzatilayotgan raqobatchi yoʻq",
        "change": "Eng katta oʻzgarish: {name} {named}/{answers}, oʻsha savollarda avval {before}/{of}",
        "first": "Eng katta oʻzgarish: hali yoʻq, bu birinchi tekshiruv",
        "same": "Eng katta oʻzgarish: oʻsha savollarda sezilarli oʻzgarish yoʻq",
        "unmatched": "Eng katta oʻzgarish: solishtirib boʻlmaydi, ikkala tekshiruvda bir xil soʻralgan savol yoʻq",
        "action": "Haftaning harakati: {title} ({owner})",
        "monitoring": "Haftaning harakati: tasdiqlangan harakat yoʻq, kuzatamiz",
        "report": "Toʻliq hisobot: {link}",
        "owners": {"listing": "marketing", "content": "kontent", "technical": "dasturchi", "fact": "marketing"},
        "titles": {
            "listing": "{domain} saytiga joylashish",
            "content": "«{topic}» haqida sahifa yozish",
            "fact": "«{claim}» xatosini tuzatish",
            "ai_bots_blocked": "saytni AI botlarga ochish",
            "prices_as_images": "narxlarni matn bilan yozish",
            "no_business_markup": "saytga biznes belgilarini qoʻshish",
            "contacts_missing": "saytga kontaktlarni joylash",
            "technical": "saytni tuzatish",
        },
    },
}


def _names(names: List[str], words: Dict[str, Any]) -> str:
    return names[0] if len(names) == 1 else f"{', '.join(names[:-1])} {words['and']} {names[-1]}"


def _title(action: Dict[str, Any], words: Dict[str, Any]) -> str:
    titles = words["titles"]
    kind = action.get("kind", "")
    if kind == "listing":
        return titles["listing"].format(domain=action.get("domain", ""))
    if kind == "content":
        return titles["content"].format(topic=action.get("topic", ""))
    if kind == "fact":
        return titles["fact"].format(claim=action.get("claim", ""))
    return titles.get(str(action.get("check")), titles["technical"])


def _named_on(built: Dict[str, Any], pairs: Set[Tuple[str, str]], brand_id: str) -> int:
    """The buyer answers on the given (question, assistant) pairs that name a brand, each answer once."""
    return sum(1 for answer in _buyer_answers(built) if (answer["prompt_id"], answer["engine"]) in pairs and any(mention.get("brand_id") == brand_id for mention in answer["mentions"]))


def _buyer_answers(built: Dict[str, Any]) -> List[Dict[str, Any]]:
    buyers = {prompt["id"] for prompt in built["prompts"] if prompt["group"] == "discovery"}
    return [answer for answer in built["answers"] if answer["prompt_id"] in buyers]


def render(built: Dict[str, Any], computed: Dict[str, Any], language: str, link: str, previous: Optional[Dict[str, Any]] = None, action: Optional[Dict[str, Any]] = None) -> str:
    """The six lines of a check, from its data object (`built`) and metrics (`computed`); `previous` is the check
    before's (`{"wave": its data object, "metrics": its metrics}`), `action` the plan's first open action
    (`fixes.action_json`). No number is written here that the data objects, their metrics or the check's date don't
    hold. The visibility line says when the check before was asked another way (its settings differ, spec §9.2);
    the biggest change is counted only over the questions asked on the same assistant in both checks (spec §4.15:
    "matched questions")."""
    words = WORDS.get(language, WORDS["uz"])
    brand = built["project"]["brand"]["name"]
    year, month, day = built["wave"]["collected_at"][:10].split("-")
    date = words["date"].format(day=int(day), month=words["months"][int(month) - 1], year=year)
    engines = ", ".join(ENGINE_NAMES.get(row["engine"], row["engine"]) for row in computed["scope"]["engines"])
    seen = computed["visibility"]
    rows = {row["id"]: row for row in computed["brands"]["rows"]}

    lines = [" · ".join(part for part in ("Seenova", brand, date, engines) if part)]
    if previous:
        before = previous["metrics"]["visibility"]
        same_way = previous["wave"]["wave"].get("settings_hash") == built["wave"].get("settings_hash")
        change = words["was" if same_way else "wasOther"].format(named=before["named"], answers=before["answers"])
    else:
        change = words["baseline"]
    lines.append(words["visibility"].format(brand=brand, named=seen["named"], answers=seen["answers"], change=change))

    top = computed["brands"]["rivals_top"]["named"]
    if top["value"] > 0:
        lines.append(words["instead"].format(names=_names([rows[key]["name"] for key in top["ids"]], words), named=top["value"], answers=seen["answers"]))
    else:
        lines.append(words["nobody"])

    if previous is None:
        lines.append(words["first"])
    else:
        # The questions asked on the same assistant in both checks, and the answers each check has on them
        from .metrics import share

        then_built = previous["wave"]
        pairs = {(answer["prompt_id"], answer["engine"]) for answer in _buyer_answers(built)} & {(answer["prompt_id"], answer["engine"]) for answer in _buyer_answers(then_built)}
        now_n = sum(1 for answer in _buyer_answers(built) if (answer["prompt_id"], answer["engine"]) in pairs)
        then_n = sum(1 for answer in _buyer_answers(then_built) if (answer["prompt_id"], answer["engine"]) in pairs)
        if not pairs:
            lines.append(words["unmatched"])
        else:
            # The tracked brand whose share of those answers moved most, in whole points by the one rounding rule
            then_rows = {row["id"] for row in previous["metrics"]["brands"]["rows"]}
            counts = {key: (_named_on(built, pairs, key), _named_on(then_built, pairs, key)) for key in rows if key in then_rows}
            moves = [(abs((share(now, now_n) or 0) - (share(then, then_n) or 0)), key) for key, (now, then) in counts.items()]
            moved = max(moves, default=(0, None))
            if moved[0] > 0 and moved[1] is not None:
                key = moved[1]
                lines.append(words["change"].format(name=rows[key]["name"], named=counts[key][0], answers=now_n, before=counts[key][1], of=then_n))
            else:
                lines.append(words["same"])

    lines.append(words["action"].format(title=_title(action, words), owner=words["owners"].get(action.get("kind", ""), words["owners"]["technical"])) if action else words["monitoring"])
    lines.append(words["report"].format(link=link))
    return "\n".join(lines)


def for_run(db: Db, project: Project, run_id: str, language: str, link: str) -> str:
    """A check's digest as it is sent: with the check before it for the change, and the plan's first open action."""
    found = wave.payload(db, project, run_id)
    done = list(db.scalars(select(Run).where(Run.project_id == project.id, Run.status == "done").order_by(Run.collected_at)))
    index = next((at for at, run in enumerate(done) if run.id == found["wave"]["wave"]["id"]), None)
    previous = wave.payload(db, project, done[index - 1].id) if index else None
    action = next((item for item in fixes.listed(db, project) if item["status"] in ("new", "in_progress")), None)
    return render(found["wave"], found["metrics"], language, link, previous, action)
