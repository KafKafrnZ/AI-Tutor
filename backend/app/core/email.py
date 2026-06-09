import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings

logger = logging.getLogger(__name__)

# To retrieve the token in dev: SELECT token FROM auth_tokens WHERE user_id = <id>;


def _smtp_configured() -> bool:
    return bool(settings.EMAIL_HOST and settings.EMAIL_USER and settings.EMAIL_PASSWORD)


def _send(to: str, subject: str, html: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Ascend AI <{settings.EMAIL_FROM}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
        smtp.sendmail(settings.EMAIL_FROM, to, msg.as_string())


def _base_template(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:48px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #3f3f46;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #3f3f46;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:0.05em;text-transform:uppercase;">
              ✦ Ascend AI
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">{title}</h1>
            {body_html}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #3f3f46;">
            <p style="margin:0;font-size:12px;color:#71717a;">
              You're receiving this because you have an account on Ascend AI.<br>
              If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_verification_email(to: str, token: str) -> None:
    url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    if not _smtp_configured():
        logger.info(
            "dev_email_skipped recipient=%s action=verification note=SMTP not configured. Token NOT logged for security.",
            to,
        )
        return
    html = _base_template(
        "Verify your email address",
        f"""<p style="margin:0 0 24px;font-size:15px;color:#a1a1aa;line-height:1.6;">
          Click the button below to verify your Ascend AI account. This link expires in <strong style="color:#fff;">24 hours</strong>.
        </p>
        <a href="{url}" style="display:inline-block;background:#7c3aed;color:#fff;font-weight:600;font-size:15px;
           text-decoration:none;padding:14px 32px;border-radius:10px;margin-bottom:24px;">
          Verify Email Address
        </a>
        <p style="margin:16px 0 0;font-size:12px;color:#52525b;">
          Or copy this link: <a href="{url}" style="color:#8b5cf6;word-break:break-all;">{url}</a>
        </p>"""
    )
    try:
        _send(to, "Verify your Ascend AI account", html)
        logger.info("Verification email sent to %s", to)
    except Exception as exc:
        logger.error("Failed to send verification email to %s: %s", to, exc)


def send_reset_email(to: str, token: str) -> None:
    url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    if not _smtp_configured():
        logger.info(
            "dev_email_skipped recipient=%s action=password_reset note=SMTP not configured. Token NOT logged for security.",
            to,
        )
        return
    html = _base_template(
        "Reset your password",
        f"""<p style="margin:0 0 24px;font-size:15px;color:#a1a1aa;line-height:1.6;">
          We received a request to reset your Ascend AI password. Click below to choose a new one.
          This link expires in <strong style="color:#fff;">1 hour</strong>.
        </p>
        <a href="{url}" style="display:inline-block;background:#7c3aed;color:#fff;font-weight:600;font-size:15px;
           text-decoration:none;padding:14px 32px;border-radius:10px;margin-bottom:24px;">
          Reset Password
        </a>
        <p style="margin:16px 0 0;font-size:12px;color:#52525b;">
          Or copy this link: <a href="{url}" style="color:#8b5cf6;word-break:break-all;">{url}</a>
        </p>"""
    )
    try:
        _send(to, "Reset your Ascend AI password", html)
        logger.info("Reset email sent to %s", to)
    except Exception as exc:
        logger.error("Failed to send reset email to %s: %s", to, exc)