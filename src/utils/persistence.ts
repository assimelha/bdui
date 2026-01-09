import { resolve, dirname } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import type { SortConfig } from './constants';
import { DEFAULT_SORT_CONFIG } from './constants';

interface BDUIConfig {
  version: string;
  sortConfig: SortConfig;
}

const CONFIG_VERSION = '1.0';

/**
 * Find .beads directory by walking up from current working directory
 */
function findBeadsDir(): string | null {
  let dir = process.cwd();
  const root = '/';

  while (dir !== root) {
    const beadsPath = resolve(dir, '.beads');
    if (existsSync(beadsPath)) {
      return beadsPath;
    }
    dir = dirname(dir);
  }

  return null;
}

/**
 * Get the path to the config file
 */
function getConfigPath(): string | null {
  const beadsDir = findBeadsDir();
  if (!beadsDir) return null;
  return resolve(beadsDir, 'bdui-config.json');
}

/**
 * Load configuration from .beads/bdui-config.json
 */
export function loadConfig(): BDUIConfig {
  const configPath = getConfigPath();

  if (!configPath || !existsSync(configPath)) {
    return {
      version: CONFIG_VERSION,
      sortConfig: DEFAULT_SORT_CONFIG,
    };
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content) as BDUIConfig;

    // Validate version and structure
    if (config.version !== CONFIG_VERSION) {
      console.warn('Config version mismatch, using defaults');
      return {
        version: CONFIG_VERSION,
        sortConfig: DEFAULT_SORT_CONFIG,
      };
    }

    // Merge with defaults in case new fields were added
    return {
      version: CONFIG_VERSION,
      sortConfig: {
        ...DEFAULT_SORT_CONFIG,
        ...config.sortConfig,
      },
    };
  } catch (error) {
    console.error('Failed to load config, using defaults:', error);
    return {
      version: CONFIG_VERSION,
      sortConfig: DEFAULT_SORT_CONFIG,
    };
  }
}

/**
 * Save configuration to .beads/bdui-config.json
 */
export function saveConfig(config: BDUIConfig): boolean {
  const configPath = getConfigPath();

  if (!configPath) {
    console.warn('No .beads directory found, cannot save config');
    return false;
  }

  try {
    const content = JSON.stringify(config, null, 2);
    writeFileSync(configPath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to save config:', error);
    return false;
  }
}

/**
 * Save only the sort configuration
 */
export function saveSortConfig(sortConfig: SortConfig): boolean {
  const config = loadConfig();
  config.sortConfig = sortConfig;
  return saveConfig(config);
}
