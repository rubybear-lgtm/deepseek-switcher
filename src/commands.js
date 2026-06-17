import {
  getClaudeSettings,
  saveClaudeSettings,
  getSwitcherConfig,
  saveSwitcherConfig,
  removeEnvFiles,
  getProviderLabel,
  CLAUDE_KEYS_TO_CLEAN,
  ensureApiKey
} from './config.js';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import fs from 'fs';
import path from 'path';
import os from 'os';

function handleCancel(val) {
  if (p.isCancel(val)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }
}

function maskKey(key) {
  return '****' + key.slice(-4);
}

function cleanShellConfig(configPath) {
  if (!fs.existsSync(configPath)) return;

  const content = fs.readFileSync(configPath, 'utf8');
  const integrationRegex = /\n*# deepseek-switcher integration start[\s\S]*?# deepseek-switcher integration end\n*/g;

  if (integrationRegex.test(content)) {
    fs.writeFileSync(configPath, content.replace(integrationRegex, '\n'), 'utf8');
  }
}

export function cmdStatus() {
  const switcherConfig = getSwitcherConfig();
  const activeProvider = switcherConfig.activeProvider || 'anthropic';
  const deepseekKey = switcherConfig.apiKeys.deepseek;

  p.intro(pc.cyan('deepseek-switcher -- status'));

  const lines = [
    `${pc.bold('Active Provider:')} ${pc.green(pc.bold(getProviderLabel(activeProvider)))}`,
    '',
    `${pc.bold('Saved Configurations:')}`,
    `  DeepSeek API Key: ${deepseekKey ? pc.green('[+] Configured (' + maskKey(deepseekKey) + ')') : pc.red('[-] Not Configured')}`,
    '',
    `${pc.bold('Launch Commands:')}`,
    `  ${pc.yellow('ccode')} / ${pc.yellow('cld')}    Claude Code with active provider (${getProviderLabel(activeProvider)})`,
    `  ${pc.yellow('claude')}          Claude Code natively with Anthropic`,
    `  ${pc.yellow('deepclaude')}      Claude Code with DeepSeek (direct)`,
    '',
    pc.dim('Configure or switch anytime: dswitch')
  ];

  p.note(lines.join('\n'), 'Configuration');
  p.outro('Happy coding.');
}

export async function cmdConfigure() {
  p.intro(pc.cyan('deepseek-switcher -- configure'));

  const switcherConfig = getSwitcherConfig();

  const currentKey = switcherConfig.apiKeys.deepseek || '';
  const apiKey = await p.password({
    message: `Enter API key for ${pc.green('DeepSeek')}:`,
    placeholder: currentKey ? '**** (Press Enter to keep current key)' : 'Enter key',
    validate(val) {
      if (!val && !currentKey) {
        return 'API Key cannot be empty!';
      }
    }
  });

  handleCancel(apiKey);

  if (apiKey) {
    switcherConfig.apiKeys.deepseek = apiKey;
    saveSwitcherConfig(switcherConfig);
    p.outro(pc.green('DeepSeek API key updated.'));
  } else {
    p.outro(pc.yellow('No changes made.'));
  }
}

export async function cmdClear() {
  p.intro(pc.cyan('deepseek-switcher -- clear'));

  const switcherConfig = getSwitcherConfig();

  const confirmClear = await p.confirm({
    message: 'Are you sure you want to clear your saved DeepSeek API key?',
    initialValue: false
  });

  handleCancel(confirmClear);

  if (confirmClear) {
    switcherConfig.apiKeys.deepseek = '';
    saveSwitcherConfig(switcherConfig);
    p.outro(pc.green('DeepSeek API key cleared.'));
  } else {
    p.outro(pc.yellow('Cancelled.'));
  }
}

