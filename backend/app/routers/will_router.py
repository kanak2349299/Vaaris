from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/will", tags=["Digital Will"])

@router.get("", response_model=schemas.WillSummaryOut)
def get_will_instructions(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    instructions = db.query(models.WillInstruction).filter(models.WillInstruction.user_id == user.id).all()
    total_assets = db.query(models.DigitalAsset).filter(models.DigitalAsset.user_id == user.id).count()
    total_heirs = db.query(models.TrustedHeir).filter(models.TrustedHeir.user_id == user.id).count()
    
    items = []
    for inst in instructions:
        items.append(schemas.WillInstructionOut(
            id=inst.id,
            asset_id=inst.asset_id,
            asset_name=inst.asset.name if inst.asset else "Unknown Asset",
            heir_id=inst.heir_id,
            heir_name=inst.heir.full_name if inst.heir else "Unknown Heir",
            action_type=inst.action_type,
            special_notes=inst.special_notes,
            priority=inst.priority,
            created_at=inst.created_at
        ))
    
    return schemas.WillSummaryOut(
        instructions=items,
        total_assets=total_assets,
        total_heirs=total_heirs,
        testament_note="I, Aryan Sharma, declare these digital directives as my binding digital legacy preferences. May my trusted heirs execute them in good faith."
    )

@router.post("", response_model=schemas.WillInstructionOut)
def add_or_update_will_instruction(data: schemas.WillInstructionCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(models.WillInstruction).filter(
        models.WillInstruction.user_id == user.id,
        models.WillInstruction.asset_id == data.asset_id
    ).first()
    
    if existing:
        existing.heir_id = data.heir_id
        existing.action_type = data.action_type
        existing.special_notes = data.special_notes
        existing.priority = data.priority
        db.commit()
        db.refresh(existing)
        inst = existing
    else:
        inst = models.WillInstruction(
            user_id=user.id,
            asset_id=data.asset_id,
            heir_id=data.heir_id,
            action_type=data.action_type,
            special_notes=data.special_notes,
            priority=data.priority
        )
        db.add(inst)
        db.commit()
        db.refresh(inst)
        
    return schemas.WillInstructionOut(
        id=inst.id,
        asset_id=inst.asset_id,
        asset_name=inst.asset.name if inst.asset else "Asset",
        heir_id=inst.heir_id,
        heir_name=inst.heir.full_name if inst.heir else "Heir",
        action_type=inst.action_type,
        special_notes=inst.special_notes,
        priority=inst.priority,
        created_at=inst.created_at
    )
