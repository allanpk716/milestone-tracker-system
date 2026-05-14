import type { Command } from 'commander';
import type { ResolvedConfig } from '../config.js';
import { MtClient } from '../client.js';
import type { TaskResponse } from '../types.js';
import { parseTaskId, resolveTaskId } from '../utils/id.js';
import { outputJson, outputJsonError } from '../utils/json-output.js';

export function registerUnblockCommand(
  tasksGroup: Command,
  getConfig: () => ResolvedConfig,
): void {
  tasksGroup
    .command('unblock <taskId>')
    .description('解除任务阻塞')
    .option('--message <text>', '解除阻塞说明')
    .option('--json', '以 JSON 格式输出')
    .action(async (taskId: string, opts: { message?: string; json?: boolean }) => {
      const config = getConfig();
      const client = new MtClient({ baseUrl: config.serverUrl, apiKey: config.apiKey });

      try {
        const parsed = parseTaskId(taskId);
        const fullId = await resolveTaskId(parsed, () =>
          client.get<TaskResponse[]>(`/api/tasks?milestoneId=${encodeURIComponent(config.milestoneId)}`),
        );

        const body: Record<string, unknown> = {};
        if (opts.message) body.message = opts.message;

        const result = await client.post<TaskResponse>(`/api/tasks/${encodeURIComponent(fullId)}/unblock`, body);

        if (opts.json) {
          outputJson(result);
          return;
        }

        console.log(`✓ 已解除阻塞 #${result.shortId}「${result.title}」`);
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
