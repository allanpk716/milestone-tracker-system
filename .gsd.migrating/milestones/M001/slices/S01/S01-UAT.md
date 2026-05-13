# S01: 项目骨架与数据契约 — UAT

**Milestone:** M001
**Written:** 2026-05-12T12:06:46.048Z

# S01 UAT: 项目骨架与数据契约

## UAT Type
Verification UAT — confirms foundational infrastructure, API contracts, and auth mechanisms are correct.

## Preconditions
1. Node.js 18+ installed
2. Working directory is the M001 worktree
3. `.env` configured with `ADMIN_PASSWORD=test123` and `API_KEYS=test-api-key`
4. Dependencies installed (`npm install`)

## Test Cases

### TC-01: 项目构建无错误
1. Run `npm run build`
2. **Expected:** Exit code 0, no error output
3. **Verify:** Both client and server bundles generated in `.svelte-kit/`

### TC-02: 全量测试通过
1. Run `npm test`
2. **Expected:** Exit code 0, all 198 tests pass
3. **Verify:** 7 test files reported, 0 failures

### TC-03: 开发服务器启动
1. Run `npm run dev -- --port 5173`
2. **Expected:** Server starts within 5 seconds on port 5173
3. **Verify:** `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` returns 302 (redirect to login)

### TC-04: 管理员登录页
1. Navigate to `http://localhost:5173/login`
2. **Expected:** Chinese UI login page (title: 里程碑管理系统)
3. **Verify:** Password input and submit button visible

### TC-05: 登录认证
1. POST to `/api/auth/login` with body `{"password":"test123"}`
2. **Expected:** 200 OK with Set-Cookie header containing session token
3. **Verify:** Response body contains `{"success":true}`

### TC-06: 错误密码拒绝
1. POST to `/api/auth/login` with body `{"password":"wrong"}`
2. **Expected:** 401 Unauthorized
3. **Verify:** Response body contains error message

### TC-07: Bearer Token 认证
1. POST to `/api/milestones` with header `Authorization: Bearer test-api-key`
2. **Expected:** 201 Created (or appropriate response for valid auth)
3. **Verify:** Not 401

### TC-08: 未认证 API 访问拒绝
1. GET `/api/milestones` without any auth credentials
2. **Expected:** 401 Unauthorized
3. **Verify:** Response body is JSON with error

### TC-09: 里程碑 CRUD 全流程
1. POST `/api/milestones` with `{"title":"测试里程碑","source_md":"# Test","git_url":"https://github.com/test/repo"}`
2. **Expected:** 201 Created with milestone object, id matching MS-{seq}
3. GET `/api/milestones`
4. **Expected:** 200 OK with array containing the created milestone
5. GET `/api/milestones/{id}`
6. **Expected:** 200 OK with full milestone detail
7. PATCH `/api/milestones/{id}` with `{"title":"更新标题"}`
8. **Expected:** 200 OK with updated milestone

### TC-10: 任务 Claim 并发冲突 (409)
1. Create a milestone, add a module and task
2. POST `/api/tasks/{id}/claim` with assignee "agent-1" → 200 OK
3. POST `/api/tasks/{id}/claim` with assignee "agent-2" → 409 Conflict
4. **Expected:** Second claim returns 409 with Chinese error message

### TC-11: Zod 校验失败返回 400
1. POST `/api/milestones` with empty body `{}`
2. **Expected:** 400 Bad Request with detailed field-level error messages
3. **Verify:** Response contains specific field names (title, source_md)

### TC-12: SQLite WAL 模式
1. Create a database and check `PRAGMA journal_mode`
2. **Expected:** Returns "wal"
3. **Verify:** Data directory auto-created, DB file accessible

### TC-13: 总览列表页
1. Login, then navigate to `http://localhost:5173/`
2. **Expected:** Milestone overview list page renders with status badges
3. **Verify:** "创建里程碑" button visible, milestone cards with Chinese labels

### TC-14: 里程碑详情页
1. Navigate to `http://localhost:5173/milestones/{id}`
2. **Expected:** Detail page shows milestone info, module sections, task cards
3. **Verify:** Status badges, progress indicators render correctly

## Edge Cases Covered
- Wrong password returns 401 (not 500)
- Missing auth returns 401 (not redirect for API routes)
- Invalid JSON body returns 400 with Zod error details
- Claim on already-claimed task returns 409 Conflict
- Oversized source_md (>1MB) rejected by Zod schema

## Not Proven By This UAT
- LLM integration and streaming decompose (S02)
- Kanban view with right-click admin menu (S04)
- CLI tool commands (S05)
- Concurrent load testing with 50+ tasks
- 5万字 MD import performance
