# S01: 项目骨架与数据契约

**Goal:** 搭建项目骨架和数据契约层。SvelteKit 应用可启动，SQLite 数据库建表（WAL 模式），Zod Schema 全量定义，管理员登录页可用，里程碑 CRUD API 全通，总览列表页可访问。为后续 S02-S05 提供数据库层、类型定义、认证机制和 API 基础。
**Demo:** SvelteKit 跑起来、DB 建表（WAL 模式）、Zod Schema 全量定义、管理员登录页、里程碑 CRUD API 全通、总览列表页可访问

## Must-Haves

- 1. `npm run dev` 启动无报错，首页可访问
- 2. `npx drizzle-kit push` 成功建表，SQLite WAL 模式生效
- 3. 所有 Zod Schema 导出且 Vitest 单元测试通过（合法输入接受、非法输入拒绝）
- 4. 管理员登录页可登录，cookie session 有效，Bearer Token 认证可用
- 5. `POST /api/milestones` 创建里程碑，`GET /api/milestones` 返回列表，`GET /api/milestones/:id` 返回详情，`PATCH /api/milestones/:id` 更新
- 6. 总览列表页 `/` 展示所有里程碑，点击可跳转详情
- 7. `npm run build` 无错误，`npm test` 全部通过

## Proof Level

- This slice proves: contract — 证明数据库契约、API 契约、认证契约正确建立，端到端可操作

## Integration Closure

- Upstream surfaces consumed: 无（第一个 slice）
- New wiring introduced in this slice: SvelteKit server routes 作为 API 层，Drizzle ORM 连接 SQLite（WAL），cookie + Bearer Token 双重认证中间件，Zod Schema 同时用于 API 校验和类型导出
- What remains before the milestone is truly usable end-to-end: LLM 流式拆解（S02）、看板视图（S04）、CLI 工具（S05）、端到端集成（S06）

## Verification

- Runtime signals: API 请求返回标准 HTTP 状态码，Zod 校验失败返回 400 + 具体字段错误
- Inspection surfaces: `GET /api/milestones` 列表 API，`GET /api/milestones/:id` 详情 API，SQLite 数据库文件可直接查询
- Failure visibility: 认证失败返回 401，Zod 校验失败返回 400 + 详细错误信息，数据库错误返回 500
- Redaction constraints: .env 中 ADMIN_PASSWORD 和 API_KEYS 不可出现在日志或 API 响应中

## Tasks

- [x] **T01: Scaffold SvelteKit project with Drizzle, TailwindCSS, and Vitest** `est:1h`
  Initialize the SvelteKit project skeleton with all core dependencies: SvelteKit (static adapter), Drizzle ORM + better-sqlite3, TailwindCSS 4, Zod, and Vitest for testing. Configure TypeScript strict mode, SvelteKit static adapter, TailwindCSS, Vitest with Svelte testing, and environment variable loading (.env.example). Verify the dev server starts, tests run, and `npm run build` succeeds.
  - Files: `package.json`, `svelte.config.js`, `vite.config.ts`, `drizzle.config.ts`, `src/app.html`, `src/app.css`, `.env.example`, `tsconfig.json`, `vitest.config.ts`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npm install && npm run build && npm test

