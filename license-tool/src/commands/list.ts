/**
 * Commande: list
 * Affiche la liste des licences générées
 */

import chalk from 'chalk';
import { table } from 'table';
import { getLicenses, getStats } from '../storage/licenseStore';
import type { LicenseRecord } from '../types';

interface ListOptions {
  client?: string;
  type?: string;
  active?: boolean;
  revoked?: boolean;
  stats?: boolean;
}

/**
 * Formate une date pour l'affichage
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR');
}

/**
 * Détermine le statut d'une licence
 */
function getStatus(license: LicenseRecord): string {
  if (license.revoked) {
    return chalk.red('REVOKED');
  }

  const now = new Date();
  const expires = new Date(license.licenseData.expires);

  if (now > expires) {
    return chalk.gray('EXPIRED');
  }

  const daysRemaining = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 30) {
    return chalk.yellow(`${daysRemaining}d left`);
  }

  return chalk.green('ACTIVE');
}

/**
 * Affiche les statistiques
 */
function showStats(): void {
  const stats = getStats();

  console.log(chalk.blue('\n📊 License Statistics\n'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`   Total licenses:     ${chalk.bold(stats.total)}`);
  console.log(`   Active:             ${chalk.green(stats.active)}`);
  console.log(`   Expired:            ${chalk.gray(stats.expired)}`);
  console.log(`   Revoked:            ${chalk.red(stats.revoked)}`);
  console.log(chalk.gray('─'.repeat(40)));

  if (Object.keys(stats.byType).length > 0) {
    console.log('\n   By Type:');
    for (const [type, count] of Object.entries(stats.byType)) {
      console.log(`     ${type.padEnd(12)} ${count}`);
    }
  }

  console.log('');
}

/**
 * Liste les licences
 */
export async function listLicenses(options: ListOptions = {}): Promise<void> {
  console.log(chalk.blue('\n📋 POSPlus License List\n'));

  // Afficher les stats si demandé
  if (options.stats) {
    showStats();
    return;
  }

  // Récupérer les licences filtrées
  const licenses = getLicenses({
    client: options.client,
    type: options.type,
    active: options.active,
    revoked: options.revoked,
  });

  if (licenses.length === 0) {
    console.log(chalk.yellow('   No licenses found.\n'));
    return;
  }

  // Préparer les données pour le tableau
  const headers = [
    chalk.bold('ID'),
    chalk.bold('Client'),
    chalk.bold('Type'),
    chalk.bold('Expires'),
    chalk.bold('Status'),
    chalk.bold('Created'),
  ];

  const rows = licenses.map((license) => [
    license.id.substring(0, 8),
    license.licenseData.client.substring(0, 20),
    license.licenseData.licenseType,
    license.licenseData.expires,
    getStatus(license),
    formatDate(license.createdAt),
  ]);

  // Afficher le tableau
  const tableData = [headers, ...rows];
  const tableConfig = {
    border: {
      topBody: chalk.gray('─'),
      topJoin: chalk.gray('┬'),
      topLeft: chalk.gray('┌'),
      topRight: chalk.gray('┐'),
      bottomBody: chalk.gray('─'),
      bottomJoin: chalk.gray('┴'),
      bottomLeft: chalk.gray('└'),
      bottomRight: chalk.gray('┘'),
      bodyLeft: chalk.gray('│'),
      bodyRight: chalk.gray('│'),
      bodyJoin: chalk.gray('│'),
      joinBody: chalk.gray('─'),
      joinLeft: chalk.gray('├'),
      joinRight: chalk.gray('┤'),
      joinJoin: chalk.gray('┼'),
    },
  };

  console.log(table(tableData, tableConfig));

  // Afficher le résumé
  console.log(chalk.gray(`   Total: ${licenses.length} license(s)\n`));
}

export default listLicenses;
