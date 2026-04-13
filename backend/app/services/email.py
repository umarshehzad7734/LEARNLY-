import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.server = settings.SMTP_SERVER
        self.port = settings.SMTP_PORT
        self.username = settings.SMTP_USERNAME
        self.password = settings.SMTP_PASSWORD
        self.email_from = settings.EMAIL_FROM

    def send_email(self, email_to: str, subject: str, html_content: str):
        if not self.username or not self.password:
            logger.warning("SMTP credentials not provided. Printing email to console.")
            print("="*50)
            print(f"TO: {email_to}")
            print(f"SUBJECT: {subject}")
            print(f"CONTENT: {html_content}")
            print("="*50)
            return

        try:
            msg = MIMEMultipart()
            msg['From'] = self.email_from
            msg['To'] = email_to
            msg['Subject'] = subject

            msg.attach(MIMEText(html_content, 'html'))

            server = smtplib.SMTP(self.server, self.port)
            server.starttls()
            server.login(self.username, self.password)
            server.send_message(msg)
            server.quit()
            logger.info(f"Email sent to {email_to}")
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            # Ensure we don't crash the app if email fails, but maybe re-raise depending on use case
            # For now, just print to console as fallback
            print(f"FAILED TO SEND EMAIL. Content below:\nTO: {email_to}\nSUBJECT: {subject}\nCONTENT: {html_content}")

email_service = EmailService()
