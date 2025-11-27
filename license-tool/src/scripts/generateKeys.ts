#!/usr/bin/env ts-node

/**
 * Script pour générer les clés RSA
 * Usage: npm run generate-keys
 */

import { generateKeyPair } from '../crypto/rsa';

console.log('POSPlus License Tool - RSA Key Generation');
console.log('=========================================\n');

try {
  const keyPair = generateKeyPair();

  console.log('\n✅ Keys generated successfully!');
  console.log('\nPublic key to embed in POSPlus:');
  console.log('─'.repeat(60));
  console.log(keyPair.publicKey);
  console.log('─'.repeat(60));

  console.log('\n⚠️  IMPORTANT:');
  console.log('1. Copy the public key above into licenseValidator.ts');
  console.log('2. Keep private.pem SECURE - never share it!');
  console.log('3. Backup the keys directory safely');
  console.log('');
} catch (error) {
  console.error('Failed to generate keys:', error);
  process.exit(1);
}
