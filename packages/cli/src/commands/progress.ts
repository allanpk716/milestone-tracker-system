import type { Command } from 'commander';
import type { ResolvedConfig } from '../config.js';
import { MtClient } from '../client.js';
import type { TaskResponse } from '../types.js';
import { parseTaskId, resolveTaskId } from '../utils/id.js';
import { progressBar } from '../utils/format.js';

export function registerProgressCommand(
  tasksGroup: Command,
  getConfig: () => ResolvedConfig,
): void {
  tasksGroup
    .command('progress <taskId>')
    .description('更新任务进度')
    .option('--sub-total <n>', '子任务总数', parseInt)
    .option('--sub-done <n>', '已完成子任务数', parseInt)
    .option('--message <msg>', '进度说明')
    .action(async (taskId: string, opts: { subTotal?: number; subDone?: number; message?: string }) => {
      const config = getConfig();
      const client = new MtClient({ baseUrl: config.serverUrl, apiKey: config.apiKey });

      try {
        const parsed = parseTaskId(taskId);
        const fullId = await resolveTaskId(parsed, () =>
          client.get<TaskResponse[]>(`/api/tasks?milestoneId=${encodeURIComponent(config.milestoneId)}`),
        );

        const body: Record<string, unknown> = {};
        if (opts.message) body.progressMessage = opts.message;
        if (opts.subTotal !== undefined) body.subTotal = opts.subTotal;
        if (opts.subDone !== undefined) body.subDone = opts.subDone;

        const result = await client.post<TaskResponse>(`/api/tasks/${encodeURIComponent(fullId)}/progress`, body);

        console.log(`✓ 已更新 #${result.shortId}「${result.title}」的进度`);
        if (result.subTotal > 0) {
          console.log(`  ${progressBar(result.subDone, result.subTotal)} (${result.subDone}/${result.subTotal})`);
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
