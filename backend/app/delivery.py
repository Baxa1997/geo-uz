"""A check's report on its way to the client: the PDF, and the email with the summary, the link and the PDF.

    python -m app.delivery <project id> [<run id>]     send a report again, the latest when no run is named

The PDF is the report's own page (`/projects/{id}/report?run=` in the frontend at `FRONTEND_ORIGIN`) printed
by a headless Chrome, so the paper and the page can never differ. The email goes to the address in the
project's report settings (Hisobotlar › where the report goes), in the language chosen there, through the
same SMTP account as the login codes; nothing is sent when no address or no SMTP account is set.
"""

from __future__ import annotations

import html
import shutil
import smtplib
import subprocess
import sys
import tempfile
from email.message import EmailMessage
from pathlib import Path
from typing import Any, Dict, Optional

from sqlalchemy import select

from . import digest, mail, projects, wave
from .config import settings
from .db import Project, Run, SessionLocal

CHROMES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
]

WORDS = {
    "uz": {
        "subject": "{brand}: AI koʻrinish hisoboti, {date}",
        "intro": "Haftalik tekshiruv yakunlandi. Qisqacha:",
        "visibility": "Tilga olinish",
        "answers": "xaridorlarning {answers} ta javobidan {named} tasida tilga olindingiz",
        "small": "kichik namuna",
        "questions": "Sizni tilga olgan savollar",
        "leaders": "Eng koʻp tilga olingan",
        "nobody": "kuzatilayotgan brendlardan hech biri tilga olinmadi",
        "tied": "teng",
        "open": "Toʻliq hisobotni ochish",
        "attached": "Hisobot PDF koʻrinishida xatga ilova qilingan.",
        "why": "Bu xat sizga Seenova AI loyihangiz sozlamalarida koʻrsatilgan manzil boʻyicha yuborildi.",
    },
    "ru": {
        "subject": "{brand}: отчёт о видимости в AI, {date}",
        "intro": "Еженедельная проверка завершена. Коротко:",
        "visibility": "Упоминаемость",
        "answers": "вас назвали в {named} из {answers} ответов покупателям",
        "small": "малая выборка",
        "questions": "Вопросы, где вас назвали",
        "leaders": "Чаще всех называют",
        "nobody": "ни один отслеживаемый бренд не назван",
        "tied": "поровну",
        "open": "Открыть полный отчёт",
        "attached": "Отчёт в PDF приложен к письму.",
        "why": "Письмо отправлено на адрес, указанный в настройках вашего проекта Seenova AI.",
    },
    "en": {
        "subject": "{brand}: AI visibility report, {date}",
        "intro": "The weekly check is done. In short:",
        "visibility": "Visibility",
        "answers": "named in {named} of {answers} buyer answers",
        "small": "small sample",
        "questions": "Questions that name you",
        "leaders": "Named most",
        "nobody": "no tracked brand was named",
        "tied": "tied",
        "open": "Open the full report",
        "attached": "The report is attached as a PDF.",
        "why": "This email was sent to the address in your Seenova AI project's settings.",
    },
}


class DeliveryError(RuntimeError):
    pass


def link(project_id: str, run_id: str, language: str) -> str:
    return f"{settings.frontend_origin.rstrip('/')}/{language}/projects/{project_id}/report?run={run_id}"


def _chrome() -> str:
    for candidate in [settings.chrome_path, *CHROMES]:
        if candidate and (Path(candidate).is_file() or shutil.which(candidate)):
            return candidate
    raise DeliveryError("no_browser")


def available() -> bool:
    """Whether a report can be printed here: a browser is installed, and the report's page is at an address the
    browser can reach (on the server, the site's public address, not this computer's)."""
    try:
        _chrome()
    except DeliveryError:
        return False
    origin = settings.frontend_origin.lower()
    return not (settings.secure_cookies and ("//localhost" in origin or "//127.0.0.1" in origin))


def pdf(project_id: str, run_id: str, language: str) -> bytes:
    """The report's page printed as A4. Raises DeliveryError when no browser is installed or the page didn't print."""
    with tempfile.TemporaryDirectory() as folder:
        target = Path(folder) / "report.pdf"
        command = [_chrome(), "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer", f"--user-data-dir={folder}/profile", "--virtual-time-budget=20000", f"--print-to-pdf={target}", link(project_id, run_id, language)]
        try:
            subprocess.run(command, capture_output=True, timeout=120, check=False)
        except (OSError, subprocess.TimeoutExpired) as error:
            raise DeliveryError("print_failed") from error
        if not target.is_file() or target.stat().st_size < 5_000:
            raise DeliveryError("print_failed")
        return target.read_bytes()


def summary(found: Dict[str, Any]) -> Dict[str, Any]:
    """The few facts the email tells, from the check's data object and its metrics (`wave.payload`): counts, no
    score (report spec rule 1), and who is named most with every brand that ties."""
    seen = found["metrics"]["visibility"]
    rows = {row["id"]: row for row in found["metrics"]["brands"]["rows"]}
    return {
        "brand": found["wave"]["project"]["brand"]["name"],
        "date": found["wave"]["wave"]["collected_at"][:10],
        "named": seen["named"],
        "answers": seen["answers"],
        "small_sample": seen["small_sample"],
        "prompts_named": seen["prompts_named"],
        "prompts": seen["prompts"],
        "leaders": [{"name": rows[key]["name"], "named": rows[key]["named"]} for key in found["metrics"]["brands"]["leaders"]],
    }


