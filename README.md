# Milestone Tracker — 里程碑进度追踪系统

一个轻量级的里程碑进度追踪中枢，用于管理项目里程碑的模块拆解、任务分配和进度追踪。

**系统定位：** 不参与实际开发，只管三件事——里程碑里拆出了什么模块和任务、谁领了什么任务、任务执行到什么程度。实际开发由 GSD-2 / Claude Code / Codex 等 AI Agent 完成，Agent 通过 CLI 上报进度。

## 功能特性

- **里程碑管理** — 创建、导入原始需求文档、状态流转（draft → in-progress → completed → archived）
- **LLM 辅助拆解** — 调用 OpenAI 兼容的 LLM API，将需求文档自动拆解为模块和任务，支持流式预览和编辑
- **需求对比** — LLM 对比原始需求与拆解结果，给出遗漏/优化建议
- **看板视图** — 按任务状态分列展示，支持拖拽排序、任务编辑和上下文操作
- **Agent CLI** — 命令行工具供 AI Agent 领取任务、上报进度、标记完成
- **双认证模式** — Web 端使用密码登录 + 签名 Cookie，Agent 端使用 Bearer API Key

## 文档

| 文档 | 说明 |
|------|------|
| [架构文档](docs/architecture.md) | 系统架构、认证机制、数据库设计、LLM 集成、前端组件和 CLI 架构 |
| [开发注意事项](docs/development-notes.md) | 数据库事务、认证、SvelteKit 配置、LLM 集成等踩坑记录 |
| [部署指南](docs/deployment.md) | Windows 服务器部署、NSSM 服务管理、日志与监控、E2E 测试 |
| [AI Agent 集成指南](docs/agent-integration-guide.md) | 将 Claude Code / Codex / Cursor 等 AI Agent 接入 Milestone Tracker |
| [mt-cli 命令参考](packages/cli/README.md) | CLI 安装、配置、命令参考、JSON 输出格式 |
| [mt-cli GSD 扩展](docs/mt-cli-extension.md) | GSD-2 auto-mode 集成（自动 claim/complete） |
| [系统定义文档](docs/设计输入、需求文档/milestone-tracker-system-spec-2026-05-12.md) | 原始需求和设计规格说明 |

## 快速开始

```bash
# 安装
npm install
cd packages/cli && npm install && cd ../..

# 配置
cp .env.example .env    # 填写 ADMIN_PASSWORD、API_KEYS 等

# 数据库
npm run db:migrate

# 开发
npm run dev
```

## 许可

Private
