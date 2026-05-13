import type { Command } from 'commander';
import type { ResolvedConfig } from '../config.js';
import { MtClient } from '../client.js';
import type { TaskResponse } from '../types.js';
import { parseTaskId, resolveTaskId } from '../utils/id.js';
import { statusLabel, progressBar, formatDate, divider } from '../utils/format.js';

/**
 * Resolve #N references in a description string.
 * Replaces each #N with a summary line from the task list.
 */
function resolveDescriptionReferences(
  description: string,
  allTasks: TaskResponse[],
): string {
  return description.replace(/#(\d+)/g, (match, numStr) => {
    const shortId = parseInt(numStr, 10);
    const ref = allTasks.find((t) => t.shortId === shortId);
    if (!ref) {
      return `${match} (引用的任务不存在)`;
    }
    return `${match} [${ref.title}] (${statusLabel(ref.status)})`;
  });
}

export function registerShowCommand(
  tasksGroup: Command,
  getConfig: () => ResolvedConfig,
): void {
  tasksGroup
    .command('show <taskId>')
    .description('查看任务详情')
    .action(async (taskId: string) => {
      const config = getConfig();
      const client = new MtClient({ baseUrl: config.serverUrl, apiKey: config.apiKey });

      try {
        const parsed = parseTaskId(taskId);
        const fullId = await resolveTaskId(parsed, () =>
          client.get<TaskResponse[]>(`/api/tasks?milestoneId=${encodeURIComponent(config.milestoneId)}`),
        );

        // Fetch task detail
        const task = await client.get<TaskResponse>(`/api/tasks/${encodeURIComponent(fullId)}`);

        // Fetch all tasks for inline reference resolution
        const allTasks = await client.get<TaskResponse[]>(
          `/api/tasks?milestoneId=${encodeURIComponent(config.milestoneId)}`,
        );

        console.log('');
        console.log(divider('═', 40));
        console.log(`  #${task.shortId}  ${task.title}`);
        console.log(divider('═', 40));
        console.log('');
        console.log(`  ID:         ${task.id}`);
        console.log(`  模块:       ${task.moduleId}`);
        console.log(`  状态:       ${statusLabel(task.status)}`);
        console.log(`  负责人:     ${task.assignee || '(未分配)'}`);
        console.log('');

        if (task.subTotal > 0) {
          console.log(`  进度:       ${progressBar(task.subDone, task.subTotal)} (${task.subDone}/${task.subTotal})`);
          console.log('');
        }

        if (task.description) {
          const resolved = resolveDescriptionReferences(task.description, allTasks);
          console.log(divider('─', 40));
          console.log('  描述:');
          console.log('');
          // Indent description lines
          for (const line of resolved.split('\n')) {
            console.log(`    ${line}`);
          }
          console.log('');
        }

        if (task.references) {
          console.log(divider('─', 40));
          console.log(`  引用: ${task.references}`);
          console.log('');
        }

        if (task.progressMessage) {
          console.log(divider('─', 40));
          console.log('  进度说明:');
          console.log(`    ${task.progressMessage}`);
          console.log('');
        }

        if (task.commitHash) {
          console.log(`  Git 提交:   ${task.commitHash}`);
        }

        console.log('');
        console.log(divider('─', 40));
        console.log(`  创建时间:   ${formatDate(task.createdAt)}`);
        console.log(`  更新时间:   ${formatDate(task.updatedAt)}`);
        if (task.reportedAt) {
          console.log(`  报告时间:   ${formatDate(task.reportedAt)}`);
        }
        console.log(divider('═', 40));
        console.log('');
      } catch (err) {
        if (err instanceof Error) {
          console.error(err.message);
        }
        process.exit(1);
      }
    });
}
