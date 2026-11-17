"""Outgoing email over plain SMTP, so any provider works (Resend, Brevo, Cloudflare Email, Gmail).

When SMTP is not configured, development and tests "send" by logging the message and keeping it in OUTBOX, which
tests read to get verification codes. Production never pretends: callers check settings.email_enabled first.
"""

import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import make_msgid

from app.core.config import get_settings

log = logging.getLogger("iccheghuri.email")


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
        log.warning("SMTP not configured; email to %s not sent. Subject: %s\n%s", mail.to, mail.subject, mail.text)
        return

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
