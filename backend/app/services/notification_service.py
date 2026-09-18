import datetime
from sqlalchemy.orm import Session
from app import models
from app.config import settings

def send_whatsapp_notification(
    db: Session,
    heir: models.TrustedHeir,
    trigger: models.VerificationTrigger,
    user_name: str,
    custom_msg: str = None
):
    portal_link = f"{settings.APP_URL}/heir/{heir.access_token}"
    default_msg = (
        f"Vaaris Alert: A digital legacy action associated with your trusted contact "
        f"({user_name}) has been verified. Access key: {heir.access_token}. "
        f"View assigned digital assets and legacy instructions: {portal_link}"
    )
    message_text = custom_msg or default_msg
    status = "MOCK_SENT"
    twilio_sid = None
    error_message = None

    # Check if real Twilio credentials are configured
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
        try:
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            clean_recipient = heir.phone.strip().replace(" ", "").replace("-", "")
            if not clean_recipient.startswith("+"):
                if len(clean_recipient) == 10:
                    clean_recipient = "+91" + clean_recipient
                else:
                    clean_recipient = "+" + clean_recipient
            
            from_number = f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}"
            to_number = f"whatsapp:{clean_recipient}"

            message = client.messages.create(
                body=message_text,
                from_=from_number,
                to=to_number
            )
            twilio_sid = message.sid
            status = "SENT"
        except Exception as e:
            error_message = str(e)
            print(f"[Twilio Error] {error_message}")
            status = "FAILED"
    else:
        status = "MOCK_SENT"
        error_message = "Twilio credentials not configured in backend/.env"
    
    # Save into NotificationLog
    log_entry = models.NotificationLog(
        trigger_id=trigger.id if trigger else None,
        heir_id=heir.id,
        channel="WHATSAPP",
        recipient_phone=heir.phone,
        recipient_name=heir.full_name,
        message_body=message_text,
        status=status,
        twilio_sid=twilio_sid or error_message,
        sent_at=datetime.datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry, error_message