export async function performSwitch(providerName) {
  const switcherConfig = getSwitcherConfig();
  const s = p.spinner();

  if (providerName === 'anthropic') {
    s.start('Switching to Anthropic (Default)...');

    switcherConfig.activeProvider = 'anthropic';
    saveSwitcherConfig(switcherConfig);

    s.stop(pc.green('Switched to Anthropic (Default).'));

    p.note(
      `Claude Code has been reset to run normally.\n\n` +
      `Launch with ${pc.cyan('ccode')} or the standard ${pc.cyan('claude')} command.\n\n` +
      `If using an API key, set ${pc.cyan('export ANTHROPIC_API_KEY="..."')} in your shell.`,
      'Anthropic Active'
    );
    return;
  }

  await ensureApiKey(providerName);

  s.start(`Switching to ${getProviderLabel(providerName)}...`);

  switcherConfig.activeProvider = providerName;
  saveSwitcherConfig(switcherConfig);

  s.stop(pc.green(`Switched to ${getProviderLabel(providerName)}.`));

  p.note(
    `${pc.bold('Active Mappings:')}\n` +
    `  Base URL:       ${pc.cyan('https://api.deepseek.com/anthropic')}\n` +
    `  Main Model:     ${pc.cyan('deepseek-v4-pro[1m]')}\n` +
    `  Subagent Model: ${pc.cyan('deepseek-v4-flash[1m]')}\n\n` +
    `Run ${pc.yellow('ccode')} or ${pc.yellow('cld')} to launch Claude Code with DeepSeek.`,
    `${getProviderLabel(providerName)} Active`
  );
}

export async function cmdSetup() {
  p.intro(pc.cyan('deepseek-switcher -- shell cleanup'));

  const s = p.spinner();
  const home = os.homedir();

  s.start('Cleaning ~/.claude/settings.json...');
  const settings = getClaudeSettings();
  if (settings.env) {
    let changed = false;
    CLAUDE_KEYS_TO_CLEAN.forEach(key => {
      if (key in settings.env) {
        delete settings.env[key];
        changed = true;
      }
    });
    if (changed) {
      saveClaudeSettings(settings);
    }
  }
  s.stop(pc.green('~/.claude/settings.json cleaned.'));

  s.start('Removing old switcher script files...');
  removeEnvFiles();
  s.stop(pc.green('Script files cleaned.'));

  s.start('Cleaning Fish shell integrations...');
  const fishFuncPath = path.join(home, '.config', 'fish', 'functions', 'dswitch.fish');
  if (fs.existsSync(fishFuncPath)) {
    fs.unlinkSync(fishFuncPath);
  }
  cleanShellConfig(path.join(home, '.config', 'fish', 'config.fish'));
  s.stop(pc.green('Fish cleaned.'));

  s.start('Cleaning Zsh shell integrations...');
  cleanShellConfig(path.join(home, '.zshrc'));
  s.stop(pc.green('Zsh cleaned.'));

  s.start('Cleaning Bash shell integrations...');
  cleanShellConfig(path.join(home, '.bashrc'));
  s.stop(pc.green('Bash cleaned.'));

  p.note(
    `Shell profiles restored. No shell wrappers are needed.\n\n` +
    `Run Claude Code with: ${pc.cyan('ccode')} or ${pc.cyan('cld')}`,
    'Cleanup Complete'
  );

  p.outro('Done.');
}

export async function cmdInteractive() {
  while (true) {
    p.intro(pc.cyan('deepseek-switcher'));

    const choice = await p.select({
      message: 'What would you like to do?',
      options: [
        { value: 'switch', label: 'Switch Active Provider', hint: 'Change the provider loaded by ccode/cld' },
        { value: 'status', label: 'View Status', hint: 'Check configuration and active settings' },
        { value: 'config', label: 'Configure API Key', hint: 'Add or update the DeepSeek API key' },
        { value: 'clear', label: 'Clear API Key', hint: 'Remove saved key from local storage' },
        { value: 'exit', label: 'Exit' }
      ]
    });

    handleCancel(choice);

    if (choice === 'switch') {
      const selectedProvider = await p.select({
        message: 'Select provider:',
        options: [
          { value: 'anthropic', label: 'Anthropic (Default)', hint: 'Standard Claude Code behavior' },
          { value: 'deepseek', label: 'DeepSeek', hint: 'deepseek-v4 models via DeepSeek API' },
          { value: 'cancel', label: 'Back' }
        ]
      });
      handleCancel(selectedProvider);
      if (selectedProvider !== 'cancel') {
        await performSwitch(selectedProvider);
      }
    } else if (choice === 'status') {
      cmdStatus();
    } else if (choice === 'config') {
      await cmdConfigure();
    } else if (choice === 'clear') {
      await cmdClear();
    } else if (choice === 'exit') {
      p.outro('Happy coding.');
      break;
    }
  }
}
