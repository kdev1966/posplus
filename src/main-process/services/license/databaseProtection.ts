/**
 * POSPlus Database Protection Module
 * Protection de la base de données basée sur la licence
 *
 * NOTE: Le chiffrement SQLite complet nécessite SQLCipher.
 * better-sqlite3 ne supporte pas nativement le chiffrement.
 *
 * Options pour un chiffrement complet:
 * 1. Utiliser @synapsetech/better-sqlite3-sqlcipher
 * 2. Chiffrer les sauvegardes exportées
 * 3. Chiffrer les données sensibles au niveau applicatif
 *
 * Ce module implémente la protection au niveau applicatif.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { app } from 'electron';
import log from 'electron-log';
import { getHardwareId } from './hardwareId';
import { getDatabaseEncryptionKey, validateLicense } from './licenseValidator';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

// ============================================================================
// DÉRIVATION DE CLÉ
// ============================================================================

/**
 * Dérive une clé de chiffrement à partir du HWID et de la licence
 * La clé change si le matériel ou la licence change
 */
export function deriveEncryptionKey(): Buffer | null {
  const baseKey = getDatabaseEncryptionKey();
  if (!baseKey) {
    return null;
  }

  const hwid = getHardwareId();
  const salt = 'POSPLUS_DB_SALT_2024';

  // Dériver une clé AES-256 via PBKDF2-like hash chain
  let key = createHash('sha256')
    .update(baseKey + hwid + salt)
    .digest();

  // Renforcement par itérations
  for (let i = 0; i < 1000; i++) {
    key = createHash('sha256')
      .update(key)
      .update(hwid)
      .digest();
  }

  return key;
}

// ============================================================================
// CHIFFREMENT/DÉCHIFFREMENT DE DONNÉES
// ============================================================================

/**
 * Chiffre une chaîne de caractères
 */
export function encryptString(plaintext: string): string | null {
  const key = deriveEncryptionKey();
  if (!key) {
    log.warn('No encryption key available');
    return null;
  }

  try {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: IV:AuthTag:EncryptedData (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    log.error('Encryption failed:', error);
    return null;
  }
}

/**
 * Déchiffre une chaîne de caractères
 */
export function decryptString(ciphertext: string): string | null {
  const key = deriveEncryptionKey();
  if (!key) {
    log.warn('No encryption key available');
    return null;
  }

  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    log.error('Decryption failed:', error);
    return null;
  }
}

// ============================================================================
// PROTECTION DES FICHIERS DE BACKUP
// ============================================================================

/**
 * Chiffre un fichier de backup
 */
export function encryptBackupFile(sourcePath: string, destPath: string): boolean {
  const key = deriveEncryptionKey();
  if (!key) {
    log.warn('No encryption key available for backup');
    return false;
  }

  try {
    const data = readFileSync(sourcePath);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Format du fichier chiffré:
    // [IV: 16 bytes][AuthTag: 16 bytes][Encrypted Data]
    const output = Buffer.concat([iv, authTag, encrypted]);

    // Créer le répertoire de destination si nécessaire
    const destDir = dirname(destPath);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    writeFileSync(destPath, output);
    log.info('Backup file encrypted successfully');
    return true;
  } catch (error) {
    log.error('Failed to encrypt backup file:', error);
    return false;
  }
}

/**
 * Déchiffre un fichier de backup
 */
export function decryptBackupFile(sourcePath: string, destPath: string): boolean {
  const key = deriveEncryptionKey();
  if (!key) {
    log.warn('No encryption key available for backup');
    return false;
  }

  try {
    const data = readFileSync(sourcePath);

    if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted file format');
    }

    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    // Créer le répertoire de destination si nécessaire
    const destDir = dirname(destPath);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    writeFileSync(destPath, decrypted);
    log.info('Backup file decrypted successfully');
    return true;
  } catch (error) {
    log.error('Failed to decrypt backup file:', error);
    return false;
  }
}

// ============================================================================
// PROTECTION DE LA BASE DE DONNÉES
// ============================================================================

/**
 * Crée une copie chiffrée de la base de données
 * À utiliser pour les backups
 */
export function createEncryptedDatabaseCopy(destPath: string): boolean {
  const dbPath = join(app.getPath('userData'), 'posplus.db');

  if (!existsSync(dbPath)) {
    log.error('Database file not found');
    return false;
  }

  return encryptBackupFile(dbPath, destPath);
}

/**
 * Vérifie si la base de données peut être utilisée avec la licence actuelle
 * Crée un fichier de verrouillage lié au HWID
 */
export function verifyDatabaseBinding(): boolean {
  const validation = validateLicense();
  if (!validation.valid) {
    return false;
  }

  const lockFilePath = join(app.getPath('userData'), '.db.lock');
  const hwid = getHardwareId();

  // Créer un hash de vérification
  const verificationHash = createHash('sha256')
    .update(hwid + 'POSPLUS_DB_LOCK')
    .digest('hex');

  if (existsSync(lockFilePath)) {
    try {
      const storedHash = readFileSync(lockFilePath, 'utf8').trim();
      if (storedHash !== verificationHash) {
        log.error('Database binding verification failed - different machine');
        return false;
      }
    } catch (error) {
      log.warn('Could not read lock file, will recreate');
    }
  }

  // Créer ou mettre à jour le fichier de verrouillage
  try {
    writeFileSync(lockFilePath, verificationHash, { mode: 0o600 });
  } catch (error) {
    log.error('Failed to create lock file:', error);
  }

  return true;
}

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Génère un hash sécurisé pour les mots de passe (en complément de bcrypt)
 */
export function hashWithLicense(data: string): string {
  const hwid = getHardwareId();
  return createHash('sha256')
    .update(data + hwid + 'POSPLUS_HASH_SALT')
    .digest('hex');
}

/**
 * Vérifie l'intégrité des données
 */
export function generateDataHash(data: string): string {
  const key = deriveEncryptionKey();
  if (!key) {
    return createHash('sha256').update(data).digest('hex');
  }

  return createHash('sha256')
    .update(data)
    .update(key)
    .digest('hex');
}

export default {
  deriveEncryptionKey,
  encryptString,
  decryptString,
  encryptBackupFile,
  decryptBackupFile,
  createEncryptedDatabaseCopy,
  verifyDatabaseBinding,
  hashWithLicense,
  generateDataHash,
};
