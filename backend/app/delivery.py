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

from . import mail, projects
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
        "condition": "Umumiy holat",
        "visibility": "Tilga olinish",
        "place": "Kuzatilayotgan brendlar orasidagi oʻrin",
        "answers": "{answers} ta javobdan {named} tasida tilga olindingiz",
        "change": "oʻtgan tekshiruvga nisbatan {delta}",
        "same": "oʻtgan tekshiruvga nisbatan oʻzgarmadi",
        "first": "birinchi tekshiruv",
        "open": "Toʻliq hisobotni ochish",
        "attached": "Hisobot PDF koʻrinishida xatga ilova qilingan.",
        "why": "Bu xat sizga Seenova AI loyihangiz sozlamalarida koʻrsatilgan manzil boʻyicha yuborildi.",
        "points": "punkt",
    },
    "ru": {
        "subject": "{brand}: отчёт о видимости в AI, {date}",
        "intro": "Еженедельная проверка завершена. Коротко:",
        "condition": "Общее состояние",
        "visibility": "Упоминаемость",
        "place": "Место среди отслеживаемых брендов",
        "answers": "вас назвали в {named} из {answers} ответов",
        "change": "{delta} к прошлой проверке",
        "same": "без изменений к прошлой проверке",
        "first": "первая проверка",
        "open": "Открыть полный отчёт",
        "attached": "Отчёт в PDF приложен к письму.",
        "why": "Письмо отправлено на адрес, указанный в настройках вашего проекта Seenova AI.",
        "points": "п.",
    },
    "en": {
        "subject": "{brand}: AI visibility report, {date}",
        "intro": "The weekly check is done. In short:",
        "condition": "Overall condition",
        "visibility": "Visibility",
        "place": "Place among the tracked brands",
        "answers": "named in {named} of {answers} answers",
        "change": "{delta} since the last check",
        "same": "no change since the last check",
        "first": "the first check",
        "open": "Open the full report",
        "attached": "The report is attached as a PDF.",
        "why": "This email was sent to the address in your Seenova AI project's settings.",
        "points": "points",
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


def summary(report: Dict[str, Any]) -> Dict[str, Any]:
    """The few facts the email tells, from the report."""
    client = report["project"]["brand"]
    mine = next(score for score in report["scores"] if score["brandId"] == client["id"])
    ranked = sorted(report["scores"], key=lambda score: -score["visibility"])
    answers = [answer for result in report["prompts"] for answer in result["answers"]]
    conditions = report["conditionHistory"]
    return {
        "brand": client["name"],
        "date": report["method"]["collectedAt"][:10],
        "condition": conditions[-1]["score"] if conditions else None,
        "condition_change": conditions[-1]["score"] - conditions[-2]["score"] if len(conditions) > 1 else None,
        "visibility": round(mine["visibility"] * 100),
        "visibility_change": round(mine["trend"] * 100) if len(report["history"]) > 1 else None,
        "place": 1 + sum(1 for score in ranked if score["visibility"] > mine["visibility"]),
        "brands": len(ranked),
        "answers": len(answers),
        "named": sum(1 for answer in answers if any(mention["brandId"] == client["id"] for mention in answer["mentions"])),
    }


def _change(words: Dict[str, str], delta: Optional[int], unit: str) -> str:
    if delta is None:
        return words["first"]
    return words["same"] if delta == 0 else words["change"].format(delta=f"{delta:+d} {unit}".strip())


def message(facts: Dict[str, Any], language: str, url: str, attachment: Optional[bytes]) -> EmailMessage:
    words = WORDS.get(language, WORDS["uz"])
    rows = [
        (words["condition"], f"{facts['condition']} / 100", _change(words, facts["condition_change"], "")),
        (words["visibility"], f"{facts['visibility']}%", f"{words['answers'].format(named=facts['named'], answers=facts['answers'])}; {_change(words, facts['visibility_change'], words['points'])}"),
        (words["place"], f"{facts['place']} / {facts['brands']}", ""),
    ]
    email = EmailMessage()
    email["Subject"] = words["subject"].format(brand=facts["brand"], date=facts["date"])
    text = [f"{mail.BRAND} · {facts['brand']}", "", words["intro"], ""] + [f"{name}: {value}" + (f" ({note})" if note else "") for name, value, note in rows]
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
        f'<p style="margin:0 0 8px;color:#666b7a">{html.escape(words["intro"])}</p>'
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
            report = projects.report(db, project, run_id=run_id) if run_id else None
        except projects.ProjectError:
            report = None
    if not report or not report["history"] or report["history"][-1]["runId"] != run_id:
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
        mail.send(where["email"], message(summary(report), language, link(project_id, run_id, language), attachment))
    except (OSError, smtplib.SMTPException) as error:
        print(f"delivery: email failed for project {project_id}: {error!r}")
        return "failed"
    return "sent" if attachment else "sent_without_pdf"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    print(deliver(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
