/**
 * POSPlus License IPC Handlers
 * Gère les requêtes IPC liées au licensing
 */

import { ipcMain, dialog } from 'electron';
import log from 'electron-log';
import {
  getHardwareId,
  getHardwareInfo,
  validateLicense,
  importLicense,
  removeLicense,
  getLicenseInfo,
  refreshLicense,
} from '../services/license';
import { LICENSE_IPC_CHANNELS } from '@shared/types/license';
import type { LicenseValidationResult, LicenseInfo, HardwareInfo } from '@shared/types/license';

// ============================================================================
// HARDWARE ID HANDLERS
// ============================================================================

/**
 * Récupère le Hardware ID de la machine
 */
ipcMain.handle(LICENSE_IPC_CHANNELS.LICENSE_GET_HARDWARE_ID, async (): Promise<string> => {
  log.info('IPC: Getting hardware ID');
  try {
    const hwid = getHardwareId();
    log.info('Hardware ID retrieved successfully');
    return hwid;
  } catch (error) {
    log.error('Failed to get hardware ID:', error);
    throw error;
  }
});

/**
 * Récupère les informations matérielles complètes
 */
ipcMain.handle(LICENSE_IPC_CHANNELS.LICENSE_GET_HARDWARE_INFO, async (): Promise<HardwareInfo> => {
  log.info('IPC: Getting hardware info');
  try {
    const info = getHardwareInfo();
    log.info('Hardware info retrieved successfully');
    return info;
  } catch (error) {
    log.error('Failed to get hardware info:', error);
    throw error;
  }
});

// ============================================================================
// LICENSE VALIDATION HANDLERS
// ============================================================================

/**
 * Valide la licence actuelle
 */
ipcMain.handle(LICENSE_IPC_CHANNELS.LICENSE_VALIDATE, async (): Promise<LicenseValidationResult> => {
  log.info('IPC: Validating license');
  try {
    const result = validateLicense();
    log.info('License validation result:', {
      valid: result.valid,
      status: result.status,
    });
    return result;
  } catch (error) {
    log.error('Failed to validate license:', error);
    throw error;
  }
});

/**
 * Récupère les informations de licence
 */
ipcMain.handle(LICENSE_IPC_CHANNELS.LICENSE_GET_INFO, async (): Promise<LicenseInfo> => {
  log.info('IPC: Getting license info');
  try {
    const info = getLicenseInfo();
    return info;
  } catch (error) {
    log.error('Failed to get license info:', error);
    throw error;
  }
});

/**
 * Récupère le statut de la licence
 */
ipcMain.handle(LICENSE_IPC_CHANNELS.LICENSE_GET_STATUS, async (): Promise<LicenseValidationResult> => {
  log.info('IPC: Getting license status');
  try {
    const result = refreshLicense();
    return result;
  } catch (error) {
    log.error('Failed to get license status:', error);
    throw error;
  }
});

// ============================================================================
// LICENSE MANAGEMENT HANDLERS
// ============================================================================

/**
 * Importe un fichier de licence
 * Ouvre un dialogue de sélection de fichier si aucun chemin n'est fourni
 */
ipcMain.handle(
  LICENSE_IPC_CHANNELS.LICENSE_IMPORT,
  async (_event, filePath?: string): Promise<LicenseValidationResult> => {
    log.info('IPC: Importing license');

    try {
      let sourcePath = filePath;

      // Si pas de chemin fourni, ouvrir le dialogue
      if (!sourcePath) {
        const result = await dialog.showOpenDialog({
          title: 'Importer une licence',
          filters: [
            { name: 'Fichiers de licence', extensions: ['lic'] },
            { name: 'Tous les fichiers', extensions: ['*'] },
          ],
          properties: ['openFile'],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return {
            valid: false,
            status: 'not_found',
            message: 'Import annulé par l\'utilisateur.',
          };
        }

        sourcePath = result.filePaths[0];
      }

      log.info('Importing license from:', sourcePath);
      const validationResult = importLicense(sourcePath);

      if (validationResult.valid) {
        log.info('License imported successfully');
      } else {
        log.warn('License import failed:', validationResult.message);
      }

      return validationResult;
    } catch (error) {
      log.error('Failed to import license:', error);
      return {
        valid: false,
        status: 'corrupted',
        message: 'Erreur lors de l\'import de la licence.',
      };
    }
  }
);

/**
 * Supprime la licence actuelle
 */
ipcMain.handle(LICENSE_IPC_CHANNELS.LICENSE_REMOVE, async (): Promise<boolean> => {
  log.info('IPC: Removing license');
  try {
    const success = removeLicense();
    if (success) {
      log.info('License removed successfully');
    } else {
      log.warn('Failed to remove license');
    }
    return success;
  } catch (error) {
    log.error('Failed to remove license:', error);
    throw error;
  }
});

log.info('License IPC handlers registered');
