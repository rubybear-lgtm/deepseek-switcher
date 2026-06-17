#!/usr/bin/env node

import { launchWithProvider } from './launcher.js';

launchWithProvider('deepseek').catch((err) => {
  console.error('An unexpected error occurred in deepclaude launcher:', err);
  process.exit(1);
});
