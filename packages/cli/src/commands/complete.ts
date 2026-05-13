import type { Command } from 'commander';
import type { ResolvedConfig } from '../config.js';
import { MtClient } from '../client.js';
import type { TaskResponse } from '../types.js';
import { parseTaskId, resolveTaskId } from '../utils/id.js';

export function registerCompleteCommand(
  tasksGroup: Command,
  getConfig: () => ResolvedConfig,
): void {
  tasksGroup
    .command('complete <taskId>')
    .description('完成任务')
    .option('--message <msg>', '完成说明')
    .option('--commit <hash>', '关联的 Git 提交哈希')
    .action(async (taskId: string, opts: { message?: string; commit?: string }) => {
      const config = getConfig();
      const client = new MtClient({ baseUrl: config.serverUrl, apiKey: config.apiKey });

      try {
        const parsed = parseTaskId(taskId);
        const fullId = await resolveTaskId(parsed, () =>
          client.get<TaskResponse[]>(`/api/tasks?milestoneId=${encodeURIComponent(config.milestoneId)}`),
        );

        const body: Record<string, unknown> = {};
        if (opts.message) body.progressMessage = opts.message;
        if (opts.commit) body.commitHash = opts.commit;

        const result = await client.post<TaskResponse>(`/api/tasks/${encodeURIComponent(fullId)}/complete`, body);

        console.log(`✓ 已完成 #${result.shortId}「${result.title}」`);
        console.log(`  状态: 已完成`);
        if (result.commitHash) {
          console.log(`  提交: ${result.commitHash}`);
        }
        if (result.progressMessage) {
          console.log(`  说明: ${result.progressMessage}`);
        }
      } catch (err) {
        if (err instanceof Error) {
          console.error(err.message);
        }
        process.exit(1);
      }
    });
}
