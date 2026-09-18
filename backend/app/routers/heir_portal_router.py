from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

router = APIRouter(prefix="/heir-portal", tags=["Heir Portal"])

@router.get("/{access_token}")
def get_heir_portal_data(access_token: str, db: Session = Depends(get_db)):
    heir = db.query(models.TrustedHeir).filter(models.TrustedHeir.access_token == access_token).first()
    if not heir:
        raise HTTPException(status_code=404, detail="Invalid Heir Access Key")
        
    user = heir.user
    trigger = db.query(models.VerificationTrigger).filter(models.VerificationTrigger.user_id == user.id).first()
    is_executed = (trigger and trigger.stage == "EXECUTED")
    
    # Fetch assigned assets
    assets = db.query(models.DigitalAsset).filter(models.DigitalAsset.assigned_heir_id == heir.id).all()
    
    asset_list = []
    for a in assets:
        # Find specific instruction
        inst = db.query(models.WillInstruction).filter(
            models.WillInstruction.asset_id == a.id,
            models.WillInstruction.heir_id == heir.id
        ).first()
        
        asset_list.append({
            "id": a.id,
            "name": a.name,
            "category": a.category,
            "platform": a.platform,
            "description": a.description,
            "action_type": a.action_type,
            "special_notes": inst.special_notes if inst else None,
            # Reveal access directives only if trigger is EXECUTED or for demo
            "access_instructions": a.access_instructions if is_executed else "?? Locked until verification trigger reaches Handover Executed stage."
        })
        
    return {
        "heir": {
            "id": heir.id,
            "full_name": heir.full_name,
            "relationship": heir.relationship,
            "email": heir.email,
            "phone": heir.phone,
            "permissions": heir.permissions,
            "status": heir.status
        },
        "decedent": {
            "full_name": user.full_name,
            "email": user.email
        },
        "verification_status": trigger.stage if trigger else "SECURE_ACTIVE",
        "is_unlocked": is_executed,
        "assigned_assets": asset_list,
        "testament_message": (
            f"Dear {heir.full_name},\n\n"
            f"If you are reading this through the Vaaris portal, the verification trigger has been completed. "
            f"I have entrusted you with the designated digital assets listed below. Please carry out the specified actions "
            f"in accordance with my wishes.\n\nWith gratitude,\n{user.full_name}"
        )
    }

@router.post("/{access_token}/claim")
def claim_heir_assets(access_token: str, db: Session = Depends(get_db)):
    heir = db.query(models.TrustedHeir).filter(models.TrustedHeir.access_token == access_token).first()
    if not heir:
        raise HTTPException(status_code=404, detail="Invalid Heir Access Key")
        
    heir.status = "CUSTODY_CLAIMED"
    db.commit()
    
    # Log activity
    activity = models.ActivityLog(
        user_id=heir.user_id,
        action="HEIR_CLAIMED_CUSTODY",
        description=f"Trusted heir {heir.full_name} ({heir.relationship}) successfully acknowledged custody of digital assets."
    )
    db.add(activity)
    db.commit()
    
    return {
        "status": "SUCCESS",
        "message": f"Custody successfully acknowledged by {heir.full_name}. Digital Handover dossier activated."
    }
