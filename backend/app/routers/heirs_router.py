import secrets
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/heirs", tags=["Trusted Heirs"])

@router.get("", response_model=List[schemas.TrustedHeirOut])
def list_heirs(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    heirs = db.query(models.TrustedHeir).filter(models.TrustedHeir.user_id == user.id).all()
    res = []
    for h in heirs:
        count = db.query(models.DigitalAsset).filter(models.DigitalAsset.assigned_heir_id == h.id).count()
        item = schemas.TrustedHeirOut(
            id=h.id,
            user_id=h.user_id,
            full_name=h.full_name,
            email=h.email,
            phone=h.phone,
            relationship=h.relationship,
            access_token=h.access_token,
            status=h.status,
            permissions=h.permissions,
            created_at=h.created_at,
            assigned_assets_count=count
        )
        res.append(item)
    return res

@router.post("", response_model=schemas.TrustedHeirOut)
def create_heir(data: schemas.TrustedHeirCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    clean_name = data.full_name.split()[0].upper()[:5]
    random_hex = secrets.token_hex(2).upper()
    access_token = f"VR-{clean_name}-{random_hex}"
    
    new_heir = models.TrustedHeir(
        user_id=user.id,
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        relationship=data.relationship,
        access_token=access_token,
        status="ACTIVE",
        permissions=data.permissions
    )
    db.add(new_heir)
    db.commit()
    db.refresh(new_heir)
    
    return schemas.TrustedHeirOut(
        id=new_heir.id,
        user_id=new_heir.user_id,
        full_name=new_heir.full_name,
        email=new_heir.email,
        phone=new_heir.phone,
        relationship=new_heir.relationship,
        access_token=new_heir.access_token,
        status=new_heir.status,
        permissions=new_heir.permissions,
        created_at=new_heir.created_at,
        assigned_assets_count=0
    )

@router.delete("/{heir_id}")
def delete_heir(heir_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    heir = db.query(models.TrustedHeir).filter(models.TrustedHeir.id == heir_id, models.TrustedHeir.user_id == user.id).first()
    if not heir:
        raise HTTPException(status_code=404, detail="Heir not found")
    db.delete(heir)
    db.commit()
    return {"message": "Heir deleted successfully"}
