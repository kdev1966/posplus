/**
 * POSPlus License Validator
 * Module de validation des licences côté application
 * Vérifie signature RSA, hardware ID, expiration et révocation
 */

import { createVerify, createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import log from 'electron-log';
import { getHardwareId } from './hardwareId';
import type {
  LicenseData,
  LicenseValidationResult,
  LicenseInfo,
  LicenseType,
} from '@shared/types/license';

// ============================================================================
// CLÉ PUBLIQUE RSA (EMBARQUÉE DANS L'APPLICATION)
// Cette clé est générée par l'outil CLI et ne doit jamais être modifiée
// ============================================================================
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0VDMEfQPz0XzpXvDIuWj
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PLACEHOLDER_PUBLIC_KEY_REPLACE_WITH_REAL_KEY_AFTER_GENERATION
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AQIDAQAB
-----END PUBLIC KEY-----`;

// ============================================================================
// CONFIGURATION
// ============================================================================

// Répertoire de stockage des licences (dans userData)
const getLicenseDir = () => join(app.getPath('userData'), '.license');
const getLicenseFilePath = () => join(getLicenseDir(), '.lic.dat');
const getBlacklistPath = () => join(getLicenseDir(), '.blacklist.json');
const getIntegrityPath = () => join(getLicenseDir(), '.integrity');

// Cache de la licence validée
let cachedLicense: LicenseData | null = null;
let cachedValidation: LicenseValidationResult | null = null;
let lastValidationTime: number = 0;
const VALIDATION_CACHE_TTL = 60000; // 1 minute

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Initialise le répertoire de licences
 */
function ensureLicenseDir(): void {
  const dir = getLicenseDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

/**
 * Génère un hash d'intégrité pour le fichier de licence
 */
function generateIntegrityHash(licenseData: string): string {
  const hwid = getHardwareId();
  return createHash('sha256')
    .update(licenseData + hwid + 'POSPLUS_INTEGRITY_SALT')
    .digest('hex');
}

/**
 * Charge la blacklist des licences révoquées
 */
function loadBlacklist(): string[] {
  try {
    const path = getBlacklistPath();
    if (existsSync(path)) {
      const data = readFileSync(path, 'utf8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    log.warn('Failed to load license blacklist:', error);
  }
  return [];
}

/**
 * Vérifie si une licence est dans la blacklist
 */
function isBlacklisted(licenseData: LicenseData): boolean {
  const blacklist = loadBlacklist();
  // Créer un identifiant unique pour cette licence
  const licenseId = createHash('sha256')
    .update(licenseData.client + licenseData.hardwareId + licenseData.issuedAt)
    .digest('hex');
  return blacklist.includes(licenseId);
}

/**
 * Parse et valide la structure d'un fichier de licence
 */
function parseLicenseFile(content: string): LicenseData | null {
  try {
    const data = JSON.parse(content);

    // Vérifier les champs obligatoires
    const requiredFields = ['client', 'licenseType', 'hardwareId', 'expires', 'version', 'signature'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        log.error(`License file missing required field: ${field}`);
        return null;
      }
    }

    // Vérifier le type de licence
    const validTypes: LicenseType[] = ['DEMO', 'BASIC', 'PRO', 'ENTERPRISE'];
    if (!validTypes.includes(data.licenseType)) {
      log.error(`Invalid license type: ${data.licenseType}`);
      return null;
    }

    // Vérifier le format de la date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.expires)) {
      log.error(`Invalid expiration date format: ${data.expires}`);
      return null;
    }

    return data as LicenseData;
  } catch (error) {
    log.error('Failed to parse license file:', error);
    return null;
  }
}

/**
 * Vérifie la signature RSA de la licence
 */
function verifySignature(licenseData: LicenseData): boolean {
  try {
    // Reconstruire les données signées (tout sauf la signature)
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

    // Créer le message canonique (tri des clés pour consistance)
    const message = JSON.stringify(dataToVerify, Object.keys(dataToVerify).sort());

    // Vérifier la signature
    const verifier = createVerify('RSA-SHA256');
    verifier.update(message);
    verifier.end();

    const signatureBuffer = Buffer.from(licenseData.signature, 'base64');
    return verifier.verify(PUBLIC_KEY, signatureBuffer);
  } catch (error) {
    log.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Vérifie si la licence a expiré
 */
function isExpired(expiresDate: string): boolean {
  const expiration = new Date(expiresDate);
  const now = new Date();
  // Comparer uniquement les dates (sans l'heure)
  expiration.setHours(23, 59, 59, 999);
  return now > expiration;
}

/**
 * Calcule le nombre de jours restants avant expiration
 */
function getDaysRemaining(expiresDate: string): number {
  const expiration = new Date(expiresDate);
  const now = new Date();
  const diffTime = expiration.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// ============================================================================
// API PUBLIQUE
// ============================================================================

/**
 * Charge et valide le fichier de licence
 */
export function validateLicense(): LicenseValidationResult {
  // Vérifier le cache
  const now = Date.now();
  if (cachedValidation && now - lastValidationTime < VALIDATION_CACHE_TTL) {
    return cachedValidation;
  }

  ensureLicenseDir();

  const licensePath = getLicenseFilePath();
  const integrityPath = getIntegrityPath();

  // Vérifier si le fichier de licence existe
  if (!existsSync(licensePath)) {
    const result: LicenseValidationResult = {
      valid: false,
      status: 'not_found',
      message: 'Aucune licence trouvée. Veuillez importer un fichier de licence valide.',
    };
    cachedValidation = result;
    lastValidationTime = now;
    return result;
  }

  // Charger le fichier de licence
  let licenseContent: string;
  try {
    licenseContent = readFileSync(licensePath, 'utf8');
  } catch (error) {
    log.error('Failed to read license file:', error);
    const result: LicenseValidationResult = {
      valid: false,
      status: 'corrupted',
      message: 'Impossible de lire le fichier de licence.',
    };
    cachedValidation = result;
    lastValidationTime = now;
    return result;
  }

  // Vérifier l'intégrité du fichier
  if (existsSync(integrityPath)) {
    try {
      const storedHash = readFileSync(integrityPath, 'utf8').trim();
      const currentHash = generateIntegrityHash(licenseContent);
      if (storedHash !== currentHash) {
        log.error('License file integrity check failed');
        const result: LicenseValidationResult = {
          valid: false,
          status: 'corrupted',
          message: 'Le fichier de licence a été modifié ou copié depuis une autre machine.',
        };
        cachedValidation = result;
        lastValidationTime = now;
        return result;
      }
    } catch (error) {
      log.warn('Integrity check failed, continuing:', error);
    }
  }

  // Parser le fichier de licence
  const licenseData = parseLicenseFile(licenseContent);
  if (!licenseData) {
    const result: LicenseValidationResult = {
      valid: false,
      status: 'corrupted',
      message: 'Format de licence invalide.',
    };
    cachedValidation = result;
    lastValidationTime = now;
    return result;
  }

  // Vérifier si la licence est révoquée
  if (isBlacklisted(licenseData)) {
    const result: LicenseValidationResult = {
      valid: false,
      status: 'revoked',
      message: 'Cette licence a été révoquée.',
    };
    cachedValidation = result;
    lastValidationTime = now;
    return result;
  }

  // Vérifier la signature RSA
  if (!verifySignature(licenseData)) {
    log.error('License signature verification failed');
    const result: LicenseValidationResult = {
      valid: false,
      status: 'invalid_signature',
      message: 'Signature de licence invalide. Le fichier peut avoir été modifié.',
    };
    cachedValidation = result;
    lastValidationTime = now;
    return result;
  }

  // Vérifier le Hardware ID
  const currentHwid = getHardwareId();
  if (licenseData.hardwareId !== currentHwid) {
    log.error('Hardware ID mismatch:', {
      expected: licenseData.hardwareId.substring(0, 16) + '...',
      current: currentHwid.substring(0, 16) + '...',
    });
    const result: LicenseValidationResult = {
      valid: false,
      status: 'hardware_mismatch',
      message: 'Cette licence est liée à une autre machine.',
    };
    cachedValidation = result;
    lastValidationTime = now;
    return result;
  }

  // Vérifier l'expiration
  if (isExpired(licenseData.expires)) {
    const result: LicenseValidationResult = {
      valid: false,
      status: 'expired',
      licenseType: licenseData.licenseType,
      client: licenseData.client,
      expiresAt: licenseData.expires,
      daysRemaining: 0,
      message: `Votre licence ${licenseData.licenseType} a expiré le ${licenseData.expires}.`,
    };
    cachedValidation = result;
    lastValidationTime = now;
    return result;
  }

  // Licence valide !
  const daysRemaining = getDaysRemaining(licenseData.expires);
  cachedLicense = licenseData;

  const result: LicenseValidationResult = {
    valid: true,
    status: 'valid',
    licenseType: licenseData.licenseType,
    client: licenseData.client,
    expiresAt: licenseData.expires,
    daysRemaining,
    features: licenseData.features,
    maxUsers: licenseData.maxUsers,
    message: daysRemaining <= 30
      ? `Licence valide. Attention: expire dans ${daysRemaining} jour(s).`
      : `Licence ${licenseData.licenseType} valide.`,
  };

  cachedValidation = result;
  lastValidationTime = now;
  log.info('License validated successfully:', {
    client: licenseData.client,
    type: licenseData.licenseType,
    expires: licenseData.expires,
    daysRemaining,
  });

  return result;
}

/**
 * Importe un fichier de licence depuis un chemin
 */
export function importLicense(sourcePath: string): LicenseValidationResult {
  ensureLicenseDir();

  // Vérifier que le fichier source existe
  if (!existsSync(sourcePath)) {
    return {
      valid: false,
      status: 'not_found',
      message: 'Fichier de licence introuvable.',
    };
  }

  // Lire le contenu
  let content: string;
  try {
    content = readFileSync(sourcePath, 'utf8');
  } catch (error) {
    log.error('Failed to read license file:', error);
    return {
      valid: false,
      status: 'corrupted',
      message: 'Impossible de lire le fichier de licence.',
    };
  }

  // Parser et valider
  const licenseData = parseLicenseFile(content);
  if (!licenseData) {
    return {
      valid: false,
      status: 'corrupted',
      message: 'Format de licence invalide.',
    };
  }

  // Vérifier la signature avant d'importer
  if (!verifySignature(licenseData)) {
    return {
      valid: false,
      status: 'invalid_signature',
      message: 'Signature de licence invalide.',
    };
  }

  // Vérifier le Hardware ID avant d'importer
  const currentHwid = getHardwareId();
  if (licenseData.hardwareId !== currentHwid) {
    return {
      valid: false,
      status: 'hardware_mismatch',
      message: 'Cette licence est générée pour une autre machine. Hardware ID attendu: ' +
        licenseData.hardwareId.substring(0, 16) + '...',
    };
  }

  // Copier le fichier dans le répertoire interne
  const destPath = getLicenseFilePath();
  try {
    writeFileSync(destPath, content, { mode: 0o600 });

    // Générer et stocker le hash d'intégrité
    const integrityHash = generateIntegrityHash(content);
    writeFileSync(getIntegrityPath(), integrityHash, { mode: 0o600 });
  } catch (error) {
    log.error('Failed to write license file:', error);
    return {
      valid: false,
      status: 'corrupted',
      message: 'Impossible d\'enregistrer la licence.',
    };
  }

  // Invalider le cache et revalider
  cachedLicense = null;
  cachedValidation = null;
  lastValidationTime = 0;

  return validateLicense();
}

/**
 * Supprime la licence actuelle
 */
export function removeLicense(): boolean {
  try {
    const licensePath = getLicenseFilePath();
    const integrityPath = getIntegrityPath();

    if (existsSync(licensePath)) {
      unlinkSync(licensePath);
    }
    if (existsSync(integrityPath)) {
      unlinkSync(integrityPath);
    }

    cachedLicense = null;
    cachedValidation = null;
    lastValidationTime = 0;

    return true;
  } catch (error) {
    log.error('Failed to remove license:', error);
    return false;
  }
}

/**
 * Récupère les informations de licence pour l'UI
 */
export function getLicenseInfo(): LicenseInfo {
  const validation = validateLicense();
  const hwid = getHardwareId();

  return {
    isLicensed: validation.valid,
    status: validation.status,
    client: validation.client,
    licenseType: validation.licenseType,
    expiresAt: validation.expiresAt,
    daysRemaining: validation.daysRemaining,
    hardwareId: hwid,
    features: validation.features,
  };
}

/**
 * Vérifie si une fonctionnalité est disponible avec la licence actuelle
 */
export function hasFeature(feature: string): boolean {
  if (!cachedValidation?.valid) {
    validateLicense();
  }
  if (!cachedValidation?.valid || !cachedValidation.features) {
    return false;
  }
  return cachedValidation.features.includes(feature);
}

/**
 * Récupère la licence en cache (après validation)
 */
export function getCachedLicense(): LicenseData | null {
  return cachedLicense;
}

/**
 * Force le rechargement de la licence
 */
export function refreshLicense(): LicenseValidationResult {
  cachedLicense = null;
  cachedValidation = null;
  lastValidationTime = 0;
  return validateLicense();
}

/**
 * Génère une clé de chiffrement pour SQLite basée sur la licence
 * Cette clé change si la licence ou le hardware change
 */
export function getDatabaseEncryptionKey(): string | null {
  const validation = validateLicense();
  if (!validation.valid || !cachedLicense) {
    return null;
  }

  const hwid = getHardwareId();
  const signature = cachedLicense.signature;

  // Générer une clé AES-256 à partir du HWID et de la signature
  const key = createHash('sha256')
    .update(hwid + signature + 'POSPLUS_DB_KEY')
    .digest('hex');

  return key;
}

// Export par défaut
export default {
  validate: validateLicense,
  import: importLicense,
  remove: removeLicense,
  getInfo: getLicenseInfo,
  hasFeature,
  getCached: getCachedLicense,
  refresh: refreshLicense,
  getDbKey: getDatabaseEncryptionKey,
};
