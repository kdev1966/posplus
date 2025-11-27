/**
 * Commande: init
 * Initialise l'outil de licensing (génère les clés RSA)
 */

import chalk from 'chalk';
import { generateKeyPair, keysExist, getPublicKeyForApp } from '../crypto/rsa';
import inquirer from 'inquirer';

interface InitOptions {
  force?: boolean;
}

/**
 * Initialise les clés RSA
 */
export async function initLicenseTool(options: InitOptions = {}): Promise<void> {
  console.log(chalk.blue('\n🔐 POSPlus License Tool Initialization\n'));

  // Vérifier si les clés existent déjà
  if (keysExist() && !options.force) {
    console.log(chalk.yellow('⚠️  RSA keys already exist.'));
    console.log(chalk.gray('   Use --force to regenerate (will invalidate all existing licenses).\n'));

    const { showKey } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'showKey',
        message: 'Display the public key for integration?',
        default: false,
      },
    ]);

    if (showKey) {
      displayPublicKey();
    }

    return;
  }

  // Avertissement si régénération
  if (keysExist() && options.force) {
    console.log(chalk.red('⚠️  WARNING: Regenerating keys will invalidate ALL existing licenses!'));

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you absolutely sure?',
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('\nInitialization cancelled.\n'));
      return;
    }
  }

  // Générer les clés
  console.log(chalk.gray('Generating RSA-2048 key pair...'));
  generateKeyPair();

  console.log(chalk.green('\n✅ Initialization complete!\n'));

  // Afficher la clé publique
  displayPublicKey();

  // Instructions
  console.log(chalk.bold('\nNext Steps:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log('1. Copy the public key above into your POSPlus application');
  console.log('2. Replace the placeholder in:');
  console.log(chalk.gray('   src/main-process/services/license/licenseValidator.ts'));
  console.log('3. Keep the private key SECURE and NEVER share it');
  console.log('4. Use "posplus-license generate" to create licenses\n');
}

/**
 * Affiche la clé publique formatée
 */
function displayPublicKey(): void {
  const publicKey = getPublicKeyForApp();

  console.log(chalk.bold('\n📋 Public Key for POSPlus (copy this):'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.cyan(publicKey));
  console.log(chalk.gray('─'.repeat(60)));
}

export default initLicenseTool;
