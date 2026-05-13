import type { Command } from 'commander';
import type { ResolvedConfig } from '../config.js';
import { MtClient } from '../client.js';
import type { TaskResponse } from '../types.js';
import { statusLabel, taskRow } from '../utils/format.js';

export function registerListCommand(
  tasksGroup: Command,
  getConfig: () => ResolvedConfig,
): void {
  tasksGroup
    .command('list')
    .description('列出所有任务（默认排除已完成和已跳过）')
    .option('--status <status>', '按状态筛选 (todo|in-progress|blocked|review|done|skipped)')
    .action(async (opts: { status?: string }) => {
      const config = getConfig();
      const client = new MtClient({ baseUrl: config.serverUrl, apiKey: config.apiKey });

      try {
        const params = new URLSearchParams({ milestoneId: config.milestoneId });
        // Default filter excludes closed tasks (done, skipped)
        const status = opts.status;
        if (status) {
          params.set('status', status);
        }

        const tasks = await client.get<TaskResponse[]>(`/api/tasks?${params}`);

        if (tasks.length === 0) {
          console.log(`\n  暂无${status ? `状态为「${statusLabel(status)}」的` : ''}任务。\n`);
          return;
        }

        // Default: exclude done/skipped unless explicitly requested
        const filtered = status
          ? tasks
          : tasks.filter((t) => t.status !== 'done' && t.status !== 'skipped');

        if (filtered.length === 0) {
          console.log('\n  所有任务均已完成或跳过。使用 --status all 查看全部。\n');
          return;
        }

        console.log(`\n  共 ${filtered.length} 个任务:\n`);
        for (const task of filtered) {
          console.log(taskRow(task));
          console.log('');
        }
      } catch (err) {
        if (err instanceof Error) {
          console.error(err.message);
        }
        process.exit(1);
      }
    });
}
