from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/assets", tags=["Digital Assets"])

@router.get("", response_model=List[schemas.DigitalAssetOut])
def list_assets(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    assets = db.query(models.DigitalAsset).filter(models.DigitalAsset.user_id == user.id).all()
    res = []
    for a in assets:
        heir_name = a.assigned_heir.full_name if a.assigned_heir else "Unassigned"
        item = schemas.DigitalAssetOut(
            id=a.id,
            user_id=a.user_id,
            name=a.name,
            category=a.category,
            platform=a.platform,
            description=a.description,
            access_instructions=a.access_instructions,
            action_type=a.action_type,
            assigned_heir_id=a.assigned_heir_id,
            assigned_heir_name=heir_name,
            created_at=a.created_at
        )
        res.append(item)
    return res

@router.post("", response_model=schemas.DigitalAssetOut)
def create_asset(data: schemas.DigitalAssetCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_asset = models.DigitalAsset(
        user_id=user.id,
        name=data.name,
        category=data.category,
        platform=data.platform,
        description=data.description,
        access_instructions=data.access_instructions,
        action_type=data.action_type,
        assigned_heir_id=data.assigned_heir_id
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    
    # Auto-link to will if heir assigned
    if data.assigned_heir_id:
        will_inst = models.WillInstruction(
            user_id=user.id,
            asset_id=new_asset.id,
            heir_id=data.assigned_heir_id,
            action_type=data.action_type,
            special_notes="Auto-assigned during asset registration."
        )
        db.add(will_inst)
        db.commit()
        
    heir_name = new_asset.assigned_heir.full_name if new_asset.assigned_heir else "Unassigned"
    return schemas.DigitalAssetOut(
        id=new_asset.id,
        user_id=new_asset.user_id,
        name=new_asset.name,
        category=new_asset.category,
        platform=new_asset.platform,
        description=new_asset.description,
        access_instructions=new_asset.access_instructions,
        action_type=new_asset.action_type,
        assigned_heir_id=new_asset.assigned_heir_id,
        assigned_heir_name=heir_name,
        created_at=new_asset.created_at
    )

@router.put("/{asset_id}", response_model=schemas.DigitalAssetOut)
def update_asset(asset_id: str, data: schemas.DigitalAssetUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    asset = db.query(models.DigitalAsset).filter(models.DigitalAsset.id == asset_id, models.DigitalAsset.user_id == user.id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    asset.name = data.name
    asset.category = data.category
    asset.platform = data.platform
    asset.description = data.description
    asset.access_instructions = data.access_instructions
    asset.action_type = data.action_type
    asset.assigned_heir_id = data.assigned_heir_id
    
    db.commit()
    db.refresh(asset)
    
    heir_name = asset.assigned_heir.full_name if asset.assigned_heir else "Unassigned"
    return schemas.DigitalAssetOut(
        id=asset.id,
        user_id=asset.user_id,
        name=asset.name,
        category=asset.category,
        platform=asset.platform,
        description=asset.description,
        access_instructions=asset.access_instructions,
        action_type=asset.action_type,
        assigned_heir_id=asset.assigned_heir_id,
        assigned_heir_name=heir_name,
        created_at=asset.created_at
    )

@router.delete("/{asset_id}")
def delete_asset(asset_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    asset = db.query(models.DigitalAsset).filter(models.DigitalAsset.id == asset_id, models.DigitalAsset.user_id == user.id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    db.delete(asset)
    db.commit()
    return {"message": "Asset deleted successfully"}
