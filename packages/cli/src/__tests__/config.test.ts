import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Mock fs before importing config module
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

// Mock os
const MOCK_HOME = 'C:/Users/testuser';
vi.mock('node:os', () => ({
  homedir: () => MOCK_HOME,
}));

const mockedExistsSync = vi.mocked(existsSync);
const mockedReadFileSync = vi.mocked(readFileSync);

describe('config resolution', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.MT_API_KEY;
    mockedExistsSync.mockReturnValue(false);
    mockedReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads .mt-cli.json from cwd when available', async () => {
    const cwdConfig = join(process.cwd(), '.mt-cli.json');
    const configData = JSON.stringify({
      serverUrl: 'http://localhost:5173',
      milestoneId: 'MS-1',
      key: 'test-key-123',
    });

    mockedExistsSync.mockImplementation((p) => p === cwdConfig);
    mockedReadFileSync.mockImplementation((p) => {
      if (p === cwdConfig) return configData;
      throw new Error('ENOENT');
    });

    const { resolveConfig } = await import('../config.js');
    const config = resolveConfig();

    expect(config.serverUrl).toBe('http://localhost:5173');
    expect(config.milestoneId).toBe('MS-1');
    expect(config.apiKey).toBe('test-key-123');
    expect(config.configPath).toBe(cwdConfig);
  });

  it('falls back to ~/.mt-cli.json when cwd config is absent', async () => {
    const homeConfig = join(MOCK_HOME, '.mt-cli.json');
    const configData = JSON.stringify({
      serverUrl: 'http://example.com',
      milestoneId: 'MS-2',
      key: 'home-key',
    });

    mockedExistsSync.mockImplementation((p) => p === homeConfig);
    mockedReadFileSync.mockImplementation((p) => {
      if (p === homeConfig) return configData;
      throw new Error('ENOENT');
    });

    const { resolveConfig } = await import('../config.js');
    const config = resolveConfig();

    expect(config.serverUrl).toBe('http://example.com');
    expect(config.milestoneId).toBe('MS-2');
    expect(config.apiKey).toBe('home-key');
    expect(config.configPath).toBe(homeConfig);
  });

  it('prefers MT_API_KEY env var over config key', async () => {
    process.env.MT_API_KEY = 'env-key-override';
    const cwdConfig = join(process.cwd(), '.mt-cli.json');
    const configData = JSON.stringify({
      serverUrl: 'http://localhost:5173',
      milestoneId: 'MS-1',
      key: 'config-key',
    });

    mockedExistsSync.mockImplementation((p) => p === cwdConfig);
    mockedReadFileSync.mockImplementation((p) => {
      if (p === cwdConfig) return configData;
      throw new Error('ENOENT');
    });

    const { resolveConfig } = await import('../config.js');
    const config = resolveConfig();

    expect(config.apiKey).toBe('env-key-override');
  });

  it('reads .mt-env file for API key when env var is not set', async () => {
    const cwdConfig = join(process.cwd(), '.mt-cli.json');
    const envFile = join(process.cwd(), '.mt-env');
    const configData = JSON.stringify({
      serverUrl: 'http://localhost:5173',
      milestoneId: 'MS-1',
    });

    mockedExistsSync.mockImplementation((p) => p === cwdConfig || p === envFile);
    mockedReadFileSync.mockImplementation((p) => {
      if (p === cwdConfig) return configData;
      if (p === envFile) return 'MT_API_KEY=env-file-key-abc\nOTHER_VAR=value\n';
      throw new Error('ENOENT');
    });

    const { resolveConfig } = await import('../config.js');
    const config = resolveConfig();

    expect(config.apiKey).toBe('env-file-key-abc');
  });

  it('handles quoted values in .mt-env file', async () => {
    const cwdConfig = join(process.cwd(), '.mt-cli.json');
    const envFile = join(process.cwd(), '.mt-env');
    const configData = JSON.stringify({
      serverUrl: 'http://localhost:5173',
      milestoneId: 'MS-1',
    });

    mockedExistsSync.mockImplementation((p) => p === cwdConfig || p === envFile);
    mockedReadFileSync.mockImplementation((p) => {
      if (p === cwdConfig) return configData;
      if (p === envFile) return 'MT_API_KEY="quoted-key-123"\n';
      throw new Error('ENOENT');
    });

    const { resolveConfig } = await import('../config.js');
    const config = resolveConfig();

    expect(config.apiKey).toBe('quoted-key-123');
  });

  it('exits when no config file is found', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    mockedExistsSync.mockReturnValue(false);

    const { resolveConfig } = await import('../config.js');

    expect(() => resolveConfig()).toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('exits when config is missing milestoneId', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    const cwdConfig = join(process.cwd(), '.mt-cli.json');
    const configData = JSON.stringify({ serverUrl: 'http://localhost:5173' });

    mockedExistsSync.mockImplementation((p) => p === cwdConfig);
    mockedReadFileSync.mockImplementation((p) => {
      if (p === cwdConfig) return configData;
      throw new Error('ENOENT');
    });

    const { resolveConfig } = await import('../config.js');

    expect(() => resolveConfig()).toThrow('process.exit');
    exitSpy.mockRestore();
  });

  it('uses explicit config path when provided', async () => {
    const explicitPath = join('C:', 'tmp', 'custom-config.json');
    const configData = JSON.stringify({
      serverUrl: 'http://custom:8080',
      milestoneId: 'MS-99',
      key: 'custom-key',
    });

    mockedExistsSync.mockImplementation((p) => p === explicitPath);
    mockedReadFileSync.mockImplementation((p) => {
      if (p === explicitPath) return configData;
      throw new Error('ENOENT');
    });

    const { resolveConfig } = await import('../config.js');
    const config = resolveConfig(explicitPath);

    expect(config.serverUrl).toBe('http://custom:8080');
    expect(config.milestoneId).toBe('MS-99');
    expect(config.apiKey).toBe('custom-key');
    expect(config.configPath).toBe(explicitPath);
  });

  it('warns and skips malformed JSON config file', async () => {
    const cwdConfig = join(process.cwd(), '.mt-cli.json');
    const homeConfig = join(MOCK_HOME, '.mt-cli.json');
    const goodConfig = JSON.stringify({
      serverUrl: 'http://localhost:5173',
      milestoneId: 'MS-1',
      key: 'home-key',
    });

    mockedExistsSync.mockImplementation((p) => p === cwdConfig || p === homeConfig);
    mockedReadFileSync.mockImplementation((p) => {
      if (p === cwdConfig) return '{ invalid json }';
      if (p === homeConfig) return goodConfig;
      throw new Error('ENOENT');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { resolveConfig } = await import('../config.js');
    const config = resolveConfig();

    // Should fall back to home config
    expect(config.apiKey).toBe('home-key');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('配置文件解析失败'));
    consoleSpy.mockRestore();
  });

  it('exits when no API key is found from any source', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    const cwdConfig = join(process.cwd(), '.mt-cli.json');
    const configData = JSON.stringify({
      serverUrl: 'http://localhost:5173',
      milestoneId: 'MS-1',
    });

    mockedExistsSync.mockImplementation((p) => p === cwdConfig);
    mockedReadFileSync.mockImplementation((p) => {
      if (p === cwdConfig) return configData;
      throw new Error('ENOENT');
    });

    const { resolveConfig } = await import('../config.js');

    expect(() => resolveConfig()).toThrow('process.exit');
    exitSpy.mockRestore();
  });
});
