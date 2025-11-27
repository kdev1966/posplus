/**
 * Module de stockage des licences générées
 * Permet la traçabilité et la révocation
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { LicenseRecord, LicenseStore, LicenseData } from '../types';
import { generateLicenseId } from '../crypto/rsa';

// Chemin du fichier de stockage
const DATA_DIR = join(__dirname, '../../data');
const STORE_PATH = join(DATA_DIR, 'licenses.json');

/**
 * Initialise le répertoire de données
 */
function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Charge le store depuis le fichier
 */
function loadStore(): LicenseStore {
  ensureDataDir();

  if (existsSync(STORE_PATH)) {
    try {
      const data = readFileSync(STORE_PATH, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading license store:', error);
    }
  }

  return {
    licenses: [],
    blacklist: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Sauvegarde le store dans le fichier
 */
function saveStore(store: LicenseStore): void {
  ensureDataDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), { mode: 0o600 });
}

/**
 * Ajoute une licence au store
 */
export function addLicense(
  licenseData: LicenseData,
  filePath?: string,
  notes?: string
): LicenseRecord {
  const store = loadStore();

  const record: LicenseRecord = {
    id: generateLicenseId(licenseData),
    licenseData,
    createdAt: new Date().toISOString(),
    notes,
    filePath,
    revoked: false,
  };

  store.licenses.push(record);
  saveStore(store);

  return record;
}

/**
 * Récupère toutes les licences
 */
export function getAllLicenses(): LicenseRecord[] {
  const store = loadStore();
  return store.licenses;
}

/**
 * Récupère les licences filtrées
 */
export function getLicenses(options?: {
  client?: string;
  type?: string;
  active?: boolean;
  revoked?: boolean;
}): LicenseRecord[] {
  const store = loadStore();
  let licenses = store.licenses;

  if (options?.client) {
    licenses = licenses.filter(l =>
      l.licenseData.client.toLowerCase().includes(options.client!.toLowerCase())
    );
  }

  if (options?.type) {
    licenses = licenses.filter(l =>
      l.licenseData.licenseType === options.type
    );
  }

  if (options?.revoked !== undefined) {
    licenses = licenses.filter(l => l.revoked === options.revoked);
  }

  if (options?.active) {
    const now = new Date();
    licenses = licenses.filter(l => {
      const expires = new Date(l.licenseData.expires);
      return expires > now && !l.revoked;
    });
  }

  return licenses;
}

/**
 * Récupère une licence par ID
 */
export function getLicenseById(id: string): LicenseRecord | null {
  const store = loadStore();
  return store.licenses.find(l => l.id === id) || null;
}

/**
 * Récupère une licence par Hardware ID
 */
export function getLicenseByHwid(hwid: string): LicenseRecord | null {
  const store = loadStore();
  return store.licenses.find(l =>
    l.licenseData.hardwareId === hwid && !l.revoked
  ) || null;
}

/**
 * Révoque une licence
 */
export function revokeLicense(id: string, reason?: string): boolean {
  const store = loadStore();
  const license = store.licenses.find(l => l.id === id);

  if (!license) {
    return false;
  }

  license.revoked = true;
  license.revokedAt = new Date().toISOString();
  license.revokeReason = reason;

  // Ajouter à la blacklist
  if (!store.blacklist.includes(id)) {
    store.blacklist.push(id);
  }

  saveStore(store);
  return true;
}

/**
 * Récupère la blacklist
 */
export function getBlacklist(): string[] {
  const store = loadStore();
  return store.blacklist;
}

/**
 * Vérifie si une licence est dans la blacklist
 */
export function isBlacklisted(id: string): boolean {
  const store = loadStore();
  return store.blacklist.includes(id);
}

/**
 * Exporte la blacklist au format JSON
 */
export function exportBlacklist(): string {
  const blacklist = getBlacklist();
  return JSON.stringify(blacklist, null, 2);
}

/**
 * Récupère les statistiques du store
 */
export function getStats(): {
  total: number;
  active: number;
  expired: number;
  revoked: number;
  byType: Record<string, number>;
} {
  const store = loadStore();
  const now = new Date();

  const stats = {
    total: store.licenses.length,
    active: 0,
    expired: 0,
    revoked: 0,
    byType: {} as Record<string, number>,
  };

  for (const license of store.licenses) {
    // Par type
    const type = license.licenseData.licenseType;
    stats.byType[type] = (stats.byType[type] || 0) + 1;

    // Statut
    if (license.revoked) {
      stats.revoked++;
    } else if (new Date(license.licenseData.expires) < now) {
      stats.expired++;
    } else {
      stats.active++;
    }
  }

  return stats;
}

/**
 * Met à jour les notes d'une licence
 */
export function updateLicenseNotes(id: string, notes: string): boolean {
  const store = loadStore();
  const license = store.licenses.find(l => l.id === id);

  if (!license) {
    return false;
  }

  license.notes = notes;
  saveStore(store);
  return true;
}

export default {
  addLicense,
  getAllLicenses,
  getLicenses,
  getLicenseById,
  getLicenseByHwid,
  revokeLicense,
  getBlacklist,
  isBlacklisted,
  exportBlacklist,
  getStats,
  updateLicenseNotes,
};
