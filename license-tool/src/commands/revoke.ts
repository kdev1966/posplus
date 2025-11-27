/**
 * Commande: revoke
 * Révoque une licence existante
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { revokeLicense as revokeInStore, getLicenseById, exportBlacklist } from '../storage/licenseStore';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface RevokeOptions {
  reason?: string;
  force?: boolean;
  exportBlacklist?: boolean;
}

/**
 * Révoque une licence
 */
export async function revokeLicense(licenseId: string, options: RevokeOptions = {}): Promise<void> {
  console.log(chalk.blue('\n🚫 POSPlus License Revocation\n'));

  // Récupérer la licence
  const license = getLicenseById(licenseId);

  if (!license) {
    // Essayer avec un ID partiel
    console.error(chalk.red(`❌ License not found with ID: ${licenseId}`));
    console.error(chalk.gray('   Use "posplus-license list" to see all license IDs.'));
    process.exit(1);
  }

  // Vérifier si déjà révoquée
  if (license.revoked) {
    console.log(chalk.yellow(`⚠️  License ${licenseId} is already revoked.`));
    console.log(chalk.gray(`   Revoked at: ${license.revokedAt}`));
    console.log(chalk.gray(`   Reason: ${license.revokeReason || 'N/A'}`));
    return;
  }

  // Afficher les détails de la licence
  console.log(chalk.bold('License to revoke:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`   ${chalk.bold('ID:')}          ${license.id}`);
  console.log(`   ${chalk.bold('Client:')}      ${license.licenseData.client}`);
  console.log(`   ${chalk.bold('Type:')}        ${license.licenseData.licenseType}`);
  console.log(`   ${chalk.bold('Hardware ID:')} ${license.licenseData.hardwareId.substring(0, 16)}...`);
  console.log(`   ${chalk.bold('Expires:')}     ${license.licenseData.expires}`);
  console.log(`   ${chalk.bold('Created:')}     ${new Date(license.createdAt).toLocaleDateString('fr-FR')}`);
  console.log(chalk.gray('─'.repeat(50)));

  // Demander confirmation
  if (!options.force) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.red('Are you sure you want to revoke this license?'),
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('\n⚠️  Revocation cancelled.\n'));
      return;
    }
  }

  // Demander la raison si non fournie
  let reason = options.reason;
  if (!reason && !options.force) {
    const { inputReason } = await inquirer.prompt([
      {
        type: 'input',
        name: 'inputReason',
        message: 'Reason for revocation (optional):',
      },
    ]);
    reason = inputReason || undefined;
  }

  // Révoquer la licence
  const success = revokeInStore(license.id, reason);

  if (success) {
    console.log(chalk.green(`\n✅ License ${license.id} has been revoked.`));

    // Exporter la blacklist si demandé
    if (options.exportBlacklist) {
      const blacklistJson = exportBlacklist();
      const outputPath = join(process.cwd(), 'blacklist.json');
      writeFileSync(outputPath, blacklistJson);
      console.log(chalk.gray(`   Blacklist exported to: ${outputPath}`));
    }

    console.log(chalk.yellow('\n⚠️  Important:'));
    console.log(chalk.gray('   The client will still be able to use the application'));
    console.log(chalk.gray('   until the next license check. To enforce immediately,'));
    console.log(chalk.gray('   update the blacklist in the application.\n'));
  } else {
    console.error(chalk.red('\n❌ Failed to revoke license.\n'));
    process.exit(1);
  }
}

export default revokeLicense;
