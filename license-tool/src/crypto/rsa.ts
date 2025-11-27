/**
 * Module de cryptographie RSA
 * Gère la génération de clés et la signature des licences
 */

import {
  generateKeyPairSync,
  createSign,
  createVerify,
  createHash,
} from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { RSAKeyPair, LicenseData } from '../types';

// Chemins des clés
const KEYS_DIR = join(__dirname, '../../keys');
const PRIVATE_KEY_PATH = join(KEYS_DIR, 'private.pem');
const PUBLIC_KEY_PATH = join(KEYS_DIR, 'public.pem');
const KEY_INFO_PATH = join(KEYS_DIR, 'keyinfo.json');

/**
 * Initialise le répertoire des clés
 */
function ensureKeysDir(): void {
  if (!existsSync(KEYS_DIR)) {
    mkdirSync(KEYS_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Génère une nouvelle paire de clés RSA 2048 bits
 */
export function generateKeyPair(): RSAKeyPair {
  ensureKeysDir();

  console.log('🔐 Generating RSA-2048 key pair...');

  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const keyPair: RSAKeyPair = {
    publicKey,
    privateKey,
    createdAt: new Date().toISOString(),
  };

  // Sauvegarder les clés
  writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
  writeFileSync(PUBLIC_KEY_PATH, publicKey, { mode: 0o644 });
  writeFileSync(KEY_INFO_PATH, JSON.stringify({
    createdAt: keyPair.createdAt,
    algorithm: 'RSA-2048',
    signatureAlgorithm: 'RSA-SHA256',
  }, null, 2));

  console.log('✅ Key pair generated successfully');
  console.log(`   Private key: ${PRIVATE_KEY_PATH}`);
  console.log(`   Public key: ${PUBLIC_KEY_PATH}`);

  return keyPair;
}

/**
 * Charge les clés existantes ou en génère de nouvelles
 */
export function loadOrGenerateKeys(): RSAKeyPair {
  ensureKeysDir();

  if (existsSync(PRIVATE_KEY_PATH) && existsSync(PUBLIC_KEY_PATH)) {
    const privateKey = readFileSync(PRIVATE_KEY_PATH, 'utf8');
    const publicKey = readFileSync(PUBLIC_KEY_PATH, 'utf8');

    let createdAt = new Date().toISOString();
    if (existsSync(KEY_INFO_PATH)) {
      const info = JSON.parse(readFileSync(KEY_INFO_PATH, 'utf8'));
      createdAt = info.createdAt || createdAt;
    }

    return { publicKey, privateKey, createdAt };
  }

  return generateKeyPair();
}

/**
 * Récupère la clé privée
 */
export function getPrivateKey(): string {
  if (!existsSync(PRIVATE_KEY_PATH)) {
    throw new Error('Private key not found. Run "posplus-license init" first.');
  }
  return readFileSync(PRIVATE_KEY_PATH, 'utf8');
}

/**
 * Récupère la clé publique
 */
export function getPublicKey(): string {
  if (!existsSync(PUBLIC_KEY_PATH)) {
    throw new Error('Public key not found. Run "posplus-license init" first.');
  }
  return readFileSync(PUBLIC_KEY_PATH, 'utf8');
}

/**
 * Vérifie si les clés existent
 */
export function keysExist(): boolean {
  return existsSync(PRIVATE_KEY_PATH) && existsSync(PUBLIC_KEY_PATH);
}

/**
 * Signe les données de licence avec la clé privée
 */
export function signLicense(licenseData: Omit<LicenseData, 'signature'>): string {
  const privateKey = getPrivateKey();

  // Créer le message canonique (tri des clés pour consistance)
  const dataToSign = {
    client: licenseData.client,
    licenseType: licenseData.licenseType,
    hardwareId: licenseData.hardwareId,
    expires: licenseData.expires,
    version: licenseData.version,
    issuedAt: licenseData.issuedAt,
    features: licenseData.features,
    maxUsers: licenseData.maxUsers,
  };

  // Supprimer les champs undefined
  Object.keys(dataToSign).forEach(key => {
    if (dataToSign[key as keyof typeof dataToSign] === undefined) {
      delete dataToSign[key as keyof typeof dataToSign];
    }
  });

  const message = JSON.stringify(dataToSign, Object.keys(dataToSign).sort());

  // Signer avec RSA-SHA256
  const signer = createSign('RSA-SHA256');
  signer.update(message);
  signer.end();

  const signature = signer.sign(privateKey, 'base64');
  return signature;
}

/**
 * Vérifie la signature d'une licence
 */
export function verifyLicenseSignature(licenseData: LicenseData): boolean {
  const publicKey = getPublicKey();

  const dataToVerify = {
    client: licenseData.client,
    licenseType: licenseData.licenseType,
    hardwareId: licenseData.hardwareId,
    expires: licenseData.expires,
    version: licenseData.version,
    issuedAt: licenseData.issuedAt,
    features: licenseData.features,
    maxUsers: licenseData.maxUsers,
  };

  // Supprimer les champs undefined
  Object.keys(dataToVerify).forEach(key => {
    if (dataToVerify[key as keyof typeof dataToVerify] === undefined) {
      delete dataToVerify[key as keyof typeof dataToVerify];
    }
  });

  const message = JSON.stringify(dataToVerify, Object.keys(dataToVerify).sort());

  try {
    const verifier = createVerify('RSA-SHA256');
    verifier.update(message);
    verifier.end();

    const signatureBuffer = Buffer.from(licenseData.signature, 'base64');
    return verifier.verify(publicKey, signatureBuffer);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Génère un identifiant unique pour une licence
 */
export function generateLicenseId(licenseData: LicenseData): string {
  const data = licenseData.client + licenseData.hardwareId + licenseData.issuedAt;
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

/**
 * Affiche la clé publique formatée pour inclusion dans l'application
 */
export function getPublicKeyForApp(): string {
  const publicKey = getPublicKey();
  return publicKey;
}

export default {
  generateKeyPair,
  loadOrGenerateKeys,
  getPrivateKey,
  getPublicKey,
  keysExist,
  signLicense,
  verifyLicenseSignature,
  generateLicenseId,
  getPublicKeyForApp,
};
