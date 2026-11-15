"""The login email: the six-digit code, sent by this service through an SMTP account (see config)."""

from __future__ import annotations

import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

from .config import settings

TEXT = """GEO

Kirish kodi / Код для входа / Login code:

    {code}

Kod {minutes} daqiqa amal qiladi. Agar siz soʻramagan boʻlsangiz, bu xatga eʼtibor bermang.
Код действует {minutes} минут. Если вы его не запрашивали, просто не отвечайте на это письмо.
The code works for {minutes} minutes. If you did not ask for it, ignore this email.
"""

HTML = """<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#14182b;max-width:440px">
<p style="font-size:18px;font-weight:700;margin:0 0 16px">GEO</p>
<p style="margin:0 0 8px;color:#666b7a">Kirish kodi · Код для входа · Login code</p>
<p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:0 0 20px">{code}</p>
<p style="margin:0;color:#666b7a;font-size:13px;line-height:1.5">Kod {minutes} daqiqa amal qiladi. Agar siz soʻramagan boʻlsangiz, bu xatga eʼtibor bermang.<br>
Код действует {minutes} минут. Если вы его не запрашивали, просто не отвечайте на это письмо.<br>
The code works for {minutes} minutes. If you did not ask for it, ignore this email.</p>
</div>"""


def send_code(to: str, code: str, minutes: int) -> None:
    """Raises `OSError` or `smtplib.SMTPException` when the email could not be handed over."""
    message = EmailMessage()
    # The code is in the subject too: it shows in the phone's notification without opening the email
    message["Subject"] = f"GEO: {code}"
    message.set_content(TEXT.format(code=code, minutes=minutes))
    message.add_alternative(HTML.format(code=code, minutes=minutes), subtype="html")
    send(to, message)


def send(to: str, message: EmailMessage) -> None:
    """Hands a prepared message (subject and content) to the SMTP account."""
    sender = settings.smtp_from or settings.smtp_user or "no-reply@localhost"
    message["From"] = formataddr(("GEO", sender))
    message["To"] = to
    host, port = settings.smtp_host or "", settings.smtp_port
    if port == 465:
        server: smtplib.SMTP = smtplib.SMTP_SSL(host, port, timeout=20, context=ssl.create_default_context())
    else:
        server = smtplib.SMTP(host, port, timeout=20)
    with server:
        if port != 465 and server.has_extn("starttls"):
            server.starttls(context=ssl.create_default_context())
        if settings.smtp_user and settings.smtp_password:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)
