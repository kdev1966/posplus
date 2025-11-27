/**
 * POSPlus License Store
 * Gère l'état de la licence dans l'application
 */

import { create } from 'zustand';
import type { LicenseInfo, LicenseValidationResult, HardwareInfo } from '@shared/types/license';

interface LicenseState {
  // État de la licence
  licenseInfo: LicenseInfo | null;
  hardwareInfo: HardwareInfo | null;
  isLoading: boolean;
  error: string | null;

  // Vérification initiale
  isChecked: boolean;
  isLicensed: boolean;

  // Actions
  checkLicense: () => Promise<LicenseValidationResult>;
  getHardwareInfo: () => Promise<HardwareInfo>;
  importLicense: (filePath?: string) => Promise<LicenseValidationResult>;
  removeLicense: () => Promise<boolean>;
  clearError: () => void;
}

export const useLicenseStore = create<LicenseState>((set, _get) => ({
  // État initial
  licenseInfo: null,
  hardwareInfo: null,
  isLoading: false,
  error: null,
  isChecked: false,
  isLicensed: false,

  // Vérifier la licence
  checkLicense: async () => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.api.validateLicense();
      const licenseInfo = await window.api.getLicenseInfo();

      set({
        licenseInfo,
        isLicensed: result.valid,
        isChecked: true,
        isLoading: false,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de validation';
      set({
        error: errorMessage,
        isChecked: true,
        isLicensed: false,
        isLoading: false,
      });

      return {
        valid: false,
        status: 'corrupted' as const,
        message: errorMessage,
      };
    }
  },

  // Récupérer les infos matérielles
  getHardwareInfo: async () => {
    try {
      const hardwareInfo = await window.api.getHardwareInfo();
      set({ hardwareInfo });
      return hardwareInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de récupération';
      set({ error: errorMessage });
      throw error;
    }
  },

  // Importer une licence
  importLicense: async (filePath?: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.api.importLicense(filePath);

      if (result.valid) {
        const licenseInfo = await window.api.getLicenseInfo();
        set({
          licenseInfo,
          isLicensed: true,
          isLoading: false,
        });
      } else {
        set({
          error: result.message,
          isLoading: false,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur d\'import';
      set({
        error: errorMessage,
        isLoading: false,
      });

      return {
        valid: false,
        status: 'corrupted' as const,
        message: errorMessage,
      };
    }
  },

  // Supprimer la licence
  removeLicense: async () => {
    set({ isLoading: true, error: null });

    try {
      const success = await window.api.removeLicense();

      if (success) {
        set({
          licenseInfo: null,
          isLicensed: false,
          isLoading: false,
        });
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de suppression';
      set({
        error: errorMessage,
        isLoading: false,
      });
      return false;
    }
  },

  // Effacer l'erreur
  clearError: () => set({ error: null }),
}));
