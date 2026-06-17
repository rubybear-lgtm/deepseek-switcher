#!/usr/bin/env node

import {
  cmdStatus,
  cmdConfigure,
  cmdSetup,
  cmdClear,
  performSwitch,
  cmdInteractive
} from './commands.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pc from 'picocolors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const args = process.argv.slice(2);
const subcommand = args[0];

function printHelp() {
  console.log(`
  ${pc.cyan(pc.bold('deepseek-switcher'))} - Switch Claude Code API providers
  aliases: ${pc.cyan('dswitch')}

  ${pc.bold('Usage:')}
    ${pc.green('dswitch')}                        Interactive switcher wizard
    ${pc.green('ccode')} [options]                Launch Claude Code with active provider
    ${pc.green('deepclaude')} [options]           Launch Claude Code with DeepSeek (direct)

  ${pc.bold('Subcommands:')}
    ${pc.yellow('dswitch switch [provider]')}      Switch active provider (anthropic, deepseek)
    ${pc.yellow('dswitch status')}               Show active provider and API key status
    ${pc.yellow('dswitch config')}               Configure the DeepSeek API key
    ${pc.yellow('dswitch clear')}                Clear saved API key
    ${pc.yellow('dswitch setup')}                Clean up legacy shell integrations
    ${pc.yellow('dswitch help')}                 Show this help

  Arguments passed to ${pc.green('ccode')} are forwarded directly to Claude Code.
  `);
}

function printVersion() {
  console.log(`deepseek-switcher ${packageJson.version}`);
}

async function main() {
  if (subcommand === 'status') {
    cmdStatus();
  } else if (subcommand === 'config') {
    await cmdConfigure();
  } else if (subcommand === 'clear') {
    await cmdClear();
  } else if (subcommand === 'setup') {
    await cmdSetup();
  } else if (subcommand === 'switch') {
    const provider = args[1];
    if (!provider) {
      await cmdInteractive();
    } else {
      const valid = ['anthropic', 'deepseek'];
      if (!valid.includes(provider.toLowerCase())) {
        console.error(`Error: Invalid provider "${provider}". Choose from: ${valid.join(', ')}`);
        process.exit(1);
      }
      await performSwitch(provider.toLowerCase());
    }
  } else if (subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    printHelp();
  } else if (subcommand === 'version' || subcommand === '--version' || subcommand === '-v') {
    printVersion();
  } else {
    if (args.length === 0) {
      await cmdInteractive();
    } else {
      printHelp();
    }
  }
}

main().catch((err) => {
  console.error('An unexpected error occurred:', err);
  process.exit(1);
});
