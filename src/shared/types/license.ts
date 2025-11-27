/**
 * POSPlus License Types
 * Types partagés entre le main process et le renderer
 */

// Types de licence disponibles
export type LicenseType = 'DEMO' | 'BASIC' | 'PRO' | 'ENTERPRISE';

// Statuts de validation
export type LicenseStatus =
  | 'valid'
  | 'expired'
  | 'invalid_signature'
  | 'hardware_mismatch'
  | 'revoked'
  | 'not_found'
  | 'corrupted';

// Structure du fichier de licence (.lic)
export interface LicenseData {
  client: string;
  licenseType: LicenseType;
  hardwareId: string;
  expires: string; // YYYY-MM-DD
  version: string;
  issuedAt: string; // ISO date string
  features?: string[]; // Fonctionnalités activées
  maxUsers?: number; // Nombre max d'utilisateurs (pour ENTERPRISE)
  signature: string; // RSA signature base64
}

// Résultat de validation de licence
export interface LicenseValidationResult {
  valid: boolean;
  status: LicenseStatus;
  licenseType?: LicenseType;
  client?: string;
  expiresAt?: string;
  daysRemaining?: number;
  features?: string[];
  maxUsers?: number;
  message: string;
}

// Informations sur le Hardware ID
export interface HardwareInfo {
  hardwareId: string;
  machineUUID?: string;
  cpuId?: string;
  diskSerial?: string;
  macAddress?: string;
  platform: string;
  hostname: string;
}

// Informations de licence pour l'UI
export interface LicenseInfo {
  isLicensed: boolean;
  status: LicenseStatus;
  client?: string;
  licenseType?: LicenseType;
  expiresAt?: string;
  daysRemaining?: number;
  hardwareId: string;
  features?: string[];
}

// Canaux IPC pour le licensing
export const LICENSE_IPC_CHANNELS = {
  // Hardware ID
  LICENSE_GET_HARDWARE_ID: 'license:get-hardware-id',
  LICENSE_GET_HARDWARE_INFO: 'license:get-hardware-info',

  // Validation
  LICENSE_VALIDATE: 'license:validate',
  LICENSE_GET_INFO: 'license:get-info',
  LICENSE_GET_STATUS: 'license:get-status',

  // Gestion
  LICENSE_IMPORT: 'license:import',
  LICENSE_REMOVE: 'license:remove',

  // Events
  LICENSE_STATUS_CHANGED: 'license:status-changed',
} as const;

// Features par type de licence
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

// Durées par défaut des licences (en jours)
export const LICENSE_DURATION: Record<LicenseType, number> = {
  DEMO: 30,
  BASIC: 365,
  PRO: 365,
  ENTERPRISE: 365,
};
