import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

// ── Types ───────────────────────────────────────────────────────────────────

export interface MtCliConfig {
  serverUrl: string;
  milestoneId: string;
  key?: string;
  agentName?: string;
}

export interface ResolvedConfig extends MtCliConfig {
  apiKey: string;
  configPath: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    console.error(`[警告] 配置文件解析失败: ${filePath}，已跳过`);
    return null;
  }
}

function readEnvFile(dir: string): string | null {
  const envPath = join(dir, '.mt-env');
  try {
    if (!existsSync(envPath)) return null;
    const raw = readFileSync(envPath, 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('MT_API_KEY=')) {
        return trimmed.slice('MT_API_KEY='.length).replace(/^["']|["']$/g, '');
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── Config Resolution ───────────────────────────────────────────────────────

/**
 * Resolve configuration with layered priority:
 * 1. Explicit --config path
 * 2. `.mt-cli.json` in cwd
 * 3. `~/.mt-cli.json` (home directory)
 *
 * API key priority:
 * 1. `MT_API_KEY` environment variable
 * 2. `.mt-env` file in cwd
 * 3. `key` field in config file
 */
export function resolveConfig(configPathOverride?: string): ResolvedConfig {
  let configData: Record<string, unknown> | null = null;
  let usedConfigPath: string | null = null;

  // 1. Try explicit config path
  if (configPathOverride) {
    configData = readJsonFile(configPathOverride);
    if (configData !== null) {
      usedConfigPath = configPathOverride;
    } else {
      console.error(`[错误] 指定的配置文件不存在或格式错误: ${configPathOverride}`);
      process.exit(1);
    }
  }

  // 2. Try cwd .mt-cli.json
  if (configData === null) {
    const cwdConfig = join(process.cwd(), '.mt-cli.json');
    const data = readJsonFile(cwdConfig);
    if (data !== null) {
      configData = data;
      usedConfigPath = cwdConfig;
    }
  }

  // 3. Try ~/.mt-cli.json
  if (configData === null) {
    const homeConfig = join(homedir(), '.mt-cli.json');
    const data = readJsonFile(homeConfig);
    if (data !== null) {
      configData = data;
      usedConfigPath = homeConfig;
    }
  }

  if (configData === null) {
    console.error(
      '[错误] 未找到配置文件。请在项目根目录创建 .mt-cli.json 或在 HOME 目录创建 ~/.mt-cli.json。'
    );
    console.error('[提示] 配置格式: { "serverUrl": "http://localhost:5173", "milestoneId": "MS-1" }');
    process.exit(1);
  }

  // Extract fields with defaults
  const serverUrl = (configData['serverUrl'] as string) || 'http://localhost:5173';
  const milestoneId = configData['milestoneId'] as string;
  const key = configData['key'] as string | undefined;
  const agentName = configData['agentName'] as string | undefined;

  if (!milestoneId) {
    console.error('[错误] 配置文件中缺少必填字段 "milestoneId"。');
    process.exit(1);
  }

  // API key resolution: env → .mt-env file → config key field
  const envKey = process.env['MT_API_KEY'] || null;
  const envFileKey = readEnvFile(process.cwd());
  const apiKey = envKey || envFileKey || key || '';

  if (!apiKey) {
    console.error(
      '[错误] 未找到 API 密钥。请设置环境变量 MT_API_KEY、创建 .mt-env 文件，或在配置文件中添加 "key" 字段。'
    );
    process.exit(1);
  }

  return {
    serverUrl,
    milestoneId,
    key,
    agentName,
    apiKey,
    configPath: usedConfigPath,
  };
}
