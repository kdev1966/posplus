/**
 * POSPlus Hardware ID Generator
 * Génère un identifiant unique basé sur le matériel de la machine
 * Compatible Windows, macOS, Linux
 */

import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { networkInterfaces, hostname, platform, cpus } from 'os';
import log from 'electron-log';
import type { HardwareInfo } from '@shared/types/license';

// Cache du hardware ID pour éviter les recalculs
let cachedHardwareId: string | null = null;
let cachedHardwareInfo: HardwareInfo | null = null;

/**
 * Exécute une commande shell et retourne le résultat nettoyé
 */
function execCommand(command: string): string {
  try {
    return execSync(command, {
      encoding: 'utf8',
      timeout: 5000,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Récupère l'UUID de la machine
 * Windows: WMIC ou PowerShell
 * macOS: system_profiler
 * Linux: /etc/machine-id ou dmidecode
 */
function getMachineUUID(): string {
  const os = platform();

  try {
    if (os === 'win32') {
      // Essayer PowerShell d'abord (plus fiable)
      let uuid = execCommand(
        'powershell -Command "(Get-WmiObject Win32_ComputerSystemProduct).UUID"'
      );
      if (!uuid || uuid === 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF') {
        // Fallback WMIC
        uuid = execCommand('wmic csproduct get uuid');
        uuid = uuid.split('\n').filter(line => line.trim() && !line.includes('UUID'))[0]?.trim() || '';
      }
      return uuid;
    } else if (os === 'darwin') {
      const output = execCommand(
        "system_profiler SPHardwareDataType | grep 'Hardware UUID' | awk '{print $3}'"
      );
      return output;
    } else {
      // Linux - plusieurs sources possibles
      let uuid = execCommand('cat /etc/machine-id 2>/dev/null').trim();
      if (!uuid) {
        uuid = execCommand(
          "sudo dmidecode -s system-uuid 2>/dev/null || cat /sys/class/dmi/id/product_uuid 2>/dev/null"
        );
      }
      if (!uuid) {
        uuid = execCommand('cat /var/lib/dbus/machine-id 2>/dev/null');
      }
      return uuid;
    }
  } catch (error) {
    log.warn('Failed to get machine UUID:', error);
    return '';
  }
}

/**
 * Récupère l'ID du CPU
 */
function getCpuId(): string {
  const os = platform();

  try {
    if (os === 'win32') {
      const output = execCommand('wmic cpu get processorid');
      const lines = output.split('\n').filter(line => line.trim() && !line.includes('ProcessorId'));
      return lines[0]?.trim() || '';
    } else if (os === 'darwin') {
      // macOS n'expose pas directement le CPU ID, on utilise le modèle + features
      const output = execCommand('sysctl -n machdep.cpu.brand_string');
      return output;
    } else {
      // Linux
      const output = execCommand(
        "cat /proc/cpuinfo | grep -m1 'Serial\\|model name' | awk -F: '{print $2}'"
      );
      return output.trim();
    }
  } catch (error) {
    log.warn('Failed to get CPU ID:', error);
    // Fallback: utiliser les infos des CPUs depuis os.cpus()
    const cpuInfo = cpus();
    if (cpuInfo.length > 0) {
      return cpuInfo[0].model;
    }
    return '';
  }
}

/**
 * Récupère le numéro de série du disque principal
 */
function getDiskSerial(): string {
  const os = platform();

  try {
    if (os === 'win32') {
      // Récupérer le serial du disque C:
      let serial = execCommand(
        'powershell -Command "(Get-PhysicalDisk | Select-Object -First 1).SerialNumber"'
      );
      if (!serial) {
        serial = execCommand('wmic diskdrive get serialnumber');
        const lines = serial.split('\n').filter(line => line.trim() && !line.includes('SerialNumber'));
        serial = lines[0]?.trim() || '';
      }
      return serial;
    } else if (os === 'darwin') {
      // macOS - Serial du disque système
      const output = execCommand(
        "diskutil info disk0 | grep 'Device / Media Name' | awk -F: '{print $2}'"
      );
      return output.trim();
    } else {
      // Linux
      const output = execCommand(
        "lsblk -o SERIAL -dn 2>/dev/null | head -1 || hdparm -I /dev/sda 2>/dev/null | grep 'Serial Number' | awk '{print $3}'"
      );
      return output.trim();
    }
  } catch (error) {
    log.warn('Failed to get disk serial:', error);
    return '';
  }
}

/**
 * Récupère l'adresse MAC de la première interface réseau active
 */
function getMacAddress(): string {
  const interfaces = networkInterfaces();

  // Priorité: eth0, en0, Ethernet, Wi-Fi, puis n'importe quelle interface non-loopback
  const priority = ['eth0', 'en0', 'Ethernet', 'Wi-Fi', 'wlan0', 'enp0s'];

  for (const name of priority) {
    for (const [ifaceName, addresses] of Object.entries(interfaces)) {
      if (ifaceName.toLowerCase().includes(name.toLowerCase()) && addresses) {
        for (const addr of addresses) {
          if (!addr.internal && addr.mac && addr.mac !== '00:00:00:00:00:00') {
            return addr.mac.toUpperCase();
          }
        }
      }
    }
  }

  // Fallback: première interface non-loopback avec MAC valide
  for (const addresses of Object.values(interfaces)) {
    if (addresses) {
      for (const addr of addresses) {
        if (!addr.internal && addr.mac && addr.mac !== '00:00:00:00:00:00') {
          return addr.mac.toUpperCase();
        }
      }
    }
  }

  return '';
}

/**
 * Génère le Hardware ID en combinant plusieurs identifiants matériels
 * Le résultat est un hash SHA-256 pour garantir la stabilité et la longueur fixe
 */
function generateHardwareId(): string {
  const machineUUID = getMachineUUID();
  const cpuId = getCpuId();
  const diskSerial = getDiskSerial();
  const macAddress = getMacAddress();
  const hostName = hostname();
  const platformName = platform();

  // Combiner les identifiants
  // On utilise plusieurs sources pour plus de robustesse
  // Si un identifiant n'est pas disponible, on utilise les autres
  const components = [
    machineUUID,
    cpuId,
    diskSerial,
    macAddress,
  ].filter(Boolean);

  // S'assurer qu'on a au moins quelques composants
  if (components.length < 2) {
    // Ajouter des fallbacks
    components.push(hostName);
    components.push(platformName);
    components.push(cpus().length.toString());
  }

  // Joindre avec un séparateur et hasher
  const combined = components.join('|POSPLUS|');

  const hash = createHash('sha256').update(combined).digest('hex');

  log.info('Hardware ID generated from components:', {
    hasMachineUUID: !!machineUUID,
    hasCpuId: !!cpuId,
    hasDiskSerial: !!diskSerial,
    hasMacAddress: !!macAddress,
    componentsCount: components.length,
  });

  return hash;
}

/**
 * Collecte toutes les informations matérielles
 */
function collectHardwareInfo(): HardwareInfo {
  const machineUUID = getMachineUUID();
  const cpuId = getCpuId();
  const diskSerial = getDiskSerial();
  const macAddress = getMacAddress();

  return {
    hardwareId: generateHardwareId(),
    machineUUID: machineUUID || undefined,
    cpuId: cpuId || undefined,
    diskSerial: diskSerial || undefined,
    macAddress: macAddress || undefined,
    platform: platform(),
    hostname: hostname(),
  };
}

// ============================================================================
// API PUBLIQUE
// ============================================================================

/**
 * Récupère le Hardware ID de la machine
 * Le résultat est mis en cache pour les appels ultérieurs
 */
export function getHardwareId(): string {
  if (cachedHardwareId === null) {
    cachedHardwareId = generateHardwareId();
  }
  return cachedHardwareId;
}

/**
 * Récupère les informations matérielles complètes
 * Utile pour le support technique et le debugging
 */
export function getHardwareInfo(): HardwareInfo {
  if (cachedHardwareInfo === null) {
    cachedHardwareInfo = collectHardwareInfo();
  }
  return cachedHardwareInfo;
}

/**
 * Force le recalcul du Hardware ID
 * Utile après un changement matériel
 */
export function refreshHardwareId(): string {
  cachedHardwareId = null;
  cachedHardwareInfo = null;
  return getHardwareId();
}

/**
 * Vérifie si un Hardware ID donné correspond à cette machine
 */
export function verifyHardwareId(expectedHwid: string): boolean {
  const currentHwid = getHardwareId();
  return currentHwid === expectedHwid;
}

// Export par défaut pour faciliter l'import
export default {
  get: getHardwareId,
  getInfo: getHardwareInfo,
  refresh: refreshHardwareId,
  verify: verifyHardwareId,
};
