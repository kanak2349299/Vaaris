from datetime import datetime
from sqlalchemy.orm import Session
from app import models
from app.auth import get_password_hash

def seed_database(db: Session):
    existing_user = db.query(models.User).filter(models.User.email == "himangi@example.com").first()
    if existing_user:
        return existing_user

    print("[Seed] Seeding realistic Himangi Gupta hackathon demo data...")
    # 1. Create Demo User
    user = models.User(
        id="usr-himangi-gupta-2026",
        full_name="Himangi Gupta",
        email="himangi@example.com",
        hashed_password=get_password_hash("legacy2026"),
        phone="+919876543210",
        created_at=datetime.utcnow()
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 2. Create Trusted Heirs / Nominees
    heir_priya = models.TrustedHeir(
        id="heir-priya-gupta",
        user_id=user.id,
        full_name="Priya Gupta",
        email="priya.gupta@example.com",
        phone="+919876543210",
        relationship="Sister (Primary Nominee)",
        access_token="VR-PRIYA-772",
        status="VERIFIED",
        permissions="FULL_TRANSFER"
    )
    heir_rohan = models.TrustedHeir(
        id="heir-rohan-verma",
        user_id=user.id,
        full_name="Advocate Rohan Verma",
        email="rohan.verma@legalfirm.in",
        phone="+919811223344",
        relationship="Legal Trustee",
        access_token="VR-ROHAN-991",
        status="VERIFIED",
        permissions="READ_ONLY"
    )
    db.add_all([heir_priya, heir_rohan])
    db.commit()

    # 3. Create Digital Assets (Matching user screenshot: Instagram, Bitcoin wallet, Google Photos)
    asset1 = models.DigitalAsset(
        id="ast-instagram",
        user_id=user.id,
        name="Instagram",
        category="Social media",
        platform="Meta Instagram",
        description="Public social profile with photography and community memories.",
        access_instructions="Preserve the photo archive for family. Transition account to official Memorialized state.",
        action_type="Memorialize",
        assigned_heir_id=heir_priya.id
    )
    asset2 = models.DigitalAsset(
        id="ast-bitcoin-wallet",
        user_id=user.id,
        name="Bitcoin wallet",
        category="Crypto & finance",
        platform="Hardware Coldcard / Multi-sig",
        description="Long-term Bitcoin and digital asset savings reserve.",
        access_instructions="Release Shamir recovery shares to primary nominee. Threshold 2-of-3 required to reconstruct master seed.",
        action_type="Transfer",
        assigned_heir_id=heir_priya.id
    )
    asset3 = models.DigitalAsset(
        id="ast-google-photos",
        user_id=user.id,
        name="Google Photos",
        category="Memories",
        platform="Google Cloud",
        description="15 years of irreplaceable family photos, travel albums, and journals.",
        access_instructions="Grant full export and archive rights to family album repository.",
        action_type="Archive",
        assigned_heir_id=heir_priya.id
    )
    asset4 = models.DigitalAsset(
        id="ast-estate-docs",
        user_id=user.id,
        name="Encrypted Estate Deeds & Will",
        category="Important documents",
        platform="Proton Drive Vault",
        description="Registered property documents, company shares, and bank deeds.",
        access_instructions="Advocate Rohan has Share Beta of Shamir Secret. Coordinate with legal executor.",
        action_type="Transfer",
        assigned_heir_id=heir_rohan.id
    )
    db.add_all([asset1, asset2, asset3, asset4])
    db.commit()

    # 4. Create Will Instructions
    will1 = models.WillInstruction(
        user_id=user.id,
        asset_id=asset1.id,
        heir_id=heir_priya.id,
        action_type="Memorialize",
        special_notes="Preserve the photo archive for family.",
        priority=1
    )
    will2 = models.WillInstruction(
        user_id=user.id,
        asset_id=asset2.id,
        heir_id=heir_priya.id,
        action_type="Transfer",
        special_notes="Release recovery shares to primary nominee.",
        priority=1
    )
    will3 = models.WillInstruction(
        user_id=user.id,
        asset_id=asset3.id,
        heir_id=heir_priya.id,
        action_type="Archive",
        special_notes="Family album access for parents and siblings.",
        priority=2
    )
    will4 = models.WillInstruction(
        user_id=user.id,
        asset_id=asset4.id,
        heir_id=heir_rohan.id,
        action_type="Transfer",
        special_notes="Initiate legal succession protocol.",
        priority=1
    )
    db.add_all([will1, will2, will3, will4])
    db.commit()

    # 5. Baseline Trigger
    trigger = models.VerificationTrigger(
        user_id=user.id,
        stage="SECURE_ACTIVE",
        trigger_reason="Normal operational baseline"
    )
    db.add(trigger)

    # 6. Activities
    act1 = models.ActivityLog(user_id=user.id, action="VAULT_INITIALIZED", description="Vaaris legacy vault established with 3-way Shamir Secret Sharing.")
    act2 = models.ActivityLog(user_id=user.id, action="NOMINEES_ASSIGNED", description="Nominees Priya Gupta and Adv. Rohan Verma assigned cryptographic shares.")
    act3 = models.ActivityLog(user_id=user.id, action="LEGACY_RECORDED", description="Legacy directives recorded for Instagram, Bitcoin wallet, and Google Photos.")
    db.add_all([act1, act2, act3])
    db.commit()

    print("[Seed] Himangi Gupta demo data seeded successfully!")
    return user
