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

def _remove_untouched_starter_vault(db: Session, user: models.User):
    """Remove only legacy sample records that still match the original seed exactly."""
    if user.email == "himangi@example.com":
        return

    expected_heirs = {
        "priya.gupta@example.com": (
            "Priya Gupta", "+919876543210", "Sister (Primary Nominee)",
            "FULL_TRANSFER", "VERIFIED", f"VR-PRIYA-{user.id[-4:].upper()}"
        ),
        "rohan.verma@legalfirm.in": (
            "Advocate Rohan Verma", "+919811223344", "Legal Trustee",
            "READ_ONLY", "VERIFIED", f"VR-ROHAN-{user.id[-4:].upper()}"
        ),
    }
    heirs = db.query(models.TrustedHeir).filter(
        models.TrustedHeir.user_id == user.id,
        models.TrustedHeir.email.in_(expected_heirs)
    ).all()
    if len(heirs) != len(expected_heirs):
        return

    heirs_by_email = {heir.email: heir for heir in heirs}
    for email, expected in expected_heirs.items():
        heir = heirs_by_email.get(email)
        if not heir or (
            heir.full_name, heir.phone, heir.relationship, heir.permissions,
            heir.status, heir.access_token
        ) != expected:
            return

    expected_assets = {
        ("Instagram", "Social media", "Meta Instagram", "Preserve the photo archive for family.",
         "Convert account into Memorialized status with final legacy post.", "Memorialize"): "priya.gupta@example.com",
        ("Bitcoin wallet", "Crypto & finance", "Hardware Coldcard / Multi-sig", "Release recovery shares to primary nominee.",
         "Shamir recovery shares split across 3 custodians. 2-of-3 threshold required.", "Transfer"): "priya.gupta@example.com",
        ("Google Photos", "Memories", "Google Cloud", "Family photo album and cloud memories.",
         "Full archive export rights granted to nominee.", "Archive"): "priya.gupta@example.com",
        ("Encrypted Estate Deeds & Will", "Important documents", "Proton Drive Vault", "Registered property deeds and succession instructions.",
         "Coordinate with Advocate Rohan using Share Beta of Shamir secret.", "Transfer"): "rohan.verma@legalfirm.in",
    }
    assets = db.query(models.DigitalAsset).filter(models.DigitalAsset.user_id == user.id).all()
    if len(assets) > len(expected_assets):
        return
    for asset in assets:
        signature = (
            asset.name, asset.category, asset.platform, asset.description,
            asset.access_instructions, asset.action_type
        )
        heir_email = expected_assets.get(signature)
        if not heir_email or asset.assigned_heir_id != heirs_by_email[heir_email].id:
            return

    for asset in assets:
        db.delete(asset)
    for heir in heirs:
        db.delete(heir)
    db.commit()

@router.post("/register", response_model=schemas.Token)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    clean_email = user_in.email.strip().lower()
    existing = db.query(models.User).filter(models.User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please sign in."
        )

    if not user_in.full_name.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Full name is required.")
    
    new_user = models.User(
        full_name=user_in.full_name.strip(),
        email=clean_email,
        hashed_password=get_password_hash(user_in.password),
        phone=user_in.phone.strip() if user_in.phone else None
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": new_user}

@router.post("/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    clean_email = login_data.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == clean_email).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Create an account if you are new to Vaaris."
        )

    _remove_untouched_starter_vault(db, user)
    
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
