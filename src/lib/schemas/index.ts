export { createMilestoneSchema, updateMilestoneSchema, milestoneResponseSchema } from './milestone.js';
export type { CreateMilestoneInput, UpdateMilestoneInput, MilestoneResponse } from './milestone.js';

export { createModuleSchema, updateModuleSchema, moduleResponseSchema } from './module.js';
export type { CreateModuleInput, UpdateModuleInput, ModuleResponse } from './module.js';

export {
	claimTaskSchema,
	progressTaskSchema,
	completeTaskSchema,
	adminTaskActionSchema,
	updateTaskSchema,
	blockTaskSchema,
	unblockTaskSchema,
	taskResponseSchema,
	isValidTransition
} from './task.js';
export type {
	ClaimTaskInput,
	ProgressTaskInput,
	CompleteTaskInput,
	AdminTaskActionInput,
	UpdateTaskInput,
	BlockTaskInput,
	UnblockTaskInput,
	TaskResponse
} from './task.js';

export { loginRequestSchema, loginResponseSchema } from './auth.js';
export type { LoginRequest, LoginResponse } from './auth.js';

export {
	decomposeModuleSchema,
	decomposeTaskSchema
} from './decompose.js';
export type {
	DecomposeModule,
	DecomposeTask,
	DecomposeEvent,
	DecomposeModuleEvent,
	DecomposeErrorEvent,
	DecomposeDoneEvent
} from './decompose.js';

export {
	paginationQuerySchema,
	paginatedResponseSchema,
	errorResponseSchema,
	fieldErrorSchema,
	milestoneIdSchema,
	moduleIdSchema,
	taskIdSchema,
	sourceMdSchema,
	SOURCE_MD_MAX_BYTES
} from './common.js';
export type {
	PaginationQuery,
	ErrorResponse,
	FieldError
} from './common.js';

export {
	confirmRequestSchema,
	compareRequestSchema,
	confirmModuleResponseSchema
} from './confirm.js';
export type {
	ConfirmRequest,
	ConfirmModule,
	ConfirmTask,
	CompareRequest,
	CompareEvent,
	CompareSuggestionEvent,
	CompareErrorEvent,
	CompareDoneEvent,
	ConfirmModuleResponse
} from './confirm.js';
