#!/usr/bin/env node

/**
 * POSPlus License Tool
 * Outil CLI pour la génération et gestion des licences
 *
 * Usage:
 *   posplus-license init                    - Initialize RSA keys
 *   posplus-license generate [options]      - Generate a license
 *   posplus-license verify <file>           - Verify a license file
 *   posplus-license list [options]          - List all licenses
 *   posplus-license revoke <id>             - Revoke a license
 */

import { Command } from 'commander';
import chalk from 'chalk';

import initLicenseTool from './commands/init';
import generateLicense from './commands/generate';
import verifyLicense from './commands/verify';
import listLicenses from './commands/list';
import revokeLicense from './commands/revoke';

// Créer le programme CLI
const program = new Command();

// Configuration générale
program
  .name('posplus-license')
  .description('POSPlus License Generation and Management Tool')
  .version('1.0.0')
  .addHelpText('before', chalk.blue(`
╔══════════════════════════════════════════════════════════╗
║              POSPlus License Tool v1.0.0                 ║
║     Professional License Management for POSPlus         ║
╚══════════════════════════════════════════════════════════╝
`));

// Commande: init
program
  .command('init')
  .description('Initialize the license tool (generate RSA keys)')
  .option('-f, --force', 'Force regeneration of keys (invalidates existing licenses)')
  .action(async (options) => {
    try {
      await initLicenseTool(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Commande: generate
program
  .command('generate')
  .description('Generate a new license file')
  .requiredOption('--hwid <hardware_id>', 'Client hardware ID (SHA-256 hash)')
  .requiredOption('--client <name>', 'Client name')
  .requiredOption('--type <type>', 'License type (DEMO, BASIC, PRO, ENTERPRISE)')
  .option('--expires <date>', 'Expiration date (YYYY-MM-DD), default: based on license type')
  .option('-o, --output <path>', 'Output file path')
  .option('--max-users <number>', 'Maximum users (for ENTERPRISE)', parseInt)
  .option('--notes <text>', 'Notes for internal reference')
  .action(async (options) => {
    try {
      await generateLicense(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Commande: verify
program
  .command('verify <file>')
  .description('Verify a license file')
  .option('--hwid <hardware_id>', 'Hardware ID to check against')
  .option('-v, --verbose', 'Show detailed license information')
  .action(async (file, options) => {
    try {
      await verifyLicense(file, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Commande: list
program
  .command('list')
  .description('List all generated licenses')
  .option('--client <name>', 'Filter by client name')
  .option('--type <type>', 'Filter by license type')
  .option('--active', 'Show only active licenses')
  .option('--revoked', 'Show only revoked licenses')
  .option('--stats', 'Show statistics only')
  .action(async (options) => {
    try {
      await listLicenses(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Commande: revoke
program
  .command('revoke <license_id>')
  .description('Revoke a license')
  .option('-r, --reason <text>', 'Reason for revocation')
  .option('-f, --force', 'Skip confirmation prompt')
  .option('-e, --export-blacklist', 'Export blacklist after revocation')
  .action(async (licenseId, options) => {
    try {
      await revokeLicense(licenseId, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Commande: show-key
program
  .command('show-key')
  .description('Display the public key for integration')
  .action(async () => {
    try {
      const { getPublicKeyForApp, keysExist } = await import('./crypto/rsa');

      if (!keysExist()) {
        console.error(chalk.red('❌ RSA keys not found. Run "posplus-license init" first.'));
        process.exit(1);
      }

      const publicKey = getPublicKeyForApp();
      console.log(chalk.blue('\n📋 Public Key for POSPlus:\n'));
      console.log(chalk.cyan(publicKey));
      console.log(chalk.gray('\nCopy this key into your POSPlus licenseValidator.ts file.\n'));
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Commande: export-blacklist
program
  .command('export-blacklist')
  .description('Export the blacklist of revoked licenses')
  .option('-o, --output <path>', 'Output file path', 'blacklist.json')
  .action(async (options) => {
    try {
      const { writeFileSync } = await import('fs');
      const { join, resolve } = await import('path');
      const { exportBlacklist } = await import('./storage/licenseStore');

      const blacklistJson = exportBlacklist();
      const outputPath = resolve(options.output);

      writeFileSync(outputPath, blacklistJson);
      console.log(chalk.green(`✅ Blacklist exported to: ${outputPath}`));
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Ajouter des exemples à l'aide
program.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.gray('# Initialize the tool (first time)')}
  $ posplus-license init

  ${chalk.gray('# Generate a PRO license')}
  $ posplus-license generate \\
      --hwid a1b2c3d4e5f6... \\
      --client "Restaurant ABC" \\
      --type PRO \\
      --expires 2026-01-01

  ${chalk.gray('# Verify a license file')}
  $ posplus-license verify license.lic --verbose

  ${chalk.gray('# List all active licenses')}
  $ posplus-license list --active

  ${chalk.gray('# Revoke a license')}
  $ posplus-license revoke a1b2c3d4 --reason "Refund requested"

${chalk.bold('Security Notes:')}
  ${chalk.yellow('•')} Keep the private key (keys/private.pem) secure
  ${chalk.yellow('•')} Never share the private key with clients
  ${chalk.yellow('•')} Only the public key is embedded in POSPlus
  ${chalk.yellow('•')} Hardware ID binds licenses to specific machines
`);

// Parser les arguments
program.parse();

// Si aucune commande, afficher l'aide
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
