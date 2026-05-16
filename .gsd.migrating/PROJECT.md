# Milestone Tracker System

## What This Is

一个里程碑管理 Web 应用，支持从需求文档创建里程碑，通过 AI 将需求拆解为模块和任务，在看板上跟踪进度。面向项目管理者和 AI Agent 协作场景。

## Core Value

AI 驱动的需求拆解 + 任务进度看板 —— 让项目管理者能快速将需求文档转化为可执行、可跟踪的工作项。

## Project Shape

- **Complexity:** complex
- **Why:** 多运行时边界（SvelteKit 前端 + SQLite 后端 + LLM SSE 流），AI 交互模式，状态管理复杂度

## Current State

已完成 M001-M005 五个里程碑：
- MVP 核心功能（里程碑 CRUD、看板、任务管理）
- 部署、日志与自动化测试
- AI Agent CLI 可用性增强
- 交付运维闭环（删除、状态确认、LLM 超时、详情页重构）
- 里程碑删除 + 状态确认 + LLM 超时 + 详情页重构

当前部署在 Windows Server 2019，NSSM 管理 Node.js 服务。

## Architecture / Key Patterns

- **Tech Stack:** SvelteKit + Svelte 5 (runes) + TailwindCSS 4 + Drizzle ORM + better-sqlite3
- **Database:** SQLite (data/tracker.db)，WAL 模式，drizzle-orm schema 定义
- **Auth:** HMAC-SHA256 无状态会话 token，ADMIN_PASSWORD 环境变量
- **LLM:** OpenAI 兼容 SSE 客户端，通过 LLM_API_KEY/LLM_BASE_URL/LLM_MODEL 配置
- **Layout:** (app) 路由组 + 认证 layout，详情页左右分栏
- **Logging:** 自定义 logger 模块，分级双输出 + 7 天轮转
- **Deploy:** 本地构建 + SCP + NSSM 重启 + 健康检查

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: MVP 核心功能 — 里程碑 CRUD、看板、任务管理
- [x] M002: 部署、日志与自动化测试 — 部署脚本、Logger、E2E 测试
- [x] M003: AI Agent 可用性增强 — CLI 工具、API 增强
- [x] M004: 交付运维闭环 — 删除、状态确认、LLM 超时、详情页重构
- [x] M005: 里程碑删除 + 状态确认 + LLM 超时 + 详情页重构 — 侧滑面板删除、AI 警告、分栏布局
- [ ] M006: AI 拆解对话化 + 详情页交互优化 — 多轮对话拆解、提示词管理、目录修复、详情页内确认
