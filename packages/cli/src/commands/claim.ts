import type { Command } from 'commander';
import type { ResolvedConfig } from '../config.js';
import { MtClient } from '../client.js';
import type { TaskResponse } from '../types.js';
import { parseTaskId, resolveTaskId } from '../utils/id.js';
import { outputJson, outputJsonError } from '../utils/json-output.js';

export function registerClaimCommand(
  tasksGroup: Command,
  getConfig: () => ResolvedConfig,
): void {
  tasksGroup
    .command('claim <taskId>')
    .description('领取一个任务')
    .option('--agent <name>', 'Agent 名称（默认使用配置中的 agentName）')
    .option('--json', '以 JSON 格式输出')
    .action(async (taskId: string, opts: { agent?: string; json?: boolean }) => {
      const config = getConfig();
      const client = new MtClient({ baseUrl: config.serverUrl, apiKey: config.apiKey });

      const agentName = opts.agent || config.agentName;
      if (!agentName) {
        if (opts.json) {
          outputJsonError(new Error('未指定 Agent 名称。请使用 --agent <name> 或在配置文件中设置 agentName。'));
        }
        console.error('[错误] 未指定 Agent 名称。请使用 --agent <name> 或在配置文件中设置 agentName。');
        process.exit(1);
      }

      try {
        const parsed = parseTaskId(taskId);
        const fullId = await resolveTaskId(parsed, () =>
          client.get<TaskResponse[]>(`/api/tasks?milestoneId=${encodeURIComponent(config.milestoneId)}`),
        );

        const result = await client.post<TaskResponse>(`/api/tasks/${encodeURIComponent(fullId)}/claim`, {
          assignee: agentName,
        });

        if (opts.json) {
          outputJson(result);
          return;
        }

        console.log(`✓ 已领取 #${result.shortId}「${result.title}」`);
        console.log(`  负责人: ${result.assignee}`);
      } catch (err) {
        if (opts.json) {
          outputJsonError(err);
        }
        if (err instanceof Error) {
          const msg = err.message;
          // Check for 409 conflict
          if (msg.includes('409')) {
            console.error(`✗ 领取失败。任务 ${taskId} 已被其他 Agent 领取。`);
            console.error(`  请执行 'mt-cli tasks list --status todo' 查看可用任务。`);
          } else {
            console.error(msg);
          }
        }
        process.exit(1);
      }
    });
}
