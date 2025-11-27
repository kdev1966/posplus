/**
 * Commande: generate
 * Génère un nouveau fichier de licence
 */

import { writeFileSync } from 'fs';
import { join, resolve } from 'path';
import chalk from 'chalk';
import type { LicenseType, LicenseData } from '../types';
import { LICENSE_FEATURES, LICENSE_DURATION } from '../types';
import { signLicense, keysExist, loadOrGenerateKeys } from '../crypto/rsa';
import { addLicense } from '../storage/licenseStore';

interface GenerateOptions {
  hwid: string;
  client: string;
  type: string;
  expires?: string;
  output?: string;
  maxUsers?: number;
  notes?: string;
}

/**
 * Valide le format du Hardware ID (SHA-256 = 64 caractères hex)
 */
function validateHwid(hwid: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hwid);
}

/**
 * Valide le format de la date (YYYY-MM-DD)
 */
function validateDate(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;

  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Calcule la date d'expiration par défaut
 */
function calculateExpiration(type: LicenseType): string {
  const days = LICENSE_DURATION[type] || 365;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Génère une licence
 */
export async function generateLicense(options: GenerateOptions): Promise<void> {
  console.log(chalk.blue('\n📄 POSPlus License Generator\n'));

  // Vérifier les clés RSA
  if (!keysExist()) {
    console.log(chalk.yellow('⚠️  RSA keys not found. Generating new key pair...'));
    loadOrGenerateKeys();
    console.log('');
  }

  // Valider le Hardware ID
  if (!validateHwid(options.hwid)) {
    console.error(chalk.red('❌ Invalid Hardware ID format.'));
    console.error(chalk.gray('   Expected: 64 character hexadecimal string (SHA-256)'));
    console.error(chalk.gray(`   Received: ${options.hwid}`));
    process.exit(1);
  }

  // Valider le type de licence
  const licenseType = options.type.toUpperCase() as LicenseType;
  if (!['DEMO', 'BASIC', 'PRO', 'ENTERPRISE'].includes(licenseType)) {
    console.error(chalk.red('❌ Invalid license type.'));
    console.error(chalk.gray('   Valid types: DEMO, BASIC, PRO, ENTERPRISE'));
    process.exit(1);
  }

  // Calculer ou valider la date d'expiration
  let expirationDate: string;
  if (options.expires) {
    if (!validateDate(options.expires)) {
      console.error(chalk.red('❌ Invalid expiration date format.'));
      console.error(chalk.gray('   Expected: YYYY-MM-DD'));
      process.exit(1);
    }
    expirationDate = options.expires;
  } else {
    expirationDate = calculateExpiration(licenseType);
  }

  // Vérifier que la date n'est pas dans le passé
  if (new Date(expirationDate) < new Date()) {
    console.error(chalk.red('❌ Expiration date cannot be in the past.'));
    process.exit(1);
  }

  // Construire les données de licence
  const licenseData: Omit<LicenseData, 'signature'> = {
    client: options.client,
    licenseType,
    hardwareId: options.hwid,
    expires: expirationDate,
    version: '1.0',
    issuedAt: new Date().toISOString(),
    features: LICENSE_FEATURES[licenseType],
    maxUsers: options.maxUsers,
  };

  // Signer la licence
  console.log(chalk.gray('🔏 Signing license...'));
  const signature = signLicense(licenseData);

  const fullLicense: LicenseData = {
    ...licenseData,
    signature,
  };

  // Déterminer le chemin de sortie
  const timestamp = new Date().toISOString().split('T')[0];
  const safeName = options.client.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const defaultFilename = `license_${safeName}_${timestamp}.lic`;
  const outputPath = options.output
    ? resolve(options.output)
    : join(process.cwd(), defaultFilename);

  // Écrire le fichier de licence
  try {
    writeFileSync(outputPath, JSON.stringify(fullLicense, null, 2), { mode: 0o644 });
    console.log(chalk.green(`✅ License file created: ${outputPath}`));
  } catch (error) {
    console.error(chalk.red('❌ Failed to write license file:'), error);
    process.exit(1);
  }

  // Enregistrer dans le store
  try {
    const record = addLicense(fullLicense, outputPath, options.notes);
    console.log(chalk.gray(`📋 License recorded with ID: ${record.id}`));
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to record license in store:'), error);
  }

  // Afficher le résumé
  console.log(chalk.blue('\n📋 License Summary:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`   ${chalk.bold('Client:')}      ${options.client}`);
  console.log(`   ${chalk.bold('Type:')}        ${licenseType}`);
  console.log(`   ${chalk.bold('Hardware ID:')} ${options.hwid.substring(0, 16)}...`);
  console.log(`   ${chalk.bold('Expires:')}     ${expirationDate}`);
  console.log(`   ${chalk.bold('Features:')}    ${LICENSE_FEATURES[licenseType].length} features`);
  if (options.maxUsers) {
    console.log(`   ${chalk.bold('Max Users:')}   ${options.maxUsers}`);
  }
  console.log(chalk.gray('─'.repeat(50)));

  console.log(chalk.green('\n✅ License generated successfully!\n'));
  console.log(chalk.gray('Send this file to the client for activation:'));
  console.log(chalk.white(`   ${outputPath}\n`));
}

export default generateLicense;
