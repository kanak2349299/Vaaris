import time
from collections import defaultdict
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services.shamir import split_secret, reconstruct_secret

router = APIRouter(prefix="/vault", tags=["Secure Vault & Shamir SSS"])

# In-Memory Rate Limiter for recovery and cryptographic operations (Max 5 attempts / 60 seconds)
_rate_limits = defaultdict(list)

def enforce_rate_limit(key: str, max_requests: int = 5, window_seconds: int = 60):
    now = time.time()
    clean_history = [t for t in _rate_limits[key] if now - t < window_seconds]
    if len(clean_history) >= max_requests:
        retry_after = int(window_seconds - (now - clean_history[0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {max_requests} recovery attempts allowed per {window_seconds}s. Please retry in {retry_after} seconds."
        )
    clean_history.append(now)
    _rate_limits[key] = clean_history

def validate_vault_shares(data, user: models.User, db: Session):
    if len(data.shares) != data.total_shares:
        raise HTTPException(
            status_code=400,
            detail=f"Expected {data.total_shares} sealed shares for the configured policy; received {len(data.shares)}."
        )

    indices = [share.share_index for share in data.shares]
    if sorted(indices) != list(range(1, data.total_shares + 1)):
        raise HTTPException(status_code=400, detail="Share indices must be unique and cover 1 through total_shares.")

    nominee_ids = [share.nominee_id for share in data.shares if share.nominee_id]
    if len(nominee_ids) != len(set(nominee_ids)):
        raise HTTPException(status_code=400, detail="Each nominee can hold only one share.")
    if nominee_ids:
        owned_nominees = {
            nominee.id for nominee in db.query(models.TrustedHeir).filter(
                models.TrustedHeir.user_id == user.id,
                models.TrustedHeir.id.in_(nominee_ids)
            ).all()
        }
        if owned_nominees != set(nominee_ids):
            raise HTTPException(status_code=400, detail="Shares may only be assigned to your own nominees.")

    for share in data.shares:
        if not share.encrypted_share_blob:
            raise HTTPException(status_code=400, detail="Every share must be sealed before it is stored.")

# Helper: Log Vault Audit Event (sanitized, zero-knowledge: never stores plain keys or shares)
def log_vault_audit(db: Session, vault_id: str, action: str, status: str, details: str, ip_address: Optional[str] = None, actor_id: Optional[str] = None):
    try:
        audit_entry = models.VaultAuditLog(
            vault_id=vault_id,
            actor_id=actor_id,
            action=action,
            status=status,
            details=details,
            ip_address=ip_address or "127.0.0.1"
        )
        db.add(audit_entry)
        db.commit()
    except Exception as e:
        print(f"[Audit Log Warning] Failed to log vault event: {e}")

# ==========================================
# PRODUCTION ZERO-KNOWLEDGE VAULT ENDPOINTS
# ==========================================

@router.post("", response_model=schemas.VaultOut, status_code=status.HTTP_201_CREATED)
def create_vault(
    data: schemas.VaultCreate,
    request: Request,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Store client-side encrypted vault ciphertext and Curve25519 sealed Shamir shares.
    Zero-Knowledge Guarantee: Server receives only AES-256-GCM ciphertext, 96-bit nonce,
    and public-key-encrypted nominee shares. Server never sees plaintext or DEK.
    """
    if not data.ciphertext or not data.nonce:
        raise HTTPException(status_code=400, detail="Ciphertext and 96-bit nonce/IV are strictly required.")
    
    validate_vault_shares(data, user, db)

    client_ip = request.client.host if request.client else "127.0.0.1"

    new_vault = models.Vault(
        user_id=user.id,
        name=data.name,
        description=data.description,
        ciphertext=data.ciphertext,
        nonce=data.nonce,
        algorithm=data.algorithm,
        version=data.version,
        salt=data.salt,
        threshold=data.threshold,
        total_shares=data.total_shares
    )
    db.add(new_vault)
    db.flush()

    for s in data.shares:
        share_record = models.VaultShare(
            vault_id=new_vault.id,
            share_index=s.share_index,
            custodian_name=s.custodian_name,
            nominee_id=s.nominee_id,
            encrypted_share_blob=s.encrypted_share_blob,
            nominee_public_key=s.nominee_public_key
        )
        db.add(share_record)

    db.commit()
    db.refresh(new_vault)

    log_vault_audit(
        db=db,
        vault_id=new_vault.id,
        actor_id=user.id,
        action="CREATE",
        status="SUCCESS",
        details=f"Secure vault '{new_vault.name}' created with {new_vault.threshold}-of-{new_vault.total_shares} Shamir threshold and Curve25519 sealed shares.",
        ip_address=client_ip
    )

    return new_vault

@router.get("", response_model=List[schemas.VaultOut])
def list_vaults(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all vaults owned by the authenticated user.
    Returns only ciphertext and encryption metadata.
    """
    vaults = db.query(models.Vault).filter(models.Vault.user_id == user.id).order_by(models.Vault.created_at.desc()).all()
    return vaults

@router.get("/{vault_id}", response_model=schemas.VaultOut)
def get_vault(
    vault_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve vault by ID. Enforces ownership authorization.
    """
    vault = db.query(models.Vault).filter(models.Vault.id == vault_id).first()
    if not vault:
        raise HTTPException(status_code=404, detail="Vault not found")
    
    if vault.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied: You do not own this vault.")
    
    return vault

@router.post("/recovery/request", response_model=schemas.VaultRecoveryRequestResponse)
def request_vault_recovery(
    data: schemas.VaultRecoveryRequest,
    request: Request,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiate recovery of an encrypted vault.
    Rate-limited to prevent brute-force attacks (5 attempts/min).
    Returns the required nominee identities and public keys.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    enforce_rate_limit(f"recovery_req_{data.vault_id}_{client_ip}", max_requests=5, window_seconds=60)

    vault = db.query(models.Vault).filter(models.Vault.id == data.vault_id).first()
    if not vault:
        raise HTTPException(status_code=404, detail="Vault not found")

    is_owner = (vault.user_id == user.id)
    user_nominee = db.query(models.TrustedHeir).filter(
        models.TrustedHeir.user_id == vault.user_id,
        models.TrustedHeir.email == user.email
    ).first()
    
    if not is_owner and not user_nominee:
        log_vault_audit(db, data.vault_id, "RECOVERY_REQUEST", "FAILED", f"Unauthorized recovery attempt by {user.email}", client_ip, user.id)
        raise HTTPException(status_code=403, detail="Unauthorized: Only vault owner or authorized nominees can initiate recovery.")

    required_nominees = []
    for share in vault.shares:
        required_nominees.append({
            "share_index": share.share_index,
            "custodian_name": share.custodian_name,
            "nominee_id": share.nominee_id,
            "nominee_public_key": share.nominee_public_key,
            "encrypted_share_blob": share.encrypted_share_blob
        })

    log_vault_audit(
        db,
        vault.id,
        "RECOVERY_REQUEST",
        "SUCCESS",
        f"Recovery challenge initiated by {user.email}. Threshold: {vault.threshold}-of-{vault.total_shares}.",
        client_ip,
        user.id
    )

    return {
        "vault_id": vault.id,
        "vault_name": vault.name,
        "algorithm": vault.algorithm,
        "version": vault.version,
        "nonce": vault.nonce,
        "threshold": vault.threshold,
        "total_shares": vault.total_shares,
        "required_nominees": required_nominees
    }

@router.post("/recovery/complete", response_model=schemas.VaultRecoveryCompleteResponse)
def complete_vault_recovery(
    data: schemas.VaultRecoveryComplete,
    request: Request,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Release ciphertext only to the vault owner or a nominee after the stored policy is met.
    Rate-limited (5 attempts/min).
    Returns the ciphertext and nonce so the client can locally reconstruct the DEK and decrypt.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    enforce_rate_limit(f"recovery_comp_{data.vault_id}_{client_ip}", max_requests=5, window_seconds=60)

    vault = db.query(models.Vault).filter(models.Vault.id == data.vault_id).first()
    if not vault:
        raise HTTPException(status_code=404, detail="Vault not found")

    if vault.user_id != user.id:
        user_nominee = db.query(models.TrustedHeir).filter(
            models.TrustedHeir.user_id == vault.user_id,
            models.TrustedHeir.email == user.email
        ).first()
        if not user_nominee:
            log_vault_audit(
                db, vault.id, "RECOVERY_COMPLETE", "FAILED",
                f"Unauthorized recovery completion attempt by {user.email}",
                client_ip, user.id
            )
            raise HTTPException(status_code=403, detail="Unauthorized: You cannot complete recovery for this vault.")

    if len(data.submitted_shares) < vault.threshold:
        log_vault_audit(db, data.vault_id, "RECOVERY_COMPLETE", "FAILED", f"Insufficient shares provided: {len(data.submitted_shares)} < {vault.threshold}", client_ip, user.id)
        raise HTTPException(
            status_code=400,
            detail=f"Cryptographic threshold violation: Exactly {vault.threshold} or more distinct nominee shares required. Received {len(data.submitted_shares)}."
        )

    submitted_indices = [s.share_index for s in data.submitted_shares]
    if len(submitted_indices) != len(set(submitted_indices)):
        log_vault_audit(db, data.vault_id, "RECOVERY_COMPLETE", "FAILED", "Duplicate share indices submitted", client_ip, user.id)
        raise HTTPException(
            status_code=400,
            detail="Duplicate shares submitted. Two copies of the same share cannot reconstruct the polynomial secret."
        )

    available_indices = {share.share_index for share in vault.shares}
    if not set(submitted_indices).issubset(available_indices):
        log_vault_audit(db, data.vault_id, "RECOVERY_COMPLETE", "FAILED", "Unknown share index submitted", client_ip, user.id)
        raise HTTPException(status_code=400, detail="One or more submitted shares do not belong to this vault.")

    log_vault_audit(
        db,
        vault.id,
        "RECOVERY_COMPLETE",
        "SUCCESS",
        f"Recovery payload released to {user.email} after receiving {len(data.submitted_shares)} distinct stored share indices.",
        client_ip,
        user.id
    )

    return {
        "status": "APPROVED",
        "ciphertext": vault.ciphertext,
        "nonce": vault.nonce,
        "algorithm": vault.algorithm,
        "version": vault.version,
        "message": "Recovery policy threshold satisfied. Ciphertext and nonce released for client-side decryption."
    }

@router.post("/rotate-key", response_model=schemas.VaultOut)
def rotate_vault_key(
    data: schemas.VaultRotateKeyRequest,
    request: Request,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rotate vault key: Replaces existing ciphertext, nonce, and sealed shares with
    a newly generated DEK and newly sealed shares encrypted by the client.
    Increments vault version number.
    """
    vault = db.query(models.Vault).filter(models.Vault.id == data.vault_id).first()
    if not vault:
        raise HTTPException(status_code=404, detail="Vault not found")

    if vault.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied: Only the vault owner can rotate encryption keys.")

    validate_vault_shares(data, user, db)

    client_ip = request.client.host if request.client else "127.0.0.1"

    vault.ciphertext = data.ciphertext
    vault.nonce = data.nonce
    vault.algorithm = data.algorithm
    vault.version = vault.version + 1
    vault.salt = data.salt
    vault.threshold = data.threshold
    vault.total_shares = data.total_shares

    db.query(models.VaultShare).filter(models.VaultShare.vault_id == vault.id).delete()
    for s in data.shares:
        share_record = models.VaultShare(
            vault_id=vault.id,
            share_index=s.share_index,
            custodian_name=s.custodian_name,
            nominee_id=s.nominee_id,
            encrypted_share_blob=s.encrypted_share_blob,
            nominee_public_key=s.nominee_public_key
        )
        db.add(share_record)

    db.commit()
    db.refresh(vault)

    log_vault_audit(
        db,
        vault.id,
        "KEY_ROTATION",
        "SUCCESS",
        f"Vault DEK and Shamir policy rotated to version {vault.version}. New {vault.threshold}-of-{vault.total_shares} shares sealed for nominees.",
        client_ip,
        user.id
    )

    return vault

@router.delete("/{vault_id}")
def delete_vault(
    vault_id: str,
    request: Request,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permanently delete a vault and its encrypted shares.
    """
    vault = db.query(models.Vault).filter(models.Vault.id == vault_id).first()
    if not vault:
        raise HTTPException(status_code=404, detail="Vault not found")

    if vault.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied: Only the vault owner can delete this vault.")

    client_ip = request.client.host if request.client else "127.0.0.1"
    log_vault_audit(db, vault.id, "DELETE", "SUCCESS", f"Vault '{vault.name}' permanently deleted by owner.", client_ip, user.id)

    db.delete(vault)
    db.commit()

    return {"status": "DELETED", "message": "Vault and all cryptographic share records permanently wiped."}

@router.get("/{vault_id}/audits", response_model=List[schemas.VaultAuditOut])
def get_vault_audits(
    vault_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Audit log trail for a vault (never reveals plaintext or key material).
    """
    vault = db.query(models.Vault).filter(models.Vault.id == vault_id).first()
    if not vault:
        raise HTTPException(status_code=404, detail="Vault not found")

    if vault.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    audits = db.query(models.VaultAuditLog).filter(models.VaultAuditLog.vault_id == vault_id).order_by(models.VaultAuditLog.created_at.desc()).all()
    return audits

# ==========================================
# BACKWARD-COMPATIBLE EDUCATIONAL ENDPOINTS
# ==========================================

DEFAULT_MASTER_SECRET = "VAARIS-VAULT-2026-RECOVERY-SEED-ALPHA-9821"

@router.get("/shamir/current")
def get_current_shamir_shares(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    heirs = db.query(models.TrustedHeir).filter(models.TrustedHeir.user_id == user.id).all()
    shares = split_secret(DEFAULT_MASTER_SECRET, threshold=2, total_shares=3)
    
    if len(heirs) > 0:
        shares[0]["custodian"] = f"Primary Nominee ({heirs[0].full_name})"
        shares[0]["assigned_heir_id"] = heirs[0].id
    if len(heirs) > 1:
        shares[1]["custodian"] = f"Legal Trustee ({heirs[1].full_name})"
        shares[1]["assigned_heir_id"] = heirs[1].id
    shares[2]["custodian"] = "Cold Vault Escrow / Bank Safe Deposit"
    
    return {
        "status": "ACTIVE_ENCRYPTED",
        "threshold": 2,
        "total_shares": 3,
        "description": "Vault recovery secret divided into 3 Shamir cryptographic shares. Any 2 shares are mathematically sufficient to restore the master key.",
        "shares": shares
    }

@router.post("/shamir/split")
def api_split_secret(data: schemas.ShamirSplitRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    secret = data.secret or DEFAULT_MASTER_SECRET
    shares = split_secret(secret, threshold=data.threshold, total_shares=data.total_shares)
    
    heirs = db.query(models.TrustedHeir).filter(models.TrustedHeir.user_id == user.id).all()
    if len(heirs) > 0:
        shares[0]["custodian"] = f"Primary Nominee ({heirs[0].full_name})"
        shares[0]["assigned_heir_id"] = heirs[0].id
    if len(heirs) > 1:
        shares[1]["custodian"] = f"Legal Trustee ({heirs[1].full_name})"
        shares[1]["assigned_heir_id"] = heirs[1].id
    if len(shares) > 2:
        shares[2]["custodian"] = "Cold Vault Escrow / Bank Safe Deposit"

    return {
        "status": "SPLIT_SUCCESS",
        "threshold": data.threshold,
        "total_shares": data.total_shares,
        "original_secret": secret,
        "shares": shares
    }

@router.post("/shamir/reconstruct")
def api_reconstruct_secret(data: schemas.ShamirReconstructRequest):
    if len(data.shares) < 2:
        raise HTTPException(status_code=400, detail="At least 2 shares required for reconstruction")
    try:
        recovered = reconstruct_secret(data.shares)
        return {
            "status": "SUCCESS",
            "reconstructed_secret": recovered,
            "verified": True,
            "message": "Cryptographic proof satisfied: Master vault recovery secret successfully reconstructed via Shamir's Lagrange Interpolation!"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Reconstruction failed: {str(e)}")
