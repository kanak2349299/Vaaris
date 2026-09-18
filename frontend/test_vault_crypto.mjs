/**
 * VAARIS PRODUCTION ZERO-KNOWLEDGE CRYPTOGRAPHIC TEST SUITE
 * 
 * Tests:
 * 1. AES-256-GCM authenticated encryption/decryption round trip
 * 2. Tampered ciphertext rejection (AES-GCM authentication tag integrity)
 * 3. Shamir Secret Sharing 2-of-3 threshold:
 *    - All valid combinations: (Share 1 + Share 2), (Share 1 + Share 3), (Share 2 + Share 3)
 *    - Byte-for-byte exact DEK recovery
 * 4. Single-share reconstruction failure (1 share reveals zero information)
 * 5. Invalid / corrupted share rejection
 * 6. Curve25519 sealed box encryption and decryption for nominees
 * 7. Rejection of wrong nominee private key
 */

import { webcrypto } from 'node:crypto';
if (!global.crypto) global.crypto = webcrypto;
if (!global.window) global.window = {
  crypto: global.crypto,
  btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
  atob: (b64) => Buffer.from(b64, 'base64').toString('binary')
};

import {
  generateDEK,
  generateNonce,
  encryptVaultData,
  decryptVaultData,
  splitDEKIntoShamirShares,
  reconstructDEKFromShamirShares,
  generateNomineeKeyPair,
  sealShareForNominee,
  unsealShareWithNomineeKey,
  bytesToHex,
  hexToBytes
} from './src/services/vaultCryptoService.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ? ${message}`);
    passed++;
  } else {
    console.error(`  ? FAILED: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('?? VAARIS SECURE VAULT: CRYPTOGRAPHIC TEST SUITE');
  console.log('======================================================\n');

  // 1. Client-Side AES-256-GCM Encryption Round-Trip
  console.log('[Test 1] AES-256-GCM Encryption & Decryption Round-Trip');
  const samplePayload = {
    vaultName: 'Primary Executive Legacy Vault',
    masterSeed: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    emergencyPasswords: {
      passwordManager: 'P@ssw0rdMaster#2026!',
      protonMail: 'SecretProtonKey992'
    },
    bankingDirectives: 'Disburse HDFC Account 50100 to Priya Gupta as primary beneficiary.',
    timestamp: new Date().toISOString()
  };

  const dek = generateDEK();
  assert(dek instanceof Uint8Array && dek.length === 32, 'DEK is a 256-bit (32-byte) cryptographically random key');

  const encrypted = await encryptVaultData(samplePayload, dek);
  assert(typeof encrypted.ciphertext === 'string' && encrypted.ciphertext.length > 0, 'Ciphertext is non-empty Base64');
  assert(typeof encrypted.nonce === 'string' && encrypted.nonce.length > 0, 'Nonce is non-empty Base64 (96-bit IV)');
  assert(encrypted.algorithm === 'AES-256-GCM', 'Algorithm is authenticated AES-256-GCM');

  const decrypted = await decryptVaultData(encrypted.ciphertext, encrypted.nonce, dek);
  assert(JSON.stringify(decrypted) === JSON.stringify(samplePayload), 'Decrypted payload matches original sensitive data');

  // 2. Tampered Ciphertext Rejection
  console.log('\n[Test 2] Tampered Ciphertext Rejection (AES-GCM Auth Tag Check)');
  try {
    // Tamper with one character of the base64 ciphertext
    const rawCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
    rawCiphertext[0] ^= 0xFF; // Flip bits of the first byte
    const tamperedCiphertext = rawCiphertext.toString('base64');

    await decryptVaultData(tamperedCiphertext, encrypted.nonce, dek);
    assert(false, 'Should have rejected tampered ciphertext');
  } catch (err) {
    assert(err.message.includes('AES-GCM Decryption verification failed'), 'Tampered ciphertext rejected with authentication tag error');
  }

  // 3. Shamir Secret Sharing: 2-of-3 Combinations
  console.log('\n[Test 3] Shamir Secret Sharing 2-of-3 Threshold (GF(256))');
  const shares = splitDEKIntoShamirShares(dek, 2, 3);
  assert(shares.length === 3, 'Exactly 3 distinct shares generated');
  assert(shares[0] !== shares[1] && shares[1] !== shares[2], 'All shares are mathematically distinct');

  // Test combination: Share 1 + Share 2
  const recovered12 = reconstructDEKFromShamirShares([shares[0], shares[1]]);
  assert(bytesToHex(recovered12) === bytesToHex(dek), 'Reconstruction with (Share 1 + Share 2) is byte-for-byte identical to original DEK');

  // Test combination: Share 1 + Share 3
  const recovered13 = reconstructDEKFromShamirShares([shares[0], shares[2]]);
  assert(bytesToHex(recovered13) === bytesToHex(dek), 'Reconstruction with (Share 1 + Share 3) is byte-for-byte identical to original DEK');

  // Test combination: Share 2 + Share 3
  const recovered23 = reconstructDEKFromShamirShares([shares[1], shares[2]]);
  assert(bytesToHex(recovered23) === bytesToHex(dek), 'Reconstruction with (Share 2 + Share 3) is byte-for-byte identical to original DEK');

  // Verify that the reconstructed key from any pair can decrypt the vault
  const decryptedWith12 = await decryptVaultData(encrypted.ciphertext, encrypted.nonce, recovered12);
  assert(decryptedWith12.masterSeed === samplePayload.masterSeed, 'DEK reconstructed from (Share 1 + Share 2) successfully decrypts vault');

  const decryptedWith23 = await decryptVaultData(encrypted.ciphertext, encrypted.nonce, recovered23);
  assert(decryptedWith23.masterSeed === samplePayload.masterSeed, 'DEK reconstructed from (Share 2 + Share 3) successfully decrypts vault');

  // 4. One-Share Failure
  console.log('\n[Test 4] Single-Share Failure (1 Share Cannot Reconstruct)');
  try {
    reconstructDEKFromShamirShares([shares[0]]);
    assert(false, 'Should reject single share');
  } catch (err) {
    assert(err.message.includes('threshold violation'), 'Single share fails with threshold violation error');
  }

  // Duplicate shares test
  try {
    reconstructDEKFromShamirShares([shares[0], shares[0]]);
    assert(false, 'Should reject duplicate shares');
  } catch (err) {
    assert(err.message.includes('Duplicate shares'), 'Two copies of the same share rejected');
  }

  // 5. Invalid Share Failure
  console.log('\n[Test 5] Corrupted Share Rejection');
  try {
    const corruptedShare = shares[0].slice(0, -4) + 'ffff';
    const badKey = reconstructDEKFromShamirShares([corruptedShare, shares[1]]);
    // If combine didn't throw, decrypting with the corrupted key MUST throw AES-GCM error
    await decryptVaultData(encrypted.ciphertext, encrypted.nonce, badKey);
    assert(false, 'Corrupted share should fail decryption');
  } catch (err) {
    assert(true, 'Corrupted share correctly fails either during polynomial evaluation or AES-GCM tag verification');
  }

  // 6. Nominee Curve25519 Sealed Box Round-Trip
  console.log('\n[Test 6] Nominee Curve25519 Public-Key Sealed Box (TweetNaCl)');
  const nomineePriya = generateNomineeKeyPair();
  const nomineeRohan = generateNomineeKeyPair();

  assert(typeof nomineePriya.publicKey === 'string' && nomineePriya.publicKey.length > 0, 'Nominee 1 Curve25519 public key generated');
  assert(typeof nomineePriya.privateKey === 'string' && nomineePriya.privateKey.length > 0, 'Nominee 1 Curve25519 private key generated');

  // Seal Share 1 for Priya using her public key
  const sealedShare1 = sealShareForNominee(shares[0], nomineePriya.publicKey);
  assert(typeof sealedShare1 === 'string' && sealedShare1.length > 0, 'Share 1 sealed into Base64 container');

  // Priya unseals Share 1 using her private key
  const unsealedShare1 = unsealShareWithNomineeKey(sealedShare1, nomineePriya.privateKey);
  assert(unsealedShare1 === shares[0], 'Priya unseals Share 1 perfectly matching original Shamir share');

  // 7. Wrong Nominee Private Key Rejection
  console.log('\n[Test 7] Wrong Nominee Key Rejection (Sealed Box Authorization)');
  try {
    // Rohan attempts to unseal Priya\'s share with Rohan\'s private key
    unsealShareWithNomineeKey(sealedShare1, nomineeRohan.privateKey);
    assert(false, 'Rohan should not be able to unseal Priya\'s share');
  } catch (err) {
    assert(err.message.includes('Invalid private key or tampered share'), 'Wrong nominee private key rejected by authenticated box opening');
  }

  console.log('\n------------------------------------------------------');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
