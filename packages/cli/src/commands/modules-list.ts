import type { Command } from 'commander';
import type { ResolvedConfig } from '../config.js';
import { MtClient } from '../client.js';
import { outputJson, outputJsonError } from '../utils/json-output.js';

export interface ModuleResponse {
  id: string;
  milestoneId: string;
  name: string;
  description: string | null;
  status: 'draft' | 'in-progress' | 'completed';
  sortOrder: number;
}

export function registerModulesListCommand(
  modulesGroup: Command,
  getConfig: () => ResolvedConfig,
): void {
  modulesGroup
    .command('list')
    .description('列出当前里程碑的所有模块')
    .option('--json', '以 JSON 格式输出')
    .action(async (opts: { json?: boolean }) => {
      const config = getConfig();
      const client = new MtClient({ baseUrl: config.serverUrl, apiKey: config.apiKey });

      try {
        const modules = await client.get<ModuleResponse[]>(
          `/api/milestones/${encodeURIComponent(config.milestoneId)}/modules`,
        );

        if (opts.json) {
          outputJson(modules);
          return;
        }

        if (modules.length === 0) {
          console.log('\n  当前里程碑暂无模块。\n');
          return;
        }

        console.log(`\n  共 ${modules.length} 个模块:\n`);
        for (const mod of modules) {
          const status = formatModuleStatus(mod.status);
          const desc = mod.description ? ` — ${mod.description.slice(0, 60)}` : '';
          console.log(`  ${mod.id}  ${mod.name}  [${status}]${desc}`);
        }
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
