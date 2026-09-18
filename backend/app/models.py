import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.orm import relationship as sa_relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    assets = sa_relationship("DigitalAsset", back_populates="owner", cascade="all, delete-orphan")
    heirs = sa_relationship("TrustedHeir", back_populates="user", cascade="all, delete-orphan")
    will_instructions = sa_relationship("WillInstruction", back_populates="user", cascade="all, delete-orphan")
    triggers = sa_relationship("VerificationTrigger", back_populates="user", cascade="all, delete-orphan")
    activities = sa_relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")
    vaults = sa_relationship("Vault", back_populates="owner", cascade="all, delete-orphan")

class TrustedHeir(Base):
    __tablename__ = "trusted_heirs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    relationship = Column(String, nullable=False)  # Sister, Brother, Spouse, Child, Lawyer, etc.
    access_token = Column(String, unique=True, index=True, nullable=False)
    public_key = Column(String, nullable=True)  # Curve25519 public key (Base64)
    status = Column(String, default="ACTIVE")  # ACTIVE, PENDING, VERIFIED
    permissions = Column(String, default="FULL_TRANSFER")  # FULL_TRANSFER, READ_ONLY, MEMORIAL_ONLY
    created_at = Column(DateTime, default=datetime.utcnow)

    user = sa_relationship("User", back_populates="heirs")
    assets = sa_relationship("DigitalAsset", back_populates="assigned_heir")
    will_instructions = sa_relationship("WillInstruction", back_populates="heir")
    notifications = sa_relationship("NotificationLog", back_populates="heir")

class DigitalAsset(Base):
    __tablename__ = "digital_assets"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # Email Accounts, Social Media, Cloud Storage, Important Documents, Other
    platform = Column(String, nullable=True)  # Google, GitHub, Proton, AWS, Instagram, etc.
    description = Column(Text, nullable=True)
    access_instructions = Column(Text, nullable=True)  # Strictly security directives/recovery codes, never plain passwords
    action_type = Column(String, default="Transfer")  # Transfer, Archive, Memorialize, Delete
    assigned_heir_id = Column(String, ForeignKey("trusted_heirs.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = sa_relationship("User", back_populates="assets")
    assigned_heir = sa_relationship("TrustedHeir", back_populates="assets")
    instructions = sa_relationship("WillInstruction", back_populates="asset", cascade="all, delete-orphan")

class WillInstruction(Base):
    __tablename__ = "will_instructions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    asset_id = Column(String, ForeignKey("digital_assets.id"), nullable=False)
    heir_id = Column(String, ForeignKey("trusted_heirs.id"), nullable=False)
    action_type = Column(String, nullable=False)  # Transfer, Archive, Memorialize, Delete
    special_notes = Column(Text, nullable=True)
    priority = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = sa_relationship("User", back_populates="will_instructions")
    asset = sa_relationship("DigitalAsset", back_populates="instructions")
    heir = sa_relationship("TrustedHeir", back_populates="will_instructions")

class VerificationTrigger(Base):
    __tablename__ = "verification_triggers"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    stage = Column(String, default="SECURE_ACTIVE")  # SECURE_ACTIVE, TRIGGER_INITIATED, VERIFICATION_ACTIVE, CONFIRMED, EXECUTED
    trigger_reason = Column(Text, nullable=True)
    triggered_at = Column(DateTime, nullable=True)
    grace_period_ends = Column(DateTime, nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    executed_at = Column(DateTime, nullable=True)

    user = sa_relationship("User", back_populates="triggers")
    notifications = sa_relationship("NotificationLog", back_populates="trigger")

class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    trigger_id = Column(String, ForeignKey("verification_triggers.id"), nullable=True)
    heir_id = Column(String, ForeignKey("trusted_heirs.id"), nullable=False)
    channel = Column(String, default="WHATSAPP")
    recipient_phone = Column(String, nullable=False)
    recipient_name = Column(String, nullable=True)
    message_body = Column(Text, nullable=False)
    status = Column(String, default="SENT")  # SENT, MOCK_SENT, FAILED
    twilio_sid = Column(String, nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)

    trigger = sa_relationship("VerificationTrigger", back_populates="notifications")
    heir = sa_relationship("TrustedHeir", back_populates="notifications")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    user = sa_relationship("User", back_populates="activities")

class Vault(Base):
    __tablename__ = "vaults"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False, default="Secure Digital Legacy Vault")
    description = Column(Text, nullable=True)
    ciphertext = Column(Text, nullable=False)  # Base64 encoded AES-256-GCM ciphertext + auth tag
    nonce = Column(String, nullable=False)       # Base64 encoded 96-bit IV
    algorithm = Column(String, default="AES-256-GCM")
    version = Column(Integer, default=1)
    salt = Column(String, nullable=True)
    threshold = Column(Integer, default=2)
    total_shares = Column(Integer, default=3)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = sa_relationship("User", back_populates="vaults")
    shares = sa_relationship("VaultShare", back_populates="vault", cascade="all, delete-orphan")
    audits = sa_relationship("VaultAuditLog", back_populates="vault", cascade="all, delete-orphan")

class VaultShare(Base):
    __tablename__ = "vault_shares"

    id = Column(String, primary_key=True, default=generate_uuid)
    vault_id = Column(String, ForeignKey("vaults.id"), nullable=False)
    share_index = Column(Integer, nullable=False)  # 1, 2, 3
    custodian_name = Column(String, nullable=False)
    nominee_id = Column(String, ForeignKey("trusted_heirs.id"), nullable=True)
    encrypted_share_blob = Column(Text, nullable=False)  # Curve25519 sealed box (Base64)
    nominee_public_key = Column(String, nullable=True)  # Curve25519 public key (Base64)
    created_at = Column(DateTime, default=datetime.utcnow)

    vault = sa_relationship("Vault", back_populates="shares")
    nominee = sa_relationship("TrustedHeir")

class VaultAuditLog(Base):
    __tablename__ = "vault_audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    vault_id = Column(String, ForeignKey("vaults.id"), nullable=False)
    actor_id = Column(String, nullable=True)
    action = Column(String, nullable=False)  # CREATE, RECOVERY_REQUEST, RECOVERY_COMPLETE, KEY_ROTATION, DELETE
    status = Column(String, default="SUCCESS")  # SUCCESS, FAILED, RATE_LIMITED
    details = Column(Text, nullable=True)       # Sanitized non-sensitive metadata
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    vault = sa_relationship("Vault", back_populates="audits")

