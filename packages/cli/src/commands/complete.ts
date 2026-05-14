import type { Command } from 'commander';
import type { ResolvedConfig } from '../config.js';
import { MtClient } from '../client.js';
import type { TaskResponse } from '../types.js';
import { parseTaskId, resolveTaskId } from '../utils/id.js';
import { outputJson, outputJsonError } from '../utils/json-output.js';

/** Verification evidence item submitted by an agent. */
export interface EvidenceItem {
  command: string;
  exitCode: number;
  verdict: 'pass' | 'fail';
}

function parseEvidenceJson(raw: string): EvidenceItem[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('--evidence JSON must be an array');
  return parsed;
}

function parseFilesTouched(raw: string): string[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('--files-touched JSON must be an array');
  return parsed;
}

export function registerCompleteCommand(
  tasksGroup: Command,
  getConfig: () => ResolvedConfig,
): void {
  tasksGroup
    .command('complete <taskId>')
    .description('完成任务')
    .option('--message <msg>', '完成说明')
    .option('--commit <hash>', '关联的 Git 提交哈希')
    .option('--evidence <json>', '验证证据 JSON 数组')
    .option('--files-touched <json>', '修改的文件列表 JSON 数组')
    .option('--json', '以 JSON 格式输出')
    .action(async (taskId: string, opts: {
      message?: string;
      commit?: string;
      evidence?: string;
      filesTouched?: string;
      json?: boolean;
    }) => {
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
        if (opts.evidence) body.evidenceJson = parseEvidenceJson(opts.evidence);
        if (opts.filesTouched) body.filesTouched = parseFilesTouched(opts.filesTouched);

        const result = await client.post<TaskResponse>(`/api/tasks/${encodeURIComponent(fullId)}/complete`, body);

        if (opts.json) {
          outputJson(result);
          return;
        }

        console.log(`✓ 已完成 #${result.shortId}「${result.title}」`);
        console.log(`  状态: 已完成`);
        if (result.commitHash) {
          console.log(`  提交: ${result.commitHash}`);
        }
        if (result.progressMessage) {
          console.log(`  说明: ${result.progressMessage}`);
        }
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
