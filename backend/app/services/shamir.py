import random
import secrets
from typing import List, Tuple

# Mersenne prime 2^521 - 1
PRIME = (1 << 521) - 1

def _eval_poly(coefficients: List[int], x: int) -> int:
    result = 0
    for coeff in reversed(coefficients):
        result = (result * x + coeff) % PRIME
    return result

def _extended_gcd(a: int, b: int) -> Tuple[int, int, int]:
    if a == 0:
        return b, 0, 1
    gcd, x1, y1 = _extended_gcd(b % a, a)
    x = y1 - (b // a) * x1
    y = x1
    return gcd, x, y

def _mod_inverse(k: int, p: int) -> int:
    k = k % p
    gcd, x, _ = _extended_gcd(k, p)
    if gcd != 1:
        raise ValueError("Modular inverse does not exist")
    return (x % p + p) % p

def split_secret(secret_str: str, threshold: int = 2, total_shares: int = 3) -> List[dict]:
    """
    Splits a secret string into total_shares (e.g. 3) where any threshold (e.g. 2) can recover it.
    """
    secret_bytes = secret_str.encode('utf-8')
    secret_int = int.from_bytes(secret_bytes, byteorder='big')
    if secret_int >= PRIME:
        # If secret is too long, truncate or hash key
        secret_bytes = secret_bytes[:60]
        secret_int = int.from_bytes(secret_bytes, byteorder='big')

    # Coefficients: a0 is secret, a1...a_{k-1} are random
    coefficients = [secret_int]
    for _ in range(threshold - 1):
        coefficients.append(secrets.randbelow(PRIME - 1) + 1)

    labels = ["Alpha (Primary Nominee)", "Beta (Legal Trustee)", "Gamma (Cold Vault Escrow)"]
    shares = []
    for i in range(1, total_shares + 1):
        x = i
        y = _eval_poly(coefficients, x)
        share_hex = f"{x:02x}:{hex(y)[2:]}"
        shares.append({
            "share_index": i,
            "share_label": labels[i - 1] if i - 1 < len(labels) else f"Share {i}",
            "share_value": f"VR-SHAMIR-{share_hex.upper()}",
            "custodian": ["Primary Nominee (Priya)", "Legal Trustee (Adv. Rohan)", "Vaaris Sentinel Escrow"][i - 1] if i <= 3 else "Nominee"
        })
    return shares

def reconstruct_secret(share_strings: List[str]) -> str:
    """
    Recovers the secret using Lagrange interpolation from any threshold shares.
    """
    points = []
    for s in share_strings:
        clean = s.replace("VR-SHAMIR-", "").strip().lower()
        if ":" in clean:
            x_str, y_str = clean.split(":", 1)
            x = int(x_str, 16)
            y = int(y_str, 16)
            points.append((x, y))

    if len(points) < 2:
        raise ValueError("At least 2 shares are required to reconstruct the vault secret.")

    secret_int = 0
    k = len(points)
    for i in range(k):
        xi, yi = points[i]
        num = 1
        den = 1
        for j in range(k):
            if i == j:
                continue
            xj, _ = points[j]
            num = (num * (-xj)) % PRIME
            den = (den * (xi - xj)) % PRIME
        inv_den = _mod_inverse(den, PRIME)
        li = (num * inv_den) % PRIME
        secret_int = (secret_int + yi * li) % PRIME

    # Convert int back to string
    byte_length = (secret_int.bit_length() + 7) // 8
    secret_bytes = secret_int.to_bytes(byte_length, byteorder='big')
    return secret_bytes.decode('utf-8', errors='replace')
