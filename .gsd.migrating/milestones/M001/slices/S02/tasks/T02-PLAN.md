---
estimated_steps: 15
estimated_files: 1
skills_used: []
---

# T02: SSE Decompose API Endpoint with Tests

创建 POST /api/milestones/:id/decompose 端点，调用 decompose-service 流式返回 SSE。验证里程碑存在、有 sourceMd、状态为 draft。返回 ReadableStream，每个 chunk 是标准 SSE 格式（event: module/error/done + data: JSON）。端点是薄包装层，核心逻辑在 service 中。

## Steps

1. 创建 `src/routes/api/milestones/[id]/decompose/+server.ts`
2. POST handler：
   - 从 URL params 获取 milestone ID，用 getMilestone() 查询
   - 验证里程碑存在（404）、有 sourceMd（400）、状态为 draft（400）
   - 调用 streamDecompose(db, milestone) 获取 AsyncGenerator
   - 构建 ReadableStream：遍历 generator，将每个 DecomposeEvent 序列化为 SSE 格式（event: xxx\ndata: JSON\n\n）
   - 返回 new Response(stream, { headers: {'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'} })
3. 编写端点测试：mock decompose-service，验证 SSE 输出格式、错误状态码（404/400）、SSE 事件序列

## Must-Haves

- [ ] SSE 响应头正确（Content-Type: text/event-stream）
- [ ] 三种事件类型：module（有效模块）、error（校验/解析失败）、done（完成统计）
- [ ] 非法前置条件返回 JSON 错误（不是 SSE）
- [ ] 测试通过

## Inputs

- `src/lib/server/decompose-service.ts`
- `src/lib/server/milestone-service.ts`
- `src/lib/schemas/decompose.ts`
- `src/hooks.server.ts`
- `src/routes/api/milestones/[id]/+server.ts`

## Expected Output

- `src/routes/api/milestones/[id]/decompose/+server.ts`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npx vitest run src/lib/server/decompose-service.test.ts
