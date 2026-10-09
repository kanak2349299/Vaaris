from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, model_validator

class UserBase(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(UserBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenData(BaseModel):
    user_id: Optional[str] = None

# Asset Schemas
class DigitalAssetBase(BaseModel):
    name: str
    category: str
    platform: Optional[str] = None
    description: Optional[str] = None
    access_instructions: Optional[str] = None
    action_type: str = "Transfer"
    assigned_heir_id: Optional[str] = None

class DigitalAssetCreate(DigitalAssetBase):
    pass

class DigitalAssetUpdate(DigitalAssetBase):
    pass

class DigitalAssetOut(DigitalAssetBase):
    id: str
    user_id: str
    created_at: datetime
    assigned_heir_name: Optional[str] = None
    class Config:
        from_attributes = True

# Heir Schemas
class TrustedHeirBase(BaseModel):
    full_name: str
    email: str
    phone: str
    relationship: str
    permissions: str = "FULL_TRANSFER"

class TrustedHeirCreate(TrustedHeirBase):
    pass

class TrustedHeirOut(TrustedHeirBase):
    id: str
    user_id: str
    access_token: str
    status: str
    created_at: datetime
    assigned_assets_count: Optional[int] = 0
    class Config:
        from_attributes = True

# Will Instruction Schemas
class WillInstructionCreate(BaseModel):
    asset_id: str
    heir_id: str
    action_type: str
    special_notes: Optional[str] = None
    priority: int = 1

class WillInstructionOut(BaseModel):
    id: str
    asset_id: str
    asset_name: Optional[str] = None
    heir_id: str
    heir_name: Optional[str] = None
    action_type: str
    special_notes: Optional[str] = None
    priority: int
    created_at: datetime
    class Config:
        from_attributes = True

class WillSummaryOut(BaseModel):
    instructions: List[WillInstructionOut]
    total_assets: int
    total_heirs: int
    testament_note: Optional[str] = None

# Verification Trigger Schemas
class TriggerSimulateRequest(BaseModel):
    step: Optional[int] = None
    reason: Optional[str] = "Simulated Inactivity Trigger for Hackathon Demo"

class TriggerStatusOut(BaseModel):
    stage: str
    stage_name: str
    stage_number: int
    trigger_reason: Optional[str] = None
    triggered_at: Optional[datetime] = None
    grace_period_seconds_remaining: Optional[int] = None
    confirmed_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    can_reset: bool

# Notification Schemas
class NotificationOut(BaseModel):
    id: str
    channel: str
    recipient_phone: str
    recipient_name: Optional[str] = None
    message_body: str
    status: str
    sent_at: datetime
    class Config:
        from_attributes = True

class TestWhatsAppRequest(BaseModel):
    heir_id: str
    custom_message: Optional[str] = None

# Dashboard Stats
class DashboardStatsOut(BaseModel):
    total_assets: int
    total_heirs: int
    active_will_instructions: int
    verification_status: str
    verification_stage_number: int
    recent_activities: List[dict]


# Shamir Vault Schemas
class ShamirShareOut(BaseModel):
    share_index: int
    share_label: str
    custodian: str
    share_value: str
    assigned_heir_id: Optional[str] = None

class ShamirSplitRequest(BaseModel):
    secret: Optional[str] = None
    threshold: int = Field(default=2, ge=2, le=5)
    total_shares: int = Field(default=3, ge=2, le=5)

    @model_validator(mode="after")
    def validate_threshold(self):
        if self.threshold > self.total_shares:
            raise ValueError("Threshold cannot exceed the total number of shares.")
        return self

class ShamirSplitResponse(BaseModel):
    status: str
    threshold: int
    total_shares: int
    original_secret: str
    shares: List[ShamirShareOut]

class ShamirReconstructRequest(BaseModel):
    shares: List[str]

class ShamirReconstructResponse(BaseModel):
    status: str
    reconstructed_secret: str
    verified: bool

# Production Zero-Knowledge Vault Schemas
class VaultShareCreate(BaseModel):
    share_index: int
    custodian_name: str
    nominee_id: Optional[str] = None
    encrypted_share_blob: str
    nominee_public_key: Optional[str] = None

class VaultShareOut(BaseModel):
    id: str
    vault_id: str
    share_index: int
    custodian_name: str
    nominee_id: Optional[str] = None
    encrypted_share_blob: str
    nominee_public_key: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class VaultCreate(BaseModel):
    name: str = "Secure Digital Legacy Vault"
    description: Optional[str] = None
    ciphertext: str
    nonce: str
    algorithm: str = "AES-256-GCM"
    version: int = 1
    salt: Optional[str] = None
    threshold: int = Field(default=2, ge=2, le=5)
    total_shares: int = Field(default=3, ge=2, le=5)
    shares: List[VaultShareCreate]

    @model_validator(mode="after")
    def validate_threshold(self):
        if self.threshold > self.total_shares:
            raise ValueError("Threshold cannot exceed the total number of shares.")
        return self

class VaultOut(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    ciphertext: str
    nonce: str
    algorithm: str
    version: int
    threshold: int
    total_shares: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    shares: List[VaultShareOut] = []
    class Config:
        from_attributes = True

class VaultRecoveryRequest(BaseModel):
    vault_id: str

class VaultRecoveryRequestResponse(BaseModel):
    vault_id: str
    vault_name: str
    algorithm: str
    version: int
    nonce: str
    threshold: int
    total_shares: int
    required_nominees: List[dict]

class NomineeShareSubmission(BaseModel):
    share_index: int
    custodian_name: Optional[str] = None
    encrypted_share_blob: Optional[str] = None

class VaultRecoveryComplete(BaseModel):
    vault_id: str
    submitted_shares: List[NomineeShareSubmission]

class VaultRecoveryCompleteResponse(BaseModel):
    status: str
    ciphertext: str
    nonce: str
    algorithm: str
    version: int
    message: str

class VaultRotateKeyRequest(BaseModel):
    vault_id: str
    ciphertext: str
    nonce: str
    algorithm: str = "AES-256-GCM"
    version: int
    salt: Optional[str] = None
    threshold: int = Field(default=2, ge=2, le=5)
    total_shares: int = Field(default=3, ge=2, le=5)
    shares: List[VaultShareCreate]

    @model_validator(mode="after")
    def validate_threshold(self):
        if self.threshold > self.total_shares:
            raise ValueError("Threshold cannot exceed the total number of shares.")
        return self

class VaultAuditOut(BaseModel):
    id: str
    vault_id: str
    action: str
    status: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True
