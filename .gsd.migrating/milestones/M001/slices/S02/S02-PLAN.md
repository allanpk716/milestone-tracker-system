# S02: LLM 流式拆解

**Goal:** 在里程碑详情页点击「拆解」按钮 → 后端调用 OpenAI 兼容 API 分析 sourceMd → SSE 逐模块流式返回 → 前端逐卡片渲染。Zod 校验失败的模块标记错误，已收到的有效模块保留，提示可重试。不写入 DB（S03 处理确认写入）。
**Demo:** 在里程碑详情页点击拆解 → 后端调用 OpenAI 兼容 API → SSE 逐模块流式返回 → 前端逐卡片渲染。Zod 校验失败时已收到的模块保留，提示重试

## Must-Haves

- POST /api/milestones/:id/decompose 返回 SSE 流，逐模块推送
- 每个 SSE event 是一个 Zod 校验后的模块对象（含 tasks 数组）或错误事件
- LLM 输出非 JSON 或格式不对时，已解析的有效模块保留返回，失败模块标记 error
- 里程碑详情页在 status=draft 且有 sourceMd 时显示「拆解」按钮
- 点击后流式渲染模块卡片（名称、描述、任务列表），完成后显示统计
- 里程碑不存在/无 sourceMd/非 draft 状态返回明确的中文错误
- npm test 全部通过，npm run build 无错误

## Proof Level

- This slice proves: integration — 真实 LLM 调用由 mock 测试覆盖，SSE 端到端流由 API 测试验证，前端组件渲染由 build 验证

## Integration Closure

**Upstream surfaces consumed:**
- `src/lib/db/schema.ts` — Milestone/Module/Task 表结构和状态枚举
- `src/lib/server/milestone-service.ts` — getMilestone() 读取 sourceMd
- `src/lib/schemas/common.ts` — milestoneIdSchema 等公共校验器
- `src/hooks.server.ts` — 认证中间件保护 API 路由

**New wiring introduced:**
- `POST /api/milestones/:id/decompose` — SSE 流式拆解端点
- `src/lib/server/llm-client.ts` — 可复用的 LLM 客户端（S03 对比建议也用）
- `src/lib/server/decompose-service.ts` — 拆解业务逻辑（S03 确认时复用）

**What remains before end-to-end:**
- S03: 拆解结果确认写入 DB（创建 Module + Task 记录，激活里程碑）
- S03: LLM 对比建议 API
- S04: 看板视图消费已写入的模块/任务
- S06: 端到端集成验证

## Verification

- Runtime signals: SSE 事件类型 (module / error / done) 提供实时状态；每个 module 事件包含 index 和校验状态
- Inspection surfaces: LLM 请求参数和响应摘要通过 console.info 记录（不记录 API key）；SSE 流在浏览器 Network 面板可见
- Failure visibility: LLM 调用失败（网络/超时/非 200）产生 error SSE 事件，包含阶段信息（connecting / streaming / parsing）和原始错误消息；Zod 校验失败包含字段级 detail
- Redaction constraints: LLM_API_KEY 绝不出现在日志和 SSE 响应中

## Tasks

- [x] **T01: LLM Client, Decompose Schemas & Service with Tests** `est:1.5h`
  创建 LLM 客户端（流式调用 OpenAI 兼容 API）、拆解输出的 Zod Schema、拆解服务（系统提示词 + 增量 JSON 解析 + 逐模块 Zod 校验）。使用 fetch + ReadableStream 而非 openai 包，避免额外依赖。增量解析器追踪花括号深度和字符串/转义状态，从 LLM 流式 JSON 数组中提取完整模块对象。所有核心逻辑通过单元测试验证（mock LLM 响应）。
  - Files: `src/lib/schemas/decompose.ts`, `src/lib/server/llm-client.ts`, `src/lib/server/decompose-service.ts`, `src/lib/server/llm-client.test.ts`, `src/lib/server/decompose-service.test.ts`, `src/lib/schemas/index.ts`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npx vitest run src/lib/server/decompose-service.test.ts src/lib/server/llm-client.test.ts

- [x] **T02: SSE Decompose API Endpoint with Tests** `est:45m`
  创建 POST /api/milestones/:id/decompose 端点，调用 decompose-service 流式返回 SSE。验证里程碑存在、有 sourceMd、状态为 draft。返回 ReadableStream，每个 chunk 是标准 SSE 格式（event: module/error/done + data: JSON）。端点是薄包装层，核心逻辑在 service 中。
  - Files: `src/routes/api/milestones/[id]/decompose/+server.ts`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npx vitest run src/lib/server/decompose-service.test.ts

- [x] **T03: Frontend Streaming Decompose UI** `est:1h`
  在里程碑详情页添加「拆解」按钮和流式模块渲染。使用 fetch + ReadableStream 消费 SSE（因为需要 POST）。模块卡片逐步渲染，完成后显示统计。处理错误状态（toast 提示）和部分结果。
  - Files: `src/lib/client/sse-client.ts`, `src/lib/components/DecomposeStream.svelte`, `src/routes/(app)/milestones/[id]/+page.svelte`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npm run build

## Files Likely Touched

- src/lib/schemas/decompose.ts
- src/lib/server/llm-client.ts
- src/lib/server/decompose-service.ts
- src/lib/server/llm-client.test.ts
- src/lib/server/decompose-service.test.ts
- src/lib/schemas/index.ts
- src/routes/api/milestones/[id]/decompose/+server.ts
- src/lib/client/sse-client.ts
- src/lib/components/DecomposeStream.svelte
- src/routes/(app)/milestones/[id]/+page.svelte
