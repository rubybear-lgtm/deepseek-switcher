#!/usr/bin/env node

import { spawn } from 'child_process';
import { getSwitcherConfig, CLAUDE_KEYS_TO_CLEAN, ensureApiKey } from './config.js';
import fs from 'fs';
import { fileURLToPath } from 'url';

export async function launchWithProvider(providerName) {
  const switcherConfig = getSwitcherConfig();
  const activeProvider = providerName || switcherConfig.activeProvider || 'anthropic';

  // Build the custom environment variables based on the selected provider
  const env = { ...process.env };

  // Always clean custom keys before setting new ones
  CLAUDE_KEYS_TO_CLEAN.forEach(k => delete env[k]);

  if (activeProvider === 'deepseek') {
    const apiKey = await ensureApiKey('deepseek', {
      introBanner: 'deepseek-switcher -- launch',
      successMessage: 'Key saved. Launching Claude Code...'
    });

    env.ANTHROPIC_BASE_URL = 'https://api.deepseek.com/anthropic';
    env.ANTHROPIC_API_KEY = apiKey;
    env.ANTHROPIC_MODEL = 'deepseek-v4-pro[1m]';
    env.ANTHROPIC_DEFAULT_OPUS_MODEL = 'deepseek-v4-pro[1m]';
    env.ANTHROPIC_DEFAULT_SONNET_MODEL = 'deepseek-v4-pro[1m]';
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL = 'deepseek-v4-flash[1m]';
    env.CLAUDE_CODE_SUBAGENT_MODEL = 'deepseek-v4-flash[1m]';
    env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
    env.CLAUDE_CODE_EFFORT_LEVEL = 'max';
  }
  // For anthropic: env is already cleaned (no custom keys set)

  // Spawn the real 'claude' command (forwarding all CLI arguments)
  const child = spawn('claude', process.argv.slice(2), {
    env,
    stdio: 'inherit'
  });

  child.on('error', (err) => {
    if (err.code === 'ENOENT') {
      console.error('\nError: "claude" command not found in PATH.');
      console.error('Install Claude Code first:');
      console.error('  npm install -g @anthropic-ai/claude-code\n');
    } else {
      console.error('\nFailed to launch Claude Code:', err.message, '\n');
    }
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

// Execute self if run directly as binary
if (process.argv[1]) {
  const resolvedPath = fs.realpathSync(fileURLToPath(import.meta.url));
  const executedPath = fs.realpathSync(process.argv[1]);
  if (resolvedPath === executedPath) {
    launchWithProvider().catch((err) => {
      console.error('An unexpected error occurred in launcher:', err);
      process.exit(1);
    });
  }
}
