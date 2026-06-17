import fs from 'fs';
import path from 'path';
import os from 'os';
import * as p from '@clack/prompts';
import pc from 'picocolors';

const homeDir = os.homedir();
export const CLAUDE_SETTINGS_PATH = path.join(homeDir, '.claude', 'settings.json');
export const SWITCHER_CONFIG_DIR = path.join(homeDir, '.config', 'deepseek-switcher');
export const SWITCHER_CONFIG_PATH = path.join(SWITCHER_CONFIG_DIR, 'config.json');

// Shared list of Claude Code env vars managed by this tool
export const CLAUDE_KEYS_TO_CLEAN = [
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'CLAUDE_CODE_SUBAGENT_MODEL',
  'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
  'CLAUDE_CODE_EFFORT_LEVEL'
];

// Provider registry — single source of truth for all provider-specific config
export const PROVIDER_REGISTRY = {
  anthropic: {
    label: 'Anthropic (Default)',
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/anthropic',
    models: {
      main: 'deepseek-v4-pro[1m]',
      flash: 'deepseek-v4-flash[1m]',
    },
    effort: 'max',
    disableNonessential: true,
  },
};

// Default switcher configuration
const DEFAULT_SWITCHER_CONFIG = {
  activeProvider: 'anthropic',
  apiKeys: {
    deepseek: ''
  }
};

/**
 * Get the display label for a provider name
 * @param {string} name
 * @returns {string}
 */
export function getProviderLabel(name) {
  const entry = PROVIDER_REGISTRY[name];
  return entry ? entry.label : 'Unknown';
}

/**
 * Get Claude settings from ~/.claude/settings.json
 * @returns {object}
 */
export function getClaudeSettings() {
  try {
    if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
      const data = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    // If parsing fails, return empty object
  }
  return {};
}

/**
 * Save settings to ~/.claude/settings.json
 * @param {object} settings
 */
export function saveClaudeSettings(settings) {
  try {
    const dir = path.dirname(CLAUDE_SETTINGS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving Claude settings:', error.message);
    return false;
  }
}

/**
 * Get deepseek-switcher config from ~/.config/deepseek-switcher/config.json
 * @returns {object}
 */
export function getSwitcherConfig() {
  try {
    if (fs.existsSync(SWITCHER_CONFIG_PATH)) {
      const data = fs.readFileSync(SWITCHER_CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(data);
      // Merge with defaults to ensure all fields exist
      return {
        ...DEFAULT_SWITCHER_CONFIG,
        ...parsed,
        apiKeys: { ...DEFAULT_SWITCHER_CONFIG.apiKeys, ...parsed.apiKeys }
      };
    }
  } catch (error) {
    // Suppress errors and return default
  }
  return { ...DEFAULT_SWITCHER_CONFIG };
}

/**
 * Save switcher configuration
 * @param {object} config
 */
export function saveSwitcherConfig(config) {
  try {
    if (!fs.existsSync(SWITCHER_CONFIG_DIR)) {
      fs.mkdirSync(SWITCHER_CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(SWITCHER_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving switcher configuration:', error.message);
    return false;
  }
}

/**
 * Ensure an API key is available for the given provider.
 * Prompts the user interactively if not already saved.
 * @param {string} providerName — key into PROVIDER_REGISTRY and apiKeys
 * @param {object} [opts]
 * @param {string} [opts.introBanner] — override the intro banner text
 * @param {string} [opts.successMessage] — message shown after saving
 * @returns {Promise<string>} the API key
 */
export async function ensureApiKey(providerName, opts = {}) {
  const config = getSwitcherConfig();
  const existingKey = config.apiKeys[providerName];

  if (existingKey) return existingKey;

  const label = getProviderLabel(providerName);

  if (opts.introBanner) {
    p.intro(pc.cyan(opts.introBanner));
  }

  const key = await p.password({
    message: `${label} API Key is not set. Please enter your key to continue:`,
    validate(val) {
      if (!val) return 'API Key is required!';
    }
  });

  if (p.isCancel(key)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }

  config.apiKeys[providerName] = key;
  saveSwitcherConfig(config);

  if (opts.successMessage) {
    p.outro(opts.successMessage);
  }

  return key;
}

/**
 * Clean up generated environment files (from legacy versions)
 */
export function removeEnvFiles() {
  try {
    const envSh = path.join(SWITCHER_CONFIG_DIR, 'env.sh');
    const envFish = path.join(SWITCHER_CONFIG_DIR, 'env.fish');
    if (fs.existsSync(envSh)) fs.unlinkSync(envSh);
    if (fs.existsSync(envFish)) fs.unlinkSync(envFish);
  } catch (e) {
    // Ignore error
  }
}
