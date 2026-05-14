import type { Command } from 'commander';
import type { ResolvedConfig } from '../config.js';
import { MtClient } from '../client.js';
import type { TaskResponse } from '../types.js';
import { parseTaskId, resolveTaskId } from '../utils/id.js';
import { outputJson, outputJsonError } from '../utils/json-output.js';

export function registerBlockCommand(
  tasksGroup: Command,
  getConfig: () => ResolvedConfig,
): void {
  tasksGroup
    .command('block <taskId>')
    .description('阻塞一个任务')
    .requiredOption('--reason <text>', '阻塞原因')
    .option('--json', '以 JSON 格式输出')
    .action(async (taskId: string, opts: { reason: string; json?: boolean }) => {
      const config = getConfig();
      const client = new MtClient({ baseUrl: config.serverUrl, apiKey: config.apiKey });

      try {
        const parsed = parseTaskId(taskId);
        const fullId = await resolveTaskId(parsed, () =>
          client.get<TaskResponse[]>(`/api/tasks?milestoneId=${encodeURIComponent(config.milestoneId)}`),
        );

        const result = await client.post<TaskResponse>(`/api/tasks/${encodeURIComponent(fullId)}/block`, {
          reason: opts.reason,
        });

        if (opts.json) {
          outputJson(result);
          return;
        }

        console.log(`✓ 已阻塞 #${result.shortId}「${result.title}」`);
        console.log(`  原因: ${result.blockedReason}`);
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
