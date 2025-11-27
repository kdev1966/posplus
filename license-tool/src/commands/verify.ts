/**
 * Commande: verify
 * Vérifie la validité d'un fichier de licence
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';
import type { LicenseData } from '../types';
import { verifyLicenseSignature, keysExist } from '../crypto/rsa';
import { isBlacklisted, getLicenseById } from '../storage/licenseStore';
import { generateLicenseId } from '../crypto/rsa';

interface VerifyOptions {
  hwid?: string;
  verbose?: boolean;
}

/**
 * Parse et valide la structure d'un fichier de licence
 */
function parseLicenseFile(content: string): LicenseData | null {
  try {
    const data = JSON.parse(content);

    const requiredFields = ['client', 'licenseType', 'hardwareId', 'expires', 'version', 'signature'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        console.error(chalk.red(`   Missing required field: ${field}`));
        return null;
      }
    }

    return data as LicenseData;
  } catch (error) {
    console.error(chalk.red('   Invalid JSON format'));
    return null;
  }
}

/**
 * Vérifie une licence
 */
export async function verifyLicense(filePath: string, options: VerifyOptions = {}): Promise<void> {
  console.log(chalk.blue('\n🔍 POSPlus License Verifier\n'));

  const resolvedPath = resolve(filePath);

  // Vérifier que le fichier existe
  if (!existsSync(resolvedPath)) {
    console.error(chalk.red(`❌ License file not found: ${resolvedPath}`));
    process.exit(1);
  }

  // Vérifier les clés RSA
  if (!keysExist()) {
    console.error(chalk.red('❌ RSA keys not found. Cannot verify signature.'));
    console.error(chalk.gray('   Run "posplus-license init" first.'));
    process.exit(1);
  }

  // Lire le fichier
  let content: string;
  try {
    content = readFileSync(resolvedPath, 'utf8');
  } catch (error) {
    console.error(chalk.red('❌ Failed to read license file:'), error);
    process.exit(1);
  }

  console.log(chalk.gray(`File: ${resolvedPath}\n`));
  console.log(chalk.bold('Verification Results:'));
  console.log(chalk.gray('─'.repeat(50)));

  let hasErrors = false;

  // 1. Parse du fichier
  process.stdout.write('  📋 File format............. ');
  const licenseData = parseLicenseFile(content);
  if (!licenseData) {
    console.log(chalk.red('INVALID'));
    hasErrors = true;
  } else {
    console.log(chalk.green('OK'));
  }

  if (!licenseData) {
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.red('\n❌ License verification FAILED\n'));
    process.exit(1);
  }

  // 2. Vérification de la signature RSA
  process.stdout.write('  🔏 RSA Signature........... ');
  const signatureValid = verifyLicenseSignature(licenseData);
  if (signatureValid) {
    console.log(chalk.green('VALID'));
  } else {
    console.log(chalk.red('INVALID'));
    hasErrors = true;
  }

  // 3. Vérification de l'expiration
  process.stdout.write('  📅 Expiration.............. ');
  const now = new Date();
  const expirationDate = new Date(licenseData.expires);
  expirationDate.setHours(23, 59, 59, 999);

  if (now > expirationDate) {
    console.log(chalk.red(`EXPIRED (${licenseData.expires})`));
    hasErrors = true;
  } else {
    const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 30) {
      console.log(chalk.yellow(`${daysRemaining} days remaining`));
    } else {
      console.log(chalk.green(`Valid until ${licenseData.expires}`));
    }
  }

  // 4. Vérification du Hardware ID (si fourni)
  if (options.hwid) {
    process.stdout.write('  💻 Hardware ID............. ');
    if (licenseData.hardwareId === options.hwid) {
      console.log(chalk.green('MATCH'));
    } else {
      console.log(chalk.red('MISMATCH'));
      hasErrors = true;
    }
  }

  // 5. Vérification de la blacklist
  process.stdout.write('  🚫 Blacklist status........ ');
  const licenseId = generateLicenseId(licenseData);
  if (isBlacklisted(licenseId)) {
    console.log(chalk.red('REVOKED'));
    hasErrors = true;
  } else {
    console.log(chalk.green('OK'));
  }

  // 6. Vérification dans le store
  process.stdout.write('  📦 Store record............ ');
  const storeRecord = getLicenseById(licenseId);
  if (storeRecord) {
    if (storeRecord.revoked) {
      console.log(chalk.red('REVOKED'));
    } else {
      console.log(chalk.green('FOUND'));
    }
  } else {
    console.log(chalk.yellow('NOT FOUND'));
  }

  console.log(chalk.gray('─'.repeat(50)));

  // Afficher les détails si verbose
  if (options.verbose) {
    console.log(chalk.bold('\nLicense Details:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`  ${chalk.bold('Client:')}        ${licenseData.client}`);
    console.log(`  ${chalk.bold('Type:')}          ${licenseData.licenseType}`);
    console.log(`  ${chalk.bold('Hardware ID:')}   ${licenseData.hardwareId}`);
    console.log(`  ${chalk.bold('Expires:')}       ${licenseData.expires}`);
    console.log(`  ${chalk.bold('Version:')}       ${licenseData.version}`);
    console.log(`  ${chalk.bold('Issued At:')}     ${licenseData.issuedAt || 'N/A'}`);
    if (licenseData.features) {
      console.log(`  ${chalk.bold('Features:')}      ${licenseData.features.join(', ')}`);
    }
    if (licenseData.maxUsers) {
      console.log(`  ${chalk.bold('Max Users:')}     ${licenseData.maxUsers}`);
    }
    console.log(`  ${chalk.bold('License ID:')}    ${licenseId}`);
    console.log(chalk.gray('─'.repeat(50)));
  }

  // Résultat final
  if (hasErrors) {
    console.log(chalk.red('\n❌ License verification FAILED\n'));
    process.exit(1);
  } else {
    console.log(chalk.green('\n✅ License is VALID\n'));
  }
}

export default verifyLicense;
