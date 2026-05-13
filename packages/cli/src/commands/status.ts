import type { Command } from 'commander';
import type { ResolvedConfig } from '../config.js';
import { MtClient } from '../client.js';

interface MilestoneResponse {
  id: string;
  title: string;
  status: string;
  [key: string]: unknown;
}

export function registerStatusCommand(program: Command, getConfig: () => ResolvedConfig): void {
  program
    .command('status')
    .description('检查服务器连通性和配置状态')
    .action(async () => {
      const config = getConfig();
      const client = new MtClient({
        baseUrl: config.serverUrl,
        apiKey: config.apiKey,
      });

      console.log('╔══════════════════════════════════════╗');
      console.log('║        mt-cli 状态诊断              ║');
      console.log('╚══════════════════════════════════════╝');
      console.log('');
      console.log(`  服务器地址:  ${config.serverUrl}`);
      console.log(`  里程碑 ID:   ${config.milestoneId}`);
      console.log(`  Agent 名称:  ${config.agentName || '(未设置)'}`);
      console.log(`  API 密钥:    ${config.apiKey.slice(0, 4)}${'•'.repeat(Math.max(0, config.apiKey.length - 4))}`);
      console.log(`  配置文件:    ${config.configPath || '(未找到)'}`);
      console.log('');

      // Test server connectivity by fetching the milestone
      try {
        console.log('  正在检查服务器连通性...');
        const milestone = await client.get<MilestoneResponse>(
          `/api/milestones/${encodeURIComponent(config.milestoneId)}`
        );

        console.log('  ✅ 服务器连接成功');
        console.log('');
        console.log(`  里程碑标题:  ${milestone.title}`);
        console.log(`  里程碑状态:  ${milestone.status}`);
        console.log('');
        console.log('[信息] 配置正常，可以开始使用 mt-cli。');
      } catch (err) {
        console.log('  ❌ 服务器连接失败');
        if (err instanceof Error) {
          console.log(`  ${err.message}`);
        }
        console.log('');
        console.log('[建议] 请检查:');
        console.log('  1. 服务器是否运行 (npm run dev)');
        console.log('  2. .mt-cli.json 中的 serverUrl 是否正确');
        console.log('  3. API 密钥是否有效');
        process.exit(1);
      }
    });
}
