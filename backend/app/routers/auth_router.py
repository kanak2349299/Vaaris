from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

def _populate_starter_vault(db: Session, user: models.User):
    """Ensures every user (any email) has the starter assets & nominees so everything works out-of-the-box!"""
    existing_assets = db.query(models.DigitalAsset).filter(models.DigitalAsset.user_id == user.id).first()
    if existing_assets:
        return

    # 1. Nominees
    heir1 = models.TrustedHeir(
        user_id=user.id,
        full_name="Priya Gupta",
        email="priya.gupta@example.com",
        phone="+919876543210",
        relationship="Sister (Primary Nominee)",
        access_token=f"VR-PRIYA-{user.id[-4:].upper()}",
        status="VERIFIED",
        permissions="FULL_TRANSFER"
    )
    heir2 = models.TrustedHeir(
        user_id=user.id,
        full_name="Advocate Rohan Verma",
        email="rohan.verma@legalfirm.in",
        phone="+919811223344",
        relationship="Legal Trustee",
        access_token=f"VR-ROHAN-{user.id[-4:].upper()}",
        status="VERIFIED",
        permissions="READ_ONLY"
    )
    db.add_all([heir1, heir2])
    db.commit()

    # 2. Digital Assets matching user reference screenshot!
    a1 = models.DigitalAsset(
        user_id=user.id,
        name="Instagram",
        category="Social media",
        platform="Meta Instagram",
        description="Preserve the photo archive for family.",
        access_instructions="Convert account into Memorialized status with final legacy post.",
        action_type="Memorialize",
        assigned_heir_id=heir1.id
    )
    a2 = models.DigitalAsset(
        user_id=user.id,
        name="Bitcoin wallet",
        category="Crypto & finance",
        platform="Hardware Coldcard / Multi-sig",
        description="Release recovery shares to primary nominee.",
        access_instructions="Shamir recovery shares split across 3 custodians. 2-of-3 threshold required.",
        action_type="Transfer",
        assigned_heir_id=heir1.id
    )
    a3 = models.DigitalAsset(
        user_id=user.id,
        name="Google Photos",
        category="Memories",
        platform="Google Cloud",
        description="Family photo album and cloud memories.",
        access_instructions="Full archive export rights granted to nominee.",
        action_type="Archive",
        assigned_heir_id=heir1.id
    )
    a4 = models.DigitalAsset(
        user_id=user.id,
        name="Encrypted Estate Deeds & Will",
        category="Important documents",
        platform="Proton Drive Vault",
        description="Registered property deeds and succession instructions.",
        access_instructions="Coordinate with Advocate Rohan using Share Beta of Shamir secret.",
        action_type="Transfer",
        assigned_heir_id=heir2.id
    )
    db.add_all([a1, a2, a3, a4])
    db.commit()

    # 3. Trigger baseline
    trig = models.VerificationTrigger(
        user_id=user.id,
        stage="SECURE_ACTIVE",
        trigger_reason="Normal operational baseline"
    )
    db.add(trig)
    db.commit()

@router.post("/register", response_model=schemas.Token)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    clean_email = user_in.email.strip().lower()
    existing = db.query(models.User).filter(models.User.email == clean_email).first()
    if existing:
        access_token = create_access_token(data={"sub": existing.id})
        return {"access_token": access_token, "token_type": "bearer", "user": existing}
    
    new_user = models.User(
        full_name=user_in.full_name or "Himangi Gupta",
        email=clean_email,
        hashed_password=get_password_hash(user_in.password),
        phone=user_in.phone or "+919876543210"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    _populate_starter_vault(db, new_user)
    
    access_token = create_access_token(data={"sub": new_user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": new_user}

@router.post("/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    clean_email = login_data.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == clean_email).first()
    
    # Universal Login: If user does not exist, automatically create them!
    if not user:
        name_part = clean_email.split("@")[0].replace(".", " ").replace("_", " ").title()
        user = models.User(
            full_name=name_part if name_part else "Himangi Gupta",
            email=clean_email,
            hashed_password=get_password_hash(login_data.password or "legacy2026"),
            phone="+919876543210"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    # Ensure starter legacy assets exist for this user
    _populate_starter_vault(db, user)
    
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=schemas.UserOut)
def get_current_user_profile(user: models.User = Depends(get_current_user)):
    return user

@router.post("/demo-seed")
def seed_demo_profile(db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == "himangi@example.com").first()
    if not user:
        user = models.User(
            id="usr-himangi-gupta-2026",
            full_name="Himangi Gupta",
            email="himangi@example.com",
            hashed_password=get_password_hash("legacy2026"),
            phone="+919876543210"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    _populate_starter_vault(db, user)
    access_token = create_access_token(data={"sub": user.id})
    return {
        "message": "Demo profile seeded successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }
