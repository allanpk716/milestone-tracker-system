# Milestone Tracker — 里程碑进度追踪中枢

## What This Is

一个轻量级的里程碑进度追踪中枢。不参与实际开发，只管三件事：里程碑里拆出了什么模块和任务、谁领了什么任务、任务执行到什么程度了。

实际开发由 GSD-2 / Claude Code / Codex 等 Agent 完成，Agent 通过 CLI 上报进度回来。

当前状态：MVP 已完成（M001），具备完整的里程碑创建、LLM 拆解、看板管理、CLI 工具。正在开发部署与运维能力（M002）。

## Core Value

管理员（人）把需求文档扔进去，LLM 拆成模块和任务，AI Agent 通过 CLI 领取和上报，Web 看板实时展示进度——完整的任务分配与追踪闭环。

## Project Shape

- **Complexity:** complex
- **Why:** 全栈应用（SvelteKit + SQLite）+ CLI 工具（Commander.js）+ LLM 集成（SSE 流式）+ 并发控制（乐观锁）+ 远程部署（NSSM Windows 服务），多个运行时边界

## Current State

M001 MVP 已完成并通过验证：336 测试通过，涵盖 SvelteKit Web 应用（含 REST API）、mt-cli 命令行工具、SQLite 数据库。M002 正在开发部署、日志和自动化测试能力。

## Architecture / Key Patterns

- **框架：** SvelteKit 全栈，adapter-node（服务器端渲染）
- **数据库：** SQLite (better-sqlite3) + Drizzle ORM，WAL 模式
- **API：** SvelteKit server routes，Web 和 CLI 共用
- **认证：** Web 端 HMAC-SHA256 cookie session（单管理员，固定密码），CLI 端 Bearer Token
- **LLM：** OpenAI 兼容格式，SSE 流式返回，原生 fetch + ReadableStream
- **数据校验：** Zod Schema，前后端共享，LLM 输出校验
- **CLI：** 同仓库 packages/cli，Commander.js
- **样式：** TailwindCSS 4（@tailwindcss/vite 插件）
- **部署：** 全量推送模式，NSSM Windows 服务管理

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: MVP 核心功能 — 完整的里程碑创建、LLM 拆解、看板管理、CLI 工具闭环
- [ ] M002: 部署、日志与自动化测试 — 自部署能力、结构化日志、E2E 测试、文档体系
