import smtplib
from email.mime.text import MIMEText
from app.core.config import settings

def send_email(to: str, subject: str, html: str):
    
    if not settings.EMAIL_USER or not settings.EMAIL_PASS:
        raise ValueError(
            "Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS in your .env file."
        )
    
    msg = MIMEText(html, "html")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_USER
    msg["To"] = to

    try:
        # Short timeout: some hosts block outgoing SMTP, and without one a sign-up can hang for minutes
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(settings.EMAIL_USER, settings.EMAIL_PASS)
            server.sendmail(settings.EMAIL_USER, [to], msg.as_string())
    except Exception as e:
        raise Exception(f"Failed to send email: {str(e)}")
