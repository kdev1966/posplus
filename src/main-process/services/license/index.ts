/**
 * POSPlus License Module
 * Point d'entrée pour tous les services de licensing
 */

export * from './hardwareId';
export * from './licenseValidator';
export * from './databaseProtection';

import hardwareId from './hardwareId';
import licenseValidator from './licenseValidator';
import databaseProtection from './databaseProtection';

export { hardwareId, licenseValidator, databaseProtection };

// Export par défaut combiné
export default {
  hardwareId,
  license: licenseValidator,
  dbProtection: databaseProtection,
};
