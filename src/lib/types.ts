// ── Re-export inferred types from Zod schemas ────────────────────────────────
// Use these throughout the app instead of re-inferring with z.infer<>

export type { CreateMilestoneInput, UpdateMilestoneInput, MilestoneResponse } from './schemas/milestone.js';
export type { CreateModuleInput, UpdateModuleInput, ModuleResponse } from './schemas/module.js';
export type {
	ClaimTaskInput,
	ProgressTaskInput,
	CompleteTaskInput,
	AdminTaskActionInput,
	UpdateTaskInput,
	TaskResponse
} from './schemas/task.js';
export type { LoginRequest, LoginResponse } from './schemas/auth.js';
export type { PaginationQuery, ErrorResponse, FieldError } from './schemas/common.js';
