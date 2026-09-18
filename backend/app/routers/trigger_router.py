from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services.verification_engine import get_or_create_trigger, advance_trigger_stage, reset_trigger_state, STAGES

router = APIRouter(prefix="/trigger", tags=["Verification & Trigger"])

@router.get("/status", response_model=schemas.TriggerStatusOut)
def get_trigger_status(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    trigger = get_or_create_trigger(db, user)
    
    stage_num = 0
    stage_label = "Safe / Inactive"
    for num, (code, label, _) in STAGES.items():
        if code == trigger.stage:
            stage_num = num
            stage_label = label
            break
            
    remaining_seconds = 0
    if trigger.grace_period_ends:
        now = datetime.utcnow()
        if trigger.grace_period_ends > now:
            remaining_seconds = int((trigger.grace_period_ends - now).total_seconds())
            
    return schemas.TriggerStatusOut(
        stage=trigger.stage,
        stage_name=stage_label,
        stage_number=stage_num,
        trigger_reason=trigger.trigger_reason,
        triggered_at=trigger.triggered_at,
        grace_period_seconds_remaining=remaining_seconds,
        confirmed_at=trigger.confirmed_at,
        executed_at=trigger.executed_at,
        can_reset=trigger.stage != "SECURE_ACTIVE"
    )

@router.post("/simulate", response_model=schemas.TriggerStatusOut)
def simulate_trigger(req: schemas.TriggerSimulateRequest = None, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    target_step = req.step if req else None
    reason = req.reason if req else None
    trigger = advance_trigger_stage(db, user, target_stage_num=target_step, reason=reason)
    return get_trigger_status(user=user, db=db)

@router.post("/reset", response_model=schemas.TriggerStatusOut)
def reset_trigger(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    reset_trigger_state(db, user)
    return get_trigger_status(user=user, db=db)