def message(facts: Dict[str, Any], language: str, url: str, attachment: Optional[bytes], digest_text: str = "") -> EmailMessage:
    """The report's email; `digest_text` (the Telegram digest, Phase 0 item 0.8) opens it, ready to forward."""
    words = WORDS.get(language, WORDS["uz"])
    leaders = facts["leaders"]
    rows = [
        (words["visibility"], f"{facts['named']}/{facts['answers']}", words["answers"].format(named=facts["named"], answers=facts["answers"]) + (f"; {words['small']}" if facts["small_sample"] else "")),
        (words["questions"], f"{facts['prompts_named']}/{facts['prompts']}", ""),
        (
            words["leaders"],
            ", ".join(f"{leader['name']} {leader['named']}/{facts['answers']}" for leader in leaders) if leaders else words["nobody"],
            words["tied"] if len(leaders) > 1 else "",
        ),
    ]
    email = EmailMessage()
    email["Subject"] = words["subject"].format(brand=facts["brand"], date=facts["date"])
    text = ([digest_text, "", "—", ""] if digest_text else []) + [f"{mail.BRAND} · {facts['brand']}", "", words["intro"], ""] + [f"{name}: {value}" + (f" ({note})" if note else "") for name, value, note in rows]
    text += ["", f"{words['open']}: {url}"] + ([words["attached"]] if attachment else []) + ["", words["why"]]
    email.set_content("\n".join(text))
    cells = "".join(
        f'<tr><td style="padding:10px 0;border-top:1px solid #e6e3dc;color:#666b7a">{html.escape(name)}</td>'
        f'<td style="padding:10px 0 10px 16px;border-top:1px solid #e6e3dc;text-align:right"><b style="font-size:18px">{html.escape(value)}</b>'
        f'<div style="color:#666b7a;font-size:12px">{html.escape(note)}</div></td></tr>'
        for name, value, note in rows
    )
    email.add_alternative(
        f'<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#14182b;max-width:520px">'
        + mail.WORDMARK_HTML.replace("margin:0 0 16px", "margin:0 0 4px")
        + f'<p style="font-size:16px;margin:0 0 16px">{html.escape(facts["brand"])} · {html.escape(facts["date"])}</p>'
        + (f'<pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;background:#f4f2ed;border-radius:6px;padding:12px;margin:0 0 16px">{html.escape(digest_text)}</pre>' if digest_text else "")
        + f'<p style="margin:0 0 8px;color:#666b7a">{html.escape(words["intro"])}</p>'
        f'<table style="width:100%;border-collapse:collapse;margin:0 0 20px">{cells}</table>'
        f'<p style="margin:0 0 16px"><a href="{html.escape(url)}" style="display:inline-block;background:#1c2e6e;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">{html.escape(words["open"])}</a></p>'
        + (f'<p style="margin:0 0 8px;color:#666b7a;font-size:13px">{html.escape(words["attached"])}</p>' if attachment else "")
        + f'<p style="margin:0;color:#666b7a;font-size:12px">{html.escape(words["why"])}</p></div>',
        subtype="html",
    )
    if attachment:
        email.add_attachment(attachment, maintype="application", subtype="pdf", filename=f"geo-report-{facts['date']}.pdf")
    return email


def deliver(project_id: str, run_id: Optional[str] = None) -> str:
    """Emails a run's report. Returns what happened: "sent", "sent_without_pdf", "no_address", "no_smtp", "no_report" or "failed"."""
    with SessionLocal() as db:
        project = db.get(Project, project_id)
        if project is None:
            return "no_report"
        if run_id is None:
            run_id = db.scalar(select(Run.id).where(Run.project_id == project_id, Run.status == "done").order_by(Run.collected_at.desc()))
        where = projects.report_settings(project)
        try:
            found = wave.payload(db, project, run_id) if run_id else None
        except projects.ProjectError:
            found = None
    if not found:
        return "no_report"
    if not where["email"]:
        return "no_address"
    if not settings.own_email:
        return "no_smtp"
    language = where["language"]
    try:
        attachment: Optional[bytes] = pdf(project_id, run_id, language)
    except DeliveryError as error:
        print(f"delivery: no PDF for project {project_id}: {error}")
        attachment = None
    try:
        with SessionLocal() as db:
            text = digest.for_run(db, db.get(Project, project_id), run_id, language, link(project_id, run_id, language))
    except Exception as error:  # the email goes without its digest rather than not at all
        print(f"delivery: no digest for project {project_id}: {error!r}")
        text = ""
    try:
        mail.send(where["email"], message(summary(found), language, link(project_id, run_id, language), attachment, text))
    except (OSError, smtplib.SMTPException) as error:
        print(f"delivery: email failed for project {project_id}: {error!r}")
        return "failed"
    return "sent" if attachment else "sent_without_pdf"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    print(deliver(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
