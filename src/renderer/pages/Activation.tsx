/**
 * Page d'activation de licence POSPlus
 * Affichée quand l'application n'est pas activée
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLicenseStore } from '../store/licenseStore';
import { Button } from '../components/ui/Button';

export const Activation: React.FC = () => {
  const navigate = useNavigate();
  const {
    licenseInfo,
    hardwareInfo,
    isLoading,
    error,
    isLicensed,
    checkLicense,
    getHardwareInfo,
    importLicense,
    clearError,
  } = useLicenseStore();

  const [copySuccess, setCopySuccess] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Charger les infos matérielles au montage
  useEffect(() => {
    getHardwareInfo();
  }, [getHardwareInfo]);

  // Copier le Hardware ID
  const handleCopyHwid = async () => {
    if (hardwareInfo?.hardwareId) {
      try {
        await navigator.clipboard.writeText(hardwareInfo.hardwareId);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Importer une licence
  const handleImportLicense = async () => {
    clearError();
    const result = await importLicense();

    if (result.valid) {
      // Rediriger vers le login après activation réussie
      navigate('/login');
    }
  };

  // Si la licence est valide, rediriger
  useEffect(() => {
    if (isLicensed) {
      navigate('/login');
    }
  }, [isLicensed, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-lg">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gradient glow-text mb-2">
            POS+
          </h1>
          <p className="text-gray-400">Activation de la licence</p>
        </div>

        {/* Carte principale */}
        <div className="card scale-in">
          {/* Icône de verrouillage */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-bold text-center text-white mb-4">
            Activation requise
          </h2>

          <p className="text-gray-400 text-center mb-6">
            Pour utiliser POS+, vous devez activer votre licence.
            Veuillez communiquer votre identifiant machine ci-dessous
            à votre fournisseur pour obtenir un fichier de licence.
          </p>

          {/* Hardware ID */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Identifiant Machine (Hardware ID)
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={hardwareInfo?.hardwareId || 'Chargement...'}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white font-mono text-sm pr-24"
              />
              <button
                onClick={handleCopyHwid}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-sm rounded-md transition-colors"
              >
                {copySuccess ? 'Copié !' : 'Copier'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Cet identifiant est unique à cette machine
            </p>
          </div>

          {/* Détails machine */}
          {hardwareInfo && (
            <div className="mb-6">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                Détails de la machine
              </button>

              {showDetails && (
                <div className="mt-2 p-3 bg-slate-800/50 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Plateforme:</span>
                    <span className="text-white">{hardwareInfo.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Nom:</span>
                    <span className="text-white">{hardwareInfo.hostname}</span>
                  </div>
                  {hardwareInfo.macAddress && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">MAC:</span>
                      <span className="text-white font-mono text-xs">
                        {hardwareInfo.macAddress}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Statut licence si présente mais invalide */}
          {licenseInfo && !isLicensed && (
            <div className="mb-6 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-medium">Licence invalide</p>
                  <p className="text-xs mt-1 text-amber-400/80">
                    Statut: {licenseInfo.status}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Boutons */}
          <div className="space-y-3">
            <Button
              onClick={handleImportLicense}
              variant="primary"
              isLoading={isLoading}
              className="w-full"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importer un fichier de licence
            </Button>

            <button
              onClick={() => checkLicense()}
              disabled={isLoading}
              className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Vérifier à nouveau
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Pour obtenir une licence, contactez votre fournisseur avec votre Hardware ID.</p>
          <p className="mt-1">
            Fichiers acceptés: <span className="text-gray-400">.lic</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Activation;
