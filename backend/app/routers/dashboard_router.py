from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=schemas.DashboardStatsOut)
def get_dashboard_stats(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_assets = db.query(models.DigitalAsset).filter(models.DigitalAsset.user_id == user.id).count()
    total_heirs = db.query(models.TrustedHeir).filter(models.TrustedHeir.user_id == user.id).count()
    active_will_instructions = db.query(models.WillInstruction).filter(models.WillInstruction.user_id == user.id).count()
    
    trigger = db.query(models.VerificationTrigger).filter(models.VerificationTrigger.user_id == user.id).first()
    status_label = trigger.stage if trigger else "SECURE_ACTIVE"
    
    stage_map = {
        "SECURE_ACTIVE": 0,
        "TRIGGER_INITIATED": 1,
        "VERIFICATION_ACTIVE": 2,
        "CONFIRMED": 3,
        "EXECUTED": 4
    }
    stage_num = stage_map.get(status_label, 0)
    
    activities = (
        db.query(models.ActivityLog)
        .filter(models.ActivityLog.user_id == user.id)
        .order_by(models.ActivityLog.created_at.desc())
        .limit(6)
        .all()
    )
    
    activities_out = [
        {
            "id": a.id,
            "action": a.action,
            "description": a.description,
            "created_at": a.created_at.isoformat()
        }
        for a in activities
    ]
    
    return {
        "total_assets": total_assets,
        "total_heirs": total_heirs,
        "active_will_instructions": active_will_instructions,
        "verification_status": status_label,
        "verification_stage_number": stage_num,
        "recent_activities": activities_out
    }
