---
estimated_steps: 20
estimated_files: 6
skills_used: []
---

# T01: LLM Client, Decompose Schemas & Service with Tests

创建 LLM 客户端（流式调用 OpenAI 兼容 API）、拆解输出的 Zod Schema、拆解服务（系统提示词 + 增量 JSON 解析 + 逐模块 Zod 校验）。使用 fetch + ReadableStream 而非 openai 包，避免额外依赖。增量解析器追踪花括号深度和字符串/转义状态，从 LLM 流式 JSON 数组中提取完整模块对象。所有核心逻辑通过单元测试验证（mock LLM 响应）。

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| OpenAI-compatible API | 返回 error SSE 事件，包含阶段 'connecting' 和错误消息 | 30s 超时，返回 error 事件 | 保留已解析的有效模块，失败部分标记 parse_error |

## Steps

1. 创建 `src/lib/schemas/decompose.ts`：定义 DecomposeModuleSchema（name, description, tasks[]）和 DecomposeTaskSchema（title, description），以及 SSE 事件类型（DecomposeModuleEvent, DecomposeErrorEvent, DecomposeDoneEvent）
2. 创建 `src/lib/server/llm-client.ts`：实现 LlmClient 类，构造函数读取 LLM_API_KEY / LLM_MODEL / LLM_BASE_URL 环境变量，chatCompletionStream() 方法返回 AsyncGenerator<string>，处理 SSE data: 行，提取 content delta
3. 创建 `src/lib/server/decompose-service.ts`：
   - 编写中文系统提示词，指示 LLM 将需求文档拆解为 JSON 数组 [{name, description, tasks: [{title, description}]}]
   - 实现 extractCompleteJsonObjects() 增量 JSON 解析器：追踪花括号深度、字符串状态、转义状态
   - 实现 streamDecompose() 方法：读取 milestone sourceMd → 调用 LlmClient → 增量解析 → 逐模块 Zod 校验 → yield DecomposeEvent
4. 编写 `src/lib/server/llm-client.test.ts`：测试 SSE data: 行解析、content delta 提取、空响应处理
5. 编写 `src/lib/server/decompose-service.test.ts`：测试增量 JSON 解析器（嵌套对象、字符串中花括号、转义字符）、Zod 校验（有效/无效模块）、完整流式拆解流程（mock LLM 返回）
6. 更新 `src/lib/schemas/index.ts` 导出新 schemas

## Must-Haves

- [ ] LlmClient 支持任意 OpenAI 兼容 API（通过 LLM_BASE_URL 配置）
- [ ] 增量 JSON 解析器正确处理嵌套对象和字符串中的特殊字符
- [ ] 每个 Zod 校验失败的模块标记错误但不中断流
- [ ] 所有测试通过

## Inputs

- `src/lib/schemas/common.ts`
- `src/lib/schemas/module.ts`
- `src/lib/schemas/task.ts`
- `src/lib/schemas/index.ts`
- `src/lib/db/schema.ts`
- `.env.example`

## Expected Output

- `src/lib/server/llm-client.ts`
- `src/lib/schemas/decompose.ts`
- `src/lib/server/decompose-service.ts`
- `src/lib/server/llm-client.test.ts`
- `src/lib/server/decompose-service.test.ts`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npx vitest run src/lib/server/decompose-service.test.ts src/lib/server/llm-client.test.ts
