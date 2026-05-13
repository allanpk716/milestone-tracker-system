import type { Command } from 'commander';
import type { ResolvedConfig } from '../config.js';
import { MtClient } from '../client.js';
import type { TaskResponse } from '../types.js';
import { statusLabel, taskRow, progressBar } from '../utils/format.js';

export function registerMineCommand(
  tasksGroup: Command,
  getConfig: () => ResolvedConfig,
): void {
  tasksGroup
    .command('mine')
    .description('查看我领取的任务')
    .option('--agent <name>', 'Agent 名称（默认使用配置中的 agentName）')
    .action(async (opts: { agent?: string }) => {
      const config = getConfig();
      const client = new MtClient({ baseUrl: config.serverUrl, apiKey: config.apiKey });

      const agentName = opts.agent || config.agentName;
      if (!agentName) {
        console.error('[错误] 未指定 Agent 名称。请使用 --agent <name> 或在配置文件中设置 agentName。');
        process.exit(1);
      }

      try {
        const tasks = await client.get<TaskResponse[]>(
          `/api/tasks?milestoneId=${encodeURIComponent(config.milestoneId)}`,
        );

        const myTasks = tasks.filter((t) => t.assignee === agentName);

        if (myTasks.length === 0) {
          console.log(`\n  Agent「${agentName}」暂无已领取的任务。\n`);
          return;
        }

        // Sort: in-progress first, then by shortId
        const sorted = [...myTasks].sort((a, b) => {
          const order: Record<string, number> = { 'in-progress': 0, 'review': 1, 'blocked': 2, 'todo': 3, 'done': 4, 'skipped': 5 };
          const oa = order[a.status] ?? 9;
          const ob = order[b.status] ?? 9;
          if (oa !== ob) return oa - ob;
          return a.shortId - b.shortId;
        });

        console.log(`\n  Agent「${agentName}」共 ${sorted.length} 个任务:\n`);
        for (const task of sorted) {
          const id = `#${task.shortId}`.padEnd(6);
          const status = statusLabel(task.status).padEnd(8);
          const progress = task.subTotal > 0
            ? `  ${progressBar(task.subDone, task.subTotal)}`
            : '';
          console.log(`  ${id} ${status} ${task.title}${progress}`);
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
