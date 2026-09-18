/**
 * VAARIS PRODUCTION ZERO-KNOWLEDGE CRYPTOGRAPHIC SERVICE
 * 
 * Cryptographic Architecture:
 * 1. Client-Side Authenticated Encryption: AES-256-GCM (Web Crypto API) with unique 96-bit IV
 * 2. Key Splitting: Shamir's Secret Sharing over Galois Field GF(256) with 2-of-3 threshold
 * 3. Nominee Share Protection: Curve25519 Authenticated Public-Key Sealed Boxes (TweetNaCl)
 * 4. Zero-Knowledge Invariant: Plaintext, DEK, and unsealed shares NEVER leave this device.
 */

import secrets from './secrets.esm.js';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

// Byte <-> Base64 & Hex utilities
export function bytesToBase64(uint8Array) {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return window.btoa(binary);
}

export function base64ToBytes(base64String) {
  const binary = window.atob(base64String);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex) {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string length');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * 1. CLIENT-SIDE ENCRYPTION (AES-256-GCM via Web Crypto API)
 */

/**
 * Generates a cryptographically secure 256-bit Data Encryption Key (DEK).
 */
export function generateDEK() {
  const dek = new Uint8Array(32); // 256 bits
  window.crypto.getRandomValues(dek);
  return dek;
}

/**
 * Generates a fresh random 96-bit (12-byte) initialization vector (nonce).
 */
export function generateNonce() {
  const nonce = new Uint8Array(12); // 96 bits recommended for AES-GCM
  window.crypto.getRandomValues(nonce);
  return nonce;
}

/**
 * Encrypts arbitrary JavaScript object data locally on the user's device using AES-256-GCM.
 * Never transmits plaintext to the server.
 */
export async function encryptVaultData(payloadObject, dekBytes) {
  if (!dekBytes || dekBytes.length !== 32) {
    throw new Error('Invalid DEK: A 256-bit (32-byte) key is strictly required.');
  }

  const nonce = generateNonce();
  const serialized = JSON.stringify(payloadObject);
  const encodedData = new TextEncoder().encode(serialized);

  // Import raw key into Web Crypto API
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    dekBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // AES-256-GCM authenticated encryption (automatically appends 128-bit authentication tag)
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    cryptoKey,
    encodedData
  );

  const ciphertextBytes = new Uint8Array(encryptedBuffer);

  return {
    ciphertext: bytesToBase64(ciphertextBytes),
    nonce: bytesToBase64(nonce),
    algorithm: 'AES-256-GCM',
    version: 1
  };
}

/**
 * Decrypts AES-256-GCM ciphertext locally on the client.
 * Rejects tampered ciphertext if the 128-bit authentication tag fails verification.
 */
export async function decryptVaultData(ciphertextBase64, nonceBase64, dekBytes) {
  if (!dekBytes || dekBytes.length !== 32) {
    throw new Error('Invalid DEK: A 256-bit (32-byte) key is strictly required.');
  }

  const ciphertextBytes = base64ToBytes(ciphertextBase64);
  const nonceBytes = base64ToBytes(nonceBase64);

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    dekBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonceBytes },
      cryptoKey,
      ciphertextBytes
    );

    const decodedText = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decodedText);
  } catch (error) {
    throw new Error(
      'AES-GCM Decryption verification failed: Authentication tag mismatch or corrupted ciphertext. The data has been tampered with or an invalid key was used.'
    );
  }
}

/**
 * 2. SHAMIR SECRET SHARING (2-of-3 Threshold)
 */

/**
 * Splits a 256-bit DEK into 3 mathematical shares using Shamir's Secret Sharing over GF(256).
 * Any 2 shares are sufficient to reconstruct; 1 share reveals 0 information.
 */
export function splitDEKIntoShamirShares(dekBytes, threshold = 2, totalShares = 3) {
  const hexKey = bytesToHex(dekBytes);
  // secrets.share expects a hex string
  const rawShares = secrets.share(hexKey, totalShares, threshold);
  return rawShares; // Array of 3 hex share strings
}

/**
 * Reconstructs the 256-bit DEK from at least 2 valid Shamir shares.
 */
export function reconstructDEKFromShamirShares(sharesArray) {
  if (!Array.isArray(sharesArray) || sharesArray.length < 2) {
    throw new Error('Cryptographic threshold violation: At least 2 shares are required to reconstruct the key.');
  }

  // Check distinct shares
  const uniqueShares = Array.from(new Set(sharesArray));
  if (uniqueShares.length < 2) {
    throw new Error('Duplicate shares provided: Two copies of the same share cannot reconstruct the polynomial.');
  }

  try {
    const recoveredHex = secrets.combine(sharesArray);
    if (!recoveredHex || recoveredHex.length !== 64) {
      throw new Error('Recovered secret failed length validation (expected 64 hex characters for 256-bit key).');
    }
    return hexToBytes(recoveredHex);
  } catch (err) {
    throw new Error(`Shamir reconstruction failed: ${err.message || 'Invalid or mismatched shares'}`);
  }
}

/**
 * 3. NOMINEE PUBLIC-KEY PROTECTION (Curve25519 Sealed Boxes)
 */

/**
 * Generates an asymmetric Curve25519 keypair for a nominee.
 * The public key is uploaded to the backend directory.
 * The private key is exported/downloaded by the nominee and NEVER sent to the backend.
 */
export function generateNomineeKeyPair() {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: naclUtil.encodeBase64(keyPair.publicKey),
    privateKey: naclUtil.encodeBase64(keyPair.secretKey)
  };
}

/**
 * Seals a Shamir share using the recipient nominee's Curve25519 public key.
 * Uses an ephemeral sender keypair and authenticated encryption (XSalsa20-Poly1305).
 */
export function sealShareForNominee(shareString, nomineePublicKeyBase64) {
  if (!nomineePublicKeyBase64) {
    throw new Error('Nominee public key is missing.');
  }

  const nomineePubKeyBytes = naclUtil.decodeBase64(nomineePublicKeyBase64);
  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  const messageBytes = naclUtil.decodeUTF8(shareString);
  const boxed = nacl.box(messageBytes, nonce, nomineePubKeyBytes, ephemeral.secretKey);

  // Sealed box container: includes ephemeral public key so recipient can open it
  const sealedPayload = {
    v: 1,
    ephemPk: naclUtil.encodeBase64(ephemeral.publicKey),
    nonce: naclUtil.encodeBase64(nonce),
    box: naclUtil.encodeBase64(boxed)
  };

  return window.btoa(JSON.stringify(sealedPayload));
}

/**
 * Opens a Curve25519 sealed share using the nominee's private key.
 */
export function unsealShareWithNomineeKey(sealedBlobBase64, nomineePrivateKeyBase64) {
  if (!nomineePrivateKeyBase64) {
    throw new Error('Nominee private key is required to unseal this share.');
  }

  let payload;
  try {
    const jsonStr = window.atob(sealedBlobBase64);
    payload = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Corrupted sealed share format.');
  }

  const ephemPk = naclUtil.decodeBase64(payload.ephemPk);
  const nonce = naclUtil.decodeBase64(payload.nonce);
  const boxed = naclUtil.decodeBase64(payload.box);
  const secretKey = naclUtil.decodeBase64(nomineePrivateKeyBase64.trim());

  const opened = nacl.box.open(boxed, nonce, ephemPk, secretKey);
  if (!opened) {
    throw new Error('Nominee authentication failed: Invalid private key or tampered share.');
  }

  return naclUtil.encodeUTF8(opened);
}
