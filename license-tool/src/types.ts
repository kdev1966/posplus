/**
 * Types pour l'outil de génération de licences
 */

export type LicenseType = 'DEMO' | 'BASIC' | 'PRO' | 'ENTERPRISE';

export interface LicenseData {
  client: string;
  licenseType: LicenseType;
  hardwareId: string;
  expires: string; // YYYY-MM-DD
  version: string;
  issuedAt: string; // ISO date string
  features?: string[];
  maxUsers?: number;
  signature: string;
}

export interface LicenseRecord {
  id: string;
  licenseData: LicenseData;
  createdAt: string;
  notes?: string;
  filePath?: string;
  revoked: boolean;
  revokedAt?: string;
  revokeReason?: string;
}

export interface LicenseStore {
  licenses: LicenseRecord[];
  blacklist: string[];
  lastUpdated: string;
}

export interface RSAKeyPair {
  publicKey: string;
  privateKey: string;
  createdAt: string;
}

export const LICENSE_FEATURES: Record<LicenseType, string[]> = {
  DEMO: [
    'basic_pos',
    'max_100_products',
    'max_1_user',
    'watermark',
  ],
  BASIC: [
    'basic_pos',
    'products_unlimited',
    'max_3_users',
    'thermal_printing',
    'basic_reports',
  ],
  PRO: [
    'basic_pos',
    'products_unlimited',
    'users_unlimited',
    'thermal_printing',
    'advanced_reports',
    'customer_display',
    'stock_management',
    'backup_restore',
    'csv_import_export',
  ],
  ENTERPRISE: [
    'basic_pos',
    'products_unlimited',
    'users_unlimited',
    'thermal_printing',
    'advanced_reports',
    'customer_display',
    'stock_management',
    'backup_restore',
    'csv_import_export',
    'p2p_sync',
    'multi_store',
    'api_access',
    'priority_support',
  ],
};

export const LICENSE_DURATION: Record<LicenseType, number> = {
  DEMO: 30,
  BASIC: 365,
  PRO: 365,
  ENTERPRISE: 365,
};
