/**
 * Composant d'affichage des informations de licence
 * À intégrer dans les paramètres de l'application
 */

import React, { useEffect, useState } from 'react';
import { useLicenseStore } from '../../store/licenseStore';

export const LicenseInfo: React.FC = () => {
  const {
    licenseInfo,
    hardwareInfo,
    isLoading,
    error,
    checkLicense,
    getHardwareInfo,
    importLicense,
    removeLicense,
    clearError,
  } = useLicenseStore();

  const [showHwid, setShowHwid] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  useEffect(() => {
    checkLicense();
    getHardwareInfo();
  }, []);

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

  // Obtenir la couleur du badge selon le statut
  const getStatusColor = () => {
    if (!licenseInfo) return 'bg-gray-500';
    if (!licenseInfo.isLicensed) return 'bg-red-500';
    if (licenseInfo.daysRemaining && licenseInfo.daysRemaining <= 30) return 'bg-amber-500';
    return 'bg-green-500';
  };

  // Obtenir le texte du statut
  const getStatusText = () => {
    if (!licenseInfo) return 'Non vérifié';
    if (!licenseInfo.isLicensed) {
      switch (licenseInfo.status) {
        case 'expired': return 'Expirée';
        case 'invalid_signature': return 'Signature invalide';
        case 'hardware_mismatch': return 'Machine non autorisée';
        case 'revoked': return 'Révoquée';
        case 'not_found': return 'Non trouvée';
        case 'corrupted': return 'Corrompue';
        default: return 'Invalide';
      }
    }
    return 'Active';
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec statut */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <span className="font-medium text-white">
            Licence {getStatusText()}
          </span>
        </div>

        {licenseInfo?.licenseType && (
          <span className="px-3 py-1 bg-primary-600/30 text-primary-400 rounded-full text-sm font-medium">
            {licenseInfo.licenseType}
          </span>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Informations de licence */}
      {licenseInfo?.isLicensed && (
        <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Client</span>
            <span className="text-white">{licenseInfo.client}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Type</span>
            <span className="text-white">{licenseInfo.licenseType}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Expiration</span>
            <span className={`${
              licenseInfo.daysRemaining && licenseInfo.daysRemaining <= 30
                ? 'text-amber-400'
                : 'text-white'
            }`}>
              {licenseInfo.expiresAt}
              {licenseInfo.daysRemaining !== undefined && (
                <span className="text-gray-500 ml-2">
                  ({licenseInfo.daysRemaining} jours)
                </span>
              )}
            </span>
          </div>

          {licenseInfo.features && licenseInfo.features.length > 0 && (
            <div className="pt-2 border-t border-slate-700">
              <span className="text-gray-400 text-sm">Fonctionnalités</span>
              <div className="flex flex-wrap gap-1 mt-2">
                {licenseInfo.features.slice(0, 5).map((feature) => (
                  <span
                    key={feature}
                    className="px-2 py-0.5 bg-slate-700 text-gray-300 rounded text-xs"
                  >
                    {feature.replace(/_/g, ' ')}
                  </span>
                ))}
                {licenseInfo.features.length > 5 && (
                  <span className="px-2 py-0.5 bg-slate-700 text-gray-400 rounded text-xs">
                    +{licenseInfo.features.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hardware ID */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Hardware ID</span>
          <button
            onClick={() => setShowHwid(!showHwid)}
            className="text-primary-400 hover:text-primary-300 text-sm"
          >
            {showHwid ? 'Masquer' : 'Afficher'}
          </button>
        </div>

        {showHwid && hardwareInfo && (
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-slate-900 p-2 rounded font-mono text-gray-300 overflow-x-auto">
              {hardwareInfo.hardwareId}
            </code>
            <button
              onClick={handleCopyHwid}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-sm rounded transition-colors"
            >
              {copySuccess ? 'Copié!' : 'Copier'}
            </button>
          </div>
        )}

        {hardwareInfo && (
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <div>Plateforme: {hardwareInfo.platform}</div>
            <div>Machine: {hardwareInfo.hostname}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => importLicense()}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-600/50 text-white rounded-lg transition-colors text-sm font-medium"
        >
          {isLoading ? 'Chargement...' : 'Importer une licence'}
        </button>

        <button
          onClick={() => checkLicense()}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 text-white rounded-lg transition-colors text-sm"
        >
          Vérifier
        </button>
      </div>

      {/* Supprimer la licence */}
      {licenseInfo?.isLicensed && (
        <div className="pt-4 border-t border-slate-700">
          {!showRemoveConfirm ? (
            <button
              onClick={() => setShowRemoveConfirm(true)}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Supprimer la licence
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-400">Confirmer la suppression ?</span>
              <button
                onClick={async () => {
                  await removeLicense();
                  setShowRemoveConfirm(false);
                }}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded"
              >
                Oui
              </button>
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded"
              >
                Non
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LicenseInfo;