- [x] **T02: Define Drizzle schema and push DB tables with WAL mode** `est:1.5h`
  Create the Drizzle ORM schema defining Milestone, Module, and Task tables with all fields per spec. Configure SQLite with WAL mode and proper indexes. Include: Milestone (id MS-{seq}, title, source_md, git_url, status enum, created_at), Module (id MOD-{ms}-{seq}, milestone_id FK, name, description, status enum, sort_order), Task (id TASK-{global_seq}, short_id global auto-increment, module_id FK, title, description, references as text/json, status enum with full lifecycle, assignee, sub_total/sub_done, progress_message, timestamps, commit_hash). Add indexes for task queries (status+module_id, status+reported_at). Push schema to SQLite and verify WAL mode is active. Write Vitest tests confirming table creation and basic CRUD operations.
  - Files: `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `drizzle.config.ts`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npx drizzle-kit push && npm test -- --grep "db schema"

- [x] **T03: Define Zod schemas for all API request/response contracts** `est:1.5h`
  Create comprehensive Zod schemas covering all API input/output contracts from the spec. Organize in `src/lib/schemas/`. Include: milestone schemas (create, update, response), module schemas (create, update, response), task schemas (claim, progress, complete, admin action, response with resolved references), auth schemas (login request/response), shared utility schemas (pagination, error response). Export TypeScript types from schemas using `z.infer`. Write Vitest tests verifying each schema accepts valid inputs and rejects invalid inputs (missing fields, wrong types, invalid status transitions, oversized source_md).
  - Files: `src/lib/schemas/milestone.ts`, `src/lib/schemas/module.ts`, `src/lib/schemas/task.ts`, `src/lib/schemas/auth.ts`, `src/lib/schemas/common.ts`, `src/lib/schemas/index.ts`, `src/lib/types.ts`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npm test -- --grep "schema"

- [x] **T04: Implement auth middleware with cookie session and Bearer Token** `est:2h`
  Implement dual authentication: cookie-based session for Web (HttpOnly, signed) and Bearer Token for CLI (static API keys from .env). Create: (1) `src/lib/server/auth.ts` — session management (create/verify/destroy), Bearer Token validation, middleware function that checks both cookie and Authorization header; (2) `src/routes/api/auth/login/+server.ts` — POST login endpoint (validate password from .env ADMIN_PASSWORD, create session cookie); (3) `src/routes/api/auth/logout/+server.ts` — POST logout; (4) `src/routes/login/+page.svelte` — login page with Chinese UI (title: 里程碑管理系统, username/password form, error toast); (5) auth guard hook in `src/hooks.server.ts` — protect /api/* routes (except /api/auth/*) and redirect unauthenticated Web requests to /login. Write tests for: correct login sets cookie, wrong password returns 401, Bearer Token accepted, expired/invalid token returns 401, protected route redirects to login.
  - Files: `src/lib/server/auth.ts`, `src/hooks.server.ts`, `src/routes/api/auth/login/+server.ts`, `src/routes/api/auth/logout/+server.ts`, `src/routes/login/+page.svelte`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npm test -- --grep "auth"

- [x] **T05: Implement Milestone CRUD API and admin action endpoints** `est:2.5h`
  Implement all REST API endpoints for milestone management and task/module operations that S04 and S05 depend on. Create SvelteKit server routes under `src/routes/api/`. Milestone routes: POST /api/milestones (create with source_md, git_url, title, assign MS-{seq} ID), GET /api/milestones (list all), GET /api/milestones/:id (detail with modules+tasks), PATCH /api/milestones/:id (update title/git_url/status). Module routes: GET /api/milestones/:id/modules, PATCH /api/modules/:id, POST /api/milestones/:id/modules (add module). Task routes: GET /api/tasks (query by status/milestone/module), GET /api/tasks/:id (detail with reference resolution), POST /api/tasks/:id/claim (optimistic lock, 409 on conflict), POST /api/tasks/:id/progress, POST /api/tasks/:id/complete, PATCH /api/tasks/:id (admin actions: uat-pass, uat-fail, merge, force-unclaim, reopen, cancel, halt, resume, edit). Use Zod schemas for request validation. Apply auth middleware. Return proper HTTP status codes (200/201/400/401/404/409). Write integration tests covering: full CRUD cycle, status transitions, claim conflict (409), invalid action for current status (400).
  - Files: `src/routes/api/milestones/+server.ts`, `src/routes/api/milestones/[id]/+server.ts`, `src/routes/api/milestones/[id]/modules/+server.ts`, `src/routes/api/modules/[id]/+server.ts`, `src/routes/api/tasks/+server.ts`, `src/routes/api/tasks/[id]/+server.ts`, `src/routes/api/tasks/[id]/claim/+server.ts`, `src/routes/api/tasks/[id]/progress/+server.ts`, `src/routes/api/tasks/[id]/complete/+server.ts`, `src/routes/api/modules/[id]/tasks/+server.ts`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npm test -- --grep "api"

- [x] **T06: Build milestone overview list page and detail page skeleton** `est:2h`
  Create the frontend pages: (1) Root page `src/routes/+page.svelte` — milestone overview list showing all milestones with status badge (draft/active/completed), title, git_url, created_at, and a 'create milestone' button. Each milestone card links to its detail page. (2) Milestone detail page `src/routes/milestones/[id]/+page.svelte` — shows milestone info (title, status, git_url, source_md preview), module list with tasks, status badges, and progress bars. This is a skeleton that will be enhanced by S04 (kanban view) and S02 (decompose). (3) Create milestone dialog/form — a modal or page for creating a new milestone (paste MD, enter title, git_url). All UI in Chinese. Use TailwindCSS for styling. Pages fetch data from the API endpoints. Handle loading states and errors with toast notifications. Verify by running dev server and checking pages render correctly.
  - Files: `src/routes/+page.svelte`, `src/routes/+layout.svelte`, `src/routes/milestones/[id]/+page.svelte`, `src/routes/milestones/create/+page.svelte`, `src/lib/components/MilestoneCard.svelte`, `src/lib/components/StatusBadge.svelte`, `src/lib/components/TaskCard.svelte`, `src/lib/components/ModuleSection.svelte`, `src/lib/components/Toast.svelte`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npm run build

## Files Likely Touched

- package.json
- svelte.config.js
- vite.config.ts
- drizzle.config.ts
- src/app.html
- src/app.css
- .env.example
- tsconfig.json
- vitest.config.ts
- src/lib/db/schema.ts
- src/lib/db/index.ts
- src/lib/schemas/milestone.ts
- src/lib/schemas/module.ts
- src/lib/schemas/task.ts
- src/lib/schemas/auth.ts
- src/lib/schemas/common.ts
- src/lib/schemas/index.ts
- src/lib/types.ts
- src/lib/server/auth.ts
- src/hooks.server.ts
- src/routes/api/auth/login/+server.ts
- src/routes/api/auth/logout/+server.ts
- src/routes/login/+page.svelte
- src/routes/api/milestones/+server.ts
- src/routes/api/milestones/[id]/+server.ts
- src/routes/api/milestones/[id]/modules/+server.ts
- src/routes/api/modules/[id]/+server.ts
- src/routes/api/tasks/+server.ts
- src/routes/api/tasks/[id]/+server.ts
- src/routes/api/tasks/[id]/claim/+server.ts
- src/routes/api/tasks/[id]/progress/+server.ts
- src/routes/api/tasks/[id]/complete/+server.ts
- src/routes/api/modules/[id]/tasks/+server.ts
- src/routes/+page.svelte
- src/routes/+layout.svelte
- src/routes/milestones/[id]/+page.svelte
- src/routes/milestones/create/+page.svelte
- src/lib/components/MilestoneCard.svelte
- src/lib/components/StatusBadge.svelte
- src/lib/components/TaskCard.svelte
- src/lib/components/ModuleSection.svelte
- src/lib/components/Toast.svelte
