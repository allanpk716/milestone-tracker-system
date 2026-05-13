// ── HTTP Error Messages (Chinese) ────────────────────────────────────────────

const STATUS_MESSAGES: Record<number, string> = {
  400: '请求格式错误，请检查请求参数',
  401: 'API 密钥无效或已过期，请检查 MT_API_KEY 或 .mt-env 配置',
  403: '无权限执行此操作',
  404: '请求的资源不存在，请检查 URL 和 ID',
  409: '操作冲突，资源状态已变更，请刷新后重试',
  422: '请求数据验证失败，请检查字段格式',
  429: '请求过于频繁，请稍后重试',
  500: '服务器内部错误，请联系管理员',
  502: '网关错误，服务器暂时不可用',
  503: '服务暂时不可用，请稍后重试',
};

function getStatusMessage(status: number): string {
  return STATUS_MESSAGES[status] || `未知错误 (HTTP ${status})`;
}

function getSuggestion(status: number): string {
  switch (status) {
    case 400:
    case 422:
      return '[建议] 检查请求参数是否符合 API 规范';
    case 401:
      return '[建议] 重新获取 API 密钥或检查 .mt-cli.json 中的 key 配置';
    case 404:
      return '[建议] 使用 mt-cli status 确认服务器地址和里程碑 ID';
    case 409:
      return '[建议] 先查询最新状态 (mt-cli list)，再尝试操作';
    default:
      return '[建议] 稍后重试，或使用 mt-cli status 检查服务器连通性';
  }
}

// ── Error Class ─────────────────────────────────────────────────────────────

export class MtCliError extends Error {
  constructor(
    public readonly status: number,
    public readonly message: string,
    public readonly suggestion: string,
    public readonly url: string,
  ) {
    super(`[错误] HTTP ${status}: ${message}\n${suggestion}`);
    this.name = 'MtCliError';
  }
}

// ── HTTP Client ─────────────────────────────────────────────────────────────

export interface MtClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

export class MtClient {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(opts: MtClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.apiKey = opts.apiKey;
    this.timeoutMs = opts.timeoutMs ?? 10_000;
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Log request on failure
      if (!response.ok) {
        console.error(`[HTTP] ${method} ${url} → ${response.status}`);
      }

      let data: unknown;
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        // Non-JSON response
        if (!response.ok) {
          throw new MtCliError(
            response.status,
            `服务器返回非 JSON 响应: ${text.slice(0, 200)}`,
            getSuggestion(response.status),
            url,
          );
        }
        throw new Error(`[错误] 无法解析服务器响应为 JSON`);
      }

      if (!response.ok) {
        const errData = data as Record<string, unknown>;
        const message =
          (errData['message'] as string) ||
          (errData['error'] as string) ||
          getStatusMessage(response.status);
        throw new MtCliError(response.status, message, getSuggestion(response.status), url);
      }

      return data as T;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof MtCliError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new MtCliError(
          0,
          `请求超时 (${this.timeoutMs}ms)，服务器未响应`,
          '[建议] 检查服务器是否运行，或使用 mt-cli status 测试连通性',
          url,
        );
      }
      if (err instanceof TypeError && (err as Error).message.includes('fetch')) {
        throw new MtCliError(
          0,
          `无法连接到服务器: ${(err as Error).message}`,
          '[建议] 检查 serverUrl 配置和服务器运行状态',
          url,
        );
      }
      throw err;
    }
  }
}
