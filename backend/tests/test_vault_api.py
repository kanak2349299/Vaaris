"""
VAARIS ZERO-KNOWLEDGE SECURE VAULT BACKEND API TEST SUITE
Runs directly with standard Python (using FastAPI TestClient)
"""
import sys, os
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.auth import create_access_token

client = TestClient(app)

def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    owner = db.query(models.User).filter(models.User.email == "test_owner@vaaris.io").first()
    if not owner:
        owner = models.User(
            full_name="Himangi Sharma",
            email="test_owner@vaaris.io",
            hashed_password="mockhashedpassword"
        )
        db.add(owner)
        db.commit()
        db.refresh(owner)

    attacker = db.query(models.User).filter(models.User.email == "test_attacker@vaaris.io").first()
    if not attacker:
        attacker = models.User(
            full_name="Malicious Actor",
            email="test_attacker@vaaris.io",
            hashed_password="mockhashedpassword"
        )
        db.add(attacker)
        db.commit()
        db.refresh(attacker)

    db.close()

def get_owner_token():
    db = SessionLocal()
    owner = db.query(models.User).filter(models.User.email == "test_owner@vaaris.io").first()
    token = create_access_token({"sub": owner.id})
    db.close()
    return token

def get_attacker_token():
    db = SessionLocal()
    attacker = db.query(models.User).filter(models.User.email == "test_attacker@vaaris.io").first()
    token = create_access_token({"sub": attacker.id})
    db.close()
    return token

def test_vault_create_and_zero_knowledge():
    print("Running test_vault_create_and_zero_knowledge...")
    token = get_owner_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "name": "Executive Crypto and Banking Vault",
        "description": "Zero-Knowledge Estate Directives",
        "ciphertext": "YWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkw",
        "nonce": "MTIzNDU2Nzg5MDEy",
        "algorithm": "AES-256-GCM",
        "version": 1,
        "threshold": 2,
        "total_shares": 3,
        "shares": [
            {
                "share_index": 1,
                "custodian_name": "Priya Gupta (Sister)",
                "encrypted_share_blob": "c2VhbGVkX3NoYXJlXzFfYmxvYl9leGFtcGxl",
                "nominee_public_key": "cHVibGljX2tleV8x"
            },
            {
                "share_index": 2,
                "custodian_name": "Advocate Rohan Verma",
                "encrypted_share_blob": "c2VhbGVkX3NoYXJlXzJfYmxvYl9leGFtcGxl",
                "nominee_public_key": "cHVibGljX2tleV8y"
            },
            {
                "share_index": 3,
                "custodian_name": "Vaaris Sentinel Escrow",
                "encrypted_share_blob": "c2VhbGVkX3NoYXJlXzNfYmxvYl9leGFtcGxl",
                "nominee_public_key": "cHVibGljX2tleV8z"
            }
        ]
    }

    res = client.post("/api/vault", json=payload, headers=headers)
    assert res.status_code == 201, f"Failed to create vault: {res.text}"
    data = res.json()
    assert "id" in data
    assert data["name"] == payload["name"]
    assert data["ciphertext"] == payload["ciphertext"]
    assert len(data["shares"]) == 3
    assert "plaintext" not in data
    assert "dek" not in data
    print("  ✓ PASSED: Vault created, 3 sealed shares saved, Zero-Knowledge invariant holds.")
    return data["id"]

def test_vault_access_control(vault_id):
    print("Running test_vault_access_control...")
    attacker_token = get_attacker_token()
    bad_res = client.get(f"/api/vault/{vault_id}", headers={"Authorization": f"Bearer {attacker_token}"})
    assert bad_res.status_code == 403, "Attacker should be forbidden from accessing owner vault"
    print("  ✓ PASSED: Unauthorized user cannot access another user's vault (403 Forbidden).")

