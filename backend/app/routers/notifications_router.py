from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services.notification_service import send_whatsapp_notification
from app.config import settings

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class TwilioConfigRequest(BaseModel):
    account_sid: str
    auth_token: str
    whatsapp_number: str = "+14155238886"

@router.get("", response_model=List[schemas.NotificationOut])
def list_notifications(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    heir_ids = [h.id for h in user.heirs]
    logs = (
        db.query(models.NotificationLog)
        .filter(models.NotificationLog.heir_id.in_(heir_ids))
        .order_by(models.NotificationLog.sent_at.desc())
        .all()
    )
    return logs

@router.post("/test-whatsapp")
def send_test_whatsapp(data: schemas.TestWhatsAppRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    heir = db.query(models.TrustedHeir).filter(models.TrustedHeir.id == data.heir_id, models.TrustedHeir.user_id == user.id).first()
    if not heir:
        # Fallback to any heir with this id
        heir = db.query(models.TrustedHeir).filter(models.TrustedHeir.id == data.heir_id).first()
        if not heir:
            raise HTTPException(status_code=404, detail="Nominee not found")
        
    trigger = db.query(models.VerificationTrigger).filter(models.VerificationTrigger.user_id == user.id).first()
    log, error_msg = send_whatsapp_notification(db, heir, trigger, user.full_name, custom_msg=data.custom_message)
    
    return {
        "status": log.status,
        "message": "WhatsApp dispatched via Twilio" if log.status == "SENT" else "Twilio Error",
        "error_detail": error_msg,
        "is_real_twilio": log.status == "SENT",
        "log": {
            "id": log.id,
            "recipient_name": log.recipient_name,
            "recipient_phone": log.recipient_phone,
            "message_body": log.message_body,
            "channel": log.channel,
            "sent_at": log.sent_at.isoformat()
        }
    }

@router.get("/config-status")
def get_twilio_config_status():
    has_sid = bool(settings.TWILIO_ACCOUNT_SID)
    has_token = bool(settings.TWILIO_AUTH_TOKEN)
    return {
        "twilio_configured": has_sid and has_token,
        "whatsapp_sender": settings.TWILIO_WHATSAPP_NUMBER,
        "mode": "Live Twilio API" if (has_sid and has_token) else "Credentials Needed"
    }

@router.post("/configure-twilio")
def configure_twilio(data: TwilioConfigRequest):
    settings.TWILIO_ACCOUNT_SID = data.account_sid.strip()
    settings.TWILIO_AUTH_TOKEN = data.auth_token.strip()
    settings.TWILIO_WHATSAPP_NUMBER = data.whatsapp_number.strip()
    
    env_content = f"""TWILIO_ACCOUNT_SID={settings.TWILIO_ACCOUNT_SID}
TWILIO_AUTH_TOKEN={settings.TWILIO_AUTH_TOKEN}
TWILIO_WHATSAPP_NUMBER={settings.TWILIO_WHATSAPP_NUMBER}
DATABASE_TYPE=sqlite
DATABASE_URL=sqlite:///./vaaris.db
JWT_SECRET=vaaris_super_secret_hackathon_jwt_key_2026
APP_URL=http://localhost:5173
"""
    with open("backend/.env", "w", encoding="utf-8") as f:
        f.write(env_content)
        
    return {
        "status": "SUCCESS",
        "message": "Twilio credentials successfully configured and saved to .env!",
        "twilio_configured": True
    }
