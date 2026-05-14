#!/usr/bin/env node

import { Command } from 'commander';
import { resolveConfig } from './config.js';
import { registerStatusCommand } from './commands/status.js';
import { registerListCommand } from './commands/list.js';
import { registerClaimCommand } from './commands/claim.js';
import { registerProgressCommand } from './commands/progress.js';
import { registerCompleteCommand } from './commands/complete.js';
import { registerShowCommand } from './commands/show.js';
import { registerMineCommand } from './commands/mine.js';
import { registerBlockCommand } from './commands/block.js';
import { registerUnblockCommand } from './commands/unblock.js';
import { registerModulesListCommand } from './commands/modules-list.js';
import { registerModulesShowCommand } from './commands/modules-show.js';

const __dirname = new URL('.', import.meta.url).pathname;
// Read version from package.json
let version = '0.1.0';
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pkg = await import('../package.json', { with: { type: 'json' } });
  version = (pkg.default as Record<string, unknown>)?.version as string ?? version;
} catch {
  // fallback version
}

const program = new Command();

program
  .name('mt-cli')
  .description('Milestone Tracker AI Agent CLI — AI Agent 使用的里程碑跟踪命令行工具')
  .version(version, '-v, --version', '显示版本号')
  .option('--config <path>', '指定配置文件路径');

// Lazy config resolution — only resolve when a command needs it
function getConfig() {
  const opts = program.opts<{ config?: string }>();
  return resolveConfig(opts.config);
}

// Register status command (top-level)
registerStatusCommand(program, getConfig);

// Register tasks subcommand group
const tasks = program
  .command('tasks')
  .description('任务管理命令');

registerListCommand(tasks, getConfig);
registerClaimCommand(tasks, getConfig);
registerProgressCommand(tasks, getConfig);
registerCompleteCommand(tasks, getConfig);
registerShowCommand(tasks, getConfig);
registerMineCommand(tasks, getConfig);
registerBlockCommand(tasks, getConfig);
registerUnblockCommand(tasks, getConfig);

// Register modules subcommand group
const modules = program
  .command('modules')
  .description('模块管理命令');

registerModulesListCommand(modules, getConfig);
registerModulesShowCommand(modules, getConfig);

// Parse and execute
program.parse(process.argv);