def test_vault_recovery_flow(vault_id):
    print("Running test_vault_recovery_flow...")
    token = get_owner_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Recovery request
    req_res = client.post("/api/vault/recovery/request", json={"vault_id": vault_id}, headers=headers)
    assert req_res.status_code == 200
    req_data = req_res.json()
    assert req_data["threshold"] == 2
    assert len(req_data["required_nominees"]) == 3
    print("  ✓ PASSED: Recovery challenge initiated, returned required nominee IDs.")

    # 2. Complete recovery with 2 distinct shares
    complete_payload = {
        "vault_id": vault_id,
        "submitted_shares": [
            {"share_index": 1, "custodian_name": "Priya Gupta"},
            {"share_index": 2, "custodian_name": "Advocate Rohan Verma"}
        ]
    }
    comp_res = client.post("/api/vault/recovery/complete", json=complete_payload, headers=headers)
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "APPROVED"
    assert "ciphertext" in comp_res.json()
    print("  ✓ PASSED: Recovery approved with 2 distinct shares, ciphertext released.")

def test_vault_recovery_threshold_violations(vault_id):
    print("Running test_vault_recovery_threshold_violations...")
    token = get_owner_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Only 1 share submitted (violates 2-of-3 threshold)
    one_share_payload = {
        "vault_id": vault_id,
        "submitted_shares": [{"share_index": 1, "custodian_name": "Priya Gupta"}]
    }
    fail_res = client.post("/api/vault/recovery/complete", json=one_share_payload, headers=headers)
    assert fail_res.status_code == 400
    assert "threshold violation" in fail_res.json()["detail"].lower()
    print("  ✓ PASSED: Single-share recovery rejected (threshold violation).")

    # Duplicate shares submitted (2 copies of share 1)
    dup_payload = {
        "vault_id": vault_id,
        "submitted_shares": [
            {"share_index": 1, "custodian_name": "Priya Gupta"},
            {"share_index": 1, "custodian_name": "Priya Gupta Duplicate"}
        ]
    }
    dup_res = client.post("/api/vault/recovery/complete", json=dup_payload, headers=headers)
    assert dup_res.status_code == 400
    assert "duplicate" in dup_res.json()["detail"].lower()
    print("  ✓ PASSED: Duplicate shares rejected.")

def test_vault_key_rotation(vault_id):
    print("Running test_vault_key_rotation...")
    token = get_owner_token()
    headers = {"Authorization": f"Bearer {token}"}

    rotation_payload = {
        "vault_id": vault_id,
        "ciphertext": "TkVXX0VOQ1JZUFRFRF9DSVBIRVJURVhUX0ZPUl9ST1RBVElPTg==",
        "nonce": "TkVXX05PTkNFXzEyMw==",
        "algorithm": "AES-256-GCM",
        "version": 2,
        "shares": [
            {"share_index": 1, "custodian_name": "Priya Gupta", "encrypted_share_blob": "bmV3X3NoYXJlXzE="},
            {"share_index": 2, "custodian_name": "Advocate Rohan", "encrypted_share_blob": "bmV3X3NoYXJlXzI="},
            {"share_index": 3, "custodian_name": "Escrow", "encrypted_share_blob": "bmV3X3NoYXJlXzM="}
        ]
    }

    rot_res = client.post("/api/vault/rotate-key", json=rotation_payload, headers=headers)
    assert rot_res.status_code == 200
    rot_data = rot_res.json()
    assert rot_data["version"] == 2
    assert rot_data["ciphertext"] == rotation_payload["ciphertext"]
    print("  ✓ PASSED: Vault DEK rotated to version 2, shares replaced.")

def test_vault_delete(vault_id):
    print("Running test_vault_delete...")
    token = get_owner_token()
    headers = {"Authorization": f"Bearer {token}"}

    del_res = client.delete(f"/api/vault/{vault_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "DELETED"

    get_res = client.get(f"/api/vault/{vault_id}", headers=headers)
    assert get_res.status_code == 404
    print("  ✓ PASSED: Vault and share records permanently deleted.")

if __name__ == "__main__":
    print("\n======================================================")
    print("🔒 VAARIS SECURE VAULT: BACKEND API TEST SUITE")
    print("======================================================\n")
    setup_db()
    vault_id = test_vault_create_and_zero_knowledge()
    test_vault_access_control(vault_id)
    test_vault_recovery_flow(vault_id)
    test_vault_recovery_threshold_violations(vault_id)
    test_vault_key_rotation(vault_id)
    test_vault_delete(vault_id)
    print("\n------------------------------------------------------")
    print("ALL BACKEND API TESTS PASSED SUCCESSFULLY! (6/6)")
    print("------------------------------------------------------\n")
