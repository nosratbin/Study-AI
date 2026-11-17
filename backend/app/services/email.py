"""Outgoing email: Resend's HTTPS API when RESEND_API_KEY is set, otherwise plain SMTP (Resend, Brevo, Gmail, ...).

The API path exists because some hosts block outbound SMTP ports; Railway does below the Pro plan, where SMTP
connections just time out. When neither is configured, development and tests "send" by logging the message and keeping it in OUTBOX, which
tests read to get verification codes. Production never pretends: callers check settings.email_enabled first.
"""

import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import make_msgid

import httpx

from app.core.config import get_settings

log = logging.getLogger("iccheghuri.email")

RESEND_URL = "https://api.resend.com/emails"


def _client() -> httpx.Client:
    """Overridden in tests with an httpx.MockTransport."""
    return httpx.Client(timeout=20)


@dataclass
class Mail:
    to: str
    subject: str
    text: str
    html: str


# Dev/test only: the last messages "sent" without SMTP. Bounded so a long dev session can't grow it forever.
OUTBOX: list[Mail] = []


def send(mail: Mail) -> None:
    """Deliver one message. Runs in a background task, so failures are logged, never raised to the request."""
    s = get_settings()
    if not s.email_enabled:
        OUTBOX.append(mail)
        del OUTBOX[:-50]
        log.warning("Email not configured; email to %s not sent. Subject: %s\n%s", mail.to, mail.subject, mail.text)
        return
    if s.resend_api_key:
        _send_resend(mail)
    else:
        _send_smtp(mail)


def _send_resend(mail: Mail) -> None:
    s = get_settings()
    body = {"from": s.smtp_from, "to": [mail.to], "subject": mail.subject, "text": mail.text, "html": mail.html}
    try:
        with _client() as http:
            r = http.post(RESEND_URL, json=body, headers={"Authorization": f"Bearer {s.resend_api_key}"})
        if r.status_code >= 400:
            # Resend's error body names the problem (unverified domain, bad key) and never echoes the key.
            log.error("Sending email to %s failed: Resend %s %s", mail.to, r.status_code, r.text[:500])
    except httpx.HTTPError:
        log.exception("Sending email to %s failed", mail.to)


def _send_smtp(mail: Mail) -> None:
    s = get_settings()
    msg = EmailMessage()
    msg["From"] = s.smtp_from
    msg["To"] = mail.to
    msg["Subject"] = mail.subject
    msg["Message-ID"] = make_msgid(domain=s.smtp_from.rsplit("@", 1)[-1].strip("> ") or None)
    msg.set_content(mail.text)
    msg.add_alternative(mail.html, subtype="html")
    try:
        if s.smtp_security == "ssl":
            server: smtplib.SMTP = smtplib.SMTP_SSL(s.smtp_host, s.smtp_port, timeout=20, context=ssl.create_default_context())
        else:
            server = smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=20)
        with server:
            if s.smtp_security == "starttls":
                server.starttls(context=ssl.create_default_context())
            if s.smtp_username:
                server.login(s.smtp_username, s.smtp_password)
            server.send_message(msg)
    except (smtplib.SMTPException, OSError):
        # The address is the user's; the exception text can include the provider's reply, never our password.
        log.exception("Sending email to %s failed", mail.to)
