import type { Command } from 'commander';
import type { ResolvedConfig } from '../config.js';
import { MtClient } from '../client.js';
import { divider } from '../utils/format.js';
import { outputJson, outputJsonError } from '../utils/json-output.js';
import type { ModuleResponse } from './modules-list.js';

export function registerModulesShowCommand(
  modulesGroup: Command,
  getConfig: () => ResolvedConfig,
): void {
  modulesGroup
    .command('show <moduleId>')
    .description('查看模块详情')
    .option('--json', '以 JSON 格式输出')
    .action(async (moduleId: string, opts: { json?: boolean }) => {
      const config = getConfig();
      const client = new MtClient({ baseUrl: config.serverUrl, apiKey: config.apiKey });

      try {
        const mod = await client.get<ModuleResponse>(
          `/api/modules/${encodeURIComponent(moduleId)}`,
        );

        if (opts.json) {
          outputJson(mod);
          return;
        }

        const status = formatModuleStatus(mod.status);

        console.log('');
        console.log(divider('═', 40));
        console.log(`  ${mod.id}  ${mod.name}`);
        console.log(divider('═', 40));
        console.log('');
        console.log(`  里程碑:  ${mod.milestoneId}`);
        console.log(`  状态:    ${status}`);
        console.log(`  排序:    ${mod.sortOrder}`);
        if (mod.description) {
          console.log('');
          console.log(divider('─', 40));
          console.log('  描述:');
          for (const line of mod.description.split('\n')) {
            console.log(`    ${line}`);
          }
          console.log('');
        }
        console.log(divider('═', 40));
        console.log('');
      } catch (err) {
        if (opts.json) {
          outputJsonError(err);
        }
        if (err instanceof Error) {
          console.error(err.message);
        }
        process.exit(1);
      }
    });
}

function formatModuleStatus(status: string): string {
  const labels: Record<string, string> = {
    draft: '草稿',
    'in-progress': '进行中',
    completed: '已完成',
  };
  return labels[status] || status;
}
