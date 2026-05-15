# Milestone Tracker

## What This Is

里程碑管理系统（Milestone Tracker）——一个 Web 应用，用于管理项目里程碑的创建、AI 拆解、任务跟踪和进度可视化。支持 LLM 流式拆解需求文档为模块和任务，提供看板视图和详情视图。

## Core Value

让 AI agent 和人类用户都能高效地管理项目里程碑生命周期——从创建、拆解、确认、激活到完成。

## Project Shape

- **Complexity:** complex
- **Why:** 跨越 SvelteKit 全栈（API 路由 + SSE 流式 + SQLite + LLM 集成 + 响应式前端），涉及认证、数据库事务、流式解析等多个技术域

## Current State

已部署在生产环境（Windows Server 2019, NSSM 服务管理）。核心功能已实现：
- 里程碑 CRUD（创建、查看、更新，**无删除**）
- LLM 流式拆解（SSE）
- 看板视图 + 详情视图
- 任务状态管理（claim/complete/block/unblock）
- CLI 工具（mt-cli）
- 认证系统（HMAC-SHA256 session token）
- 结构化日志系统
- 部署脚本 + 健康检查

## Architecture / Key Patterns

- **框架:** SvelteKit + adapter-node
- **数据库:** SQLite (better-sqlite3 + drizzle-orm)，WAL 模式，外键 cascade
- **样式:** TailwindCSS 4 (@tailwindcss/vite)
- **LLM:** 原生 fetch + ReadableStream，零外部 SDK 依赖
- **认证:** HMAC-SHA256 stateless session token
- **日志:** 自定义 createLogger 工厂，双输出 stdout+file
- **测试:** Vitest
- **路由模式:** SvelteKit (app) group layout

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: 基础功能 — 里程碑 CRUD + 看板 + 任务管理
- [x] M002: LLM 拆解 — 流式拆解 + 确认 + 预览编辑
- [x] M003: CLI 工具 — mt-cli 命令行工具 + GSD 集成
- [x] M004: 部署 + 日志 + 安全 — 部署脚本 + 健康检查 + logger + 认证
- [ ] M005: 删除 + 状态确认 + LLM 超时 + 详情页重构 — 安全操作增强 + UX 改进
