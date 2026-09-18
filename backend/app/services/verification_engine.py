from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app import models
from app.services.notification_service import send_whatsapp_notification

STAGES = {
    0: ("SECURE_ACTIVE", "Safe / Inactive", 0),
    1: ("TRIGGER_INITIATED", "Trigger Initiated", 1),
    2: ("VERIFICATION_ACTIVE", "Heartbeat Grace Period", 2),
    3: ("CONFIRMED", "Multi-party Verification", 3),
    4: ("EXECUTED", "Handover Executed", 4)
}

def get_or_create_trigger(db: Session, user: models.User) -> models.VerificationTrigger:
    trigger = db.query(models.VerificationTrigger).filter(models.VerificationTrigger.user_id == user.id).first()
    if not trigger:
        trigger = models.VerificationTrigger(
            user_id=user.id,
            stage="SECURE_ACTIVE",
            trigger_reason="Normal operational baseline"
        )
        db.add(trigger)
        db.commit()
        db.refresh(trigger)
    return trigger

def advance_trigger_stage(db: Session, user: models.User, target_stage_num: int = None, reason: str = None) -> models.VerificationTrigger:
    trigger = get_or_create_trigger(db, user)
    
    current_num = 0
    for num, (code, _, _) in STAGES.items():
        if code == trigger.stage:
            current_num = num
            break
            
    next_num = target_stage_num if target_stage_num is not None else (current_num + 1)
    if next_num > 4:
        next_num = 4
        
    code, label, num = STAGES[next_num]
    trigger.stage = code
    now = datetime.utcnow()
    
    if num == 1:
        trigger.triggered_at = now
        trigger.trigger_reason = reason or "Inactivity trigger simulated via Hackathon Console"
        # 30-day grace period simulated as 60 seconds for live demo, but stored as realistic timestamp
        trigger.grace_period_ends = now + timedelta(seconds=60)
        _log_activity(db, user, "TRIGGER_INITIATED", "Posthumous verification workflow initiated.")
    elif num == 2:
        if not trigger.triggered_at:
            trigger.triggered_at = now
        trigger.grace_period_ends = now + timedelta(seconds=30)
        _log_activity(db, user, "GRACE_PERIOD_ACTIVE", "Heartbeat check grace period countdown initiated.")
    elif num == 3:
        trigger.confirmed_at = now
        _log_activity(db, user, "VERIFICATION_CONFIRMED", "Multi-party legal proof and heir attestations verified.")
    elif num == 4:
        trigger.executed_at = now
        _log_activity(db, user, "LEGACY_EXECUTED", "Legacy directives unlocked. Auto-notifying all designated heirs.")
        # Automatically send WhatsApp alerts to all heirs
        heirs = db.query(models.TrustedHeir).filter(models.TrustedHeir.user_id == user.id).all()
        for heir in heirs:
            send_whatsapp_notification(db, heir, trigger, user.full_name)

    db.commit()
    db.refresh(trigger)
    return trigger

def reset_trigger_state(db: Session, user: models.User) -> models.VerificationTrigger:
    trigger = get_or_create_trigger(db, user)
    trigger.stage = "SECURE_ACTIVE"
    trigger.trigger_reason = "Manual reset by user or administrator"
    trigger.triggered_at = None
    trigger.grace_period_ends = None
    trigger.confirmed_at = None
    trigger.executed_at = None
    _log_activity(db, user, "TRIGGER_RESET", "System restored to Safe / Active baseline.")
    db.commit()
    db.refresh(trigger)
    return trigger

def _log_activity(db: Session, user: models.User, action: str, description: str):
    activity = models.ActivityLog(
        user_id=user.id,
        action=action,
        description=description,
        created_at=datetime.utcnow()
    )
    db.add(activity)
    db.commit()
