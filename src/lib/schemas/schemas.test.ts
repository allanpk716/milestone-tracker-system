import { describe, it, expect } from 'vitest';

// ── Milestone schemas ───────────────────────────────────────────────────────

import { createMilestoneSchema, updateMilestoneSchema, milestoneResponseSchema } from './milestone.js';

describe('milestone schemas', () => {
	describe('createMilestoneSchema', () => {
		it('accepts valid input with title only', () => {
			const result = createMilestoneSchema.safeParse({ title: 'First Milestone' });
			expect(result.success).toBe(true);
		});

		it('accepts valid input with all fields', () => {
			const result = createMilestoneSchema.safeParse({
				title: 'Full Milestone',
				sourceMd: '# Spec\nSome content',
				gitUrl: 'https://github.com/org/repo'
			});
			expect(result.success).toBe(true);
		});

		it('accepts empty string for gitUrl', () => {
			const result = createMilestoneSchema.safeParse({
				title: 'No Git',
				gitUrl: ''
			});
			expect(result.success).toBe(true);
		});

		it('rejects missing title', () => {
			const result = createMilestoneSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('rejects empty title', () => {
			const result = createMilestoneSchema.safeParse({ title: '' });
			expect(result.success).toBe(false);
		});

		it('rejects title over 200 characters', () => {
			const result = createMilestoneSchema.safeParse({ title: 'x'.repeat(201) });
			expect(result.success).toBe(false);
		});

		it('rejects invalid gitUrl', () => {
			const result = createMilestoneSchema.safeParse({
				title: 'Bad URL',
				gitUrl: 'not-a-url'
			});
			expect(result.success).toBe(false);
		});

		it('rejects oversized sourceMd (>1MB)', () => {
			const result = createMilestoneSchema.safeParse({
				title: 'Big Source',
				sourceMd: 'x'.repeat(1_048_577)
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-string title', () => {
			const result = createMilestoneSchema.safeParse({ title: 123 });
			expect(result.success).toBe(false);
		});
	});

	describe('updateMilestoneSchema', () => {
		it('accepts partial update with title', () => {
			const result = updateMilestoneSchema.safeParse({ title: 'Updated' });
			expect(result.success).toBe(true);
		});

		it('accepts partial update with status', () => {
			const result = updateMilestoneSchema.safeParse({ status: 'in-progress' });
			expect(result.success).toBe(true);
		});

		it('accepts empty object (no-op update)', () => {
			const result = updateMilestoneSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('rejects invalid status', () => {
			const result = updateMilestoneSchema.safeParse({ status: 'invalid-status' });
			expect(result.success).toBe(false);
		});

		it('rejects non-URL string for gitUrl', () => {
			const result = updateMilestoneSchema.safeParse({ gitUrl: 'not-a-url' });
			expect(result.success).toBe(false);
		});

		it('accepts all valid milestone statuses', () => {
			for (const status of ['draft', 'in-progress', 'completed', 'archived'] as const) {
				expect(updateMilestoneSchema.safeParse({ status }).success).toBe(true);
			}
		});
	});

	describe('milestoneResponseSchema', () => {
		const validResponse = {
			id: 'MS-1',
			title: 'Test',
			sourceMd: null,
			gitUrl: null,
			status: 'draft',
			createdAt: '2025-01-01T00:00:00Z'
		};

		it('accepts valid response', () => {
			expect(milestoneResponseSchema.safeParse(validResponse).success).toBe(true);
		});

		it('rejects invalid ID format', () => {
			expect(
				milestoneResponseSchema.safeParse({ ...validResponse, id: 'INVALID' }).success
			).toBe(false);
		});

		it('rejects invalid status', () => {
			expect(
				milestoneResponseSchema.safeParse({ ...validResponse, status: 'foobar' }).success
			).toBe(false);
		});

		it('rejects missing required fields', () => {
			const { title, ...missing } = validResponse;
			expect(milestoneResponseSchema.safeParse(missing).success).toBe(false);
		});
	});
});

// ── Module schemas ──────────────────────────────────────────────────────────

import { createModuleSchema, updateModuleSchema, moduleResponseSchema } from './module.js';

describe('module schemas', () => {
	describe('createModuleSchema', () => {
		it('accepts valid input', () => {
			const result = createModuleSchema.safeParse({
				milestoneId: 'MS-1',
				name: 'Core Module'
			});
			expect(result.success).toBe(true);
		});

		it('accepts input with all fields', () => {
			const result = createModuleSchema.safeParse({
				milestoneId: 'MS-1',
				name: 'Full Module',
				description: 'A detailed description',
				sortOrder: 5
			});
			expect(result.success).toBe(true);
		});

		it('defaults sortOrder to 0', () => {
			const result = createModuleSchema.parse({
				milestoneId: 'MS-1',
				name: 'Default Order'
			});
			expect(result.sortOrder).toBe(0);
		});

		it('rejects missing milestoneId', () => {
			const result = createModuleSchema.safeParse({ name: 'No Parent' });
			expect(result.success).toBe(false);
		});

		it('rejects invalid milestoneId format', () => {
			const result = createModuleSchema.safeParse({
				milestoneId: 'INVALID',
				name: 'Bad Parent'
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing name', () => {
			const result = createModuleSchema.safeParse({ milestoneId: 'MS-1' });
			expect(result.success).toBe(false);
		});

		it('rejects negative sortOrder', () => {
			const result = createModuleSchema.safeParse({
				milestoneId: 'MS-1',
				name: 'Negative',
				sortOrder: -1
			});
			expect(result.success).toBe(false);
		});

		it('rejects description over 5000 characters', () => {
			const result = createModuleSchema.safeParse({
				milestoneId: 'MS-1',
				name: 'Long Desc',
				description: 'x'.repeat(5001)
			});
			expect(result.success).toBe(false);
		});
	});

	describe('updateModuleSchema', () => {
		it('accepts partial update', () => {
			const result = updateModuleSchema.safeParse({ name: 'Renamed' });
			expect(result.success).toBe(true);
		});

		it('accepts empty object', () => {
			const result = updateModuleSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('rejects invalid status', () => {
			const result = updateModuleSchema.safeParse({ status: 'deployed' });
			expect(result.success).toBe(false);
		});

		it('accepts all valid module statuses', () => {
			for (const status of ['draft', 'in-progress', 'completed'] as const) {
				expect(updateModuleSchema.safeParse({ status }).success).toBe(true);
			}
		});
	});

	describe('moduleResponseSchema', () => {
		const validResponse = {
			id: 'MOD-1-1',
			milestoneId: 'MS-1',
			name: 'Test Module',
			description: null,
			status: 'draft',
			sortOrder: 0
		};

		it('accepts valid response', () => {
			expect(moduleResponseSchema.safeParse(validResponse).success).toBe(true);
		});

		it('rejects invalid ID format', () => {
			expect(
				moduleResponseSchema.safeParse({ ...validResponse, id: 'BAD' }).success
			).toBe(false);
		});
	});
});

// ── Task schemas ────────────────────────────────────────────────────────────

import {
	claimTaskSchema,
	progressTaskSchema,
	completeTaskSchema,
	adminTaskActionSchema,
	updateTaskSchema,
	taskResponseSchema,
	isValidTransition
} from './task.js';

describe('task schemas', () => {
	describe('claimTaskSchema', () => {
		it('accepts valid claim', () => {
			expect(claimTaskSchema.safeParse({ assignee: 'alice' }).success).toBe(true);
		});

		it('rejects empty assignee', () => {
			expect(claimTaskSchema.safeParse({ assignee: '' }).success).toBe(false);
		});

		it('rejects missing assignee', () => {
			expect(claimTaskSchema.safeParse({}).success).toBe(false);
		});
	});

	describe('progressTaskSchema', () => {
		it('accepts progress message', () => {
			expect(
				progressTaskSchema.safeParse({ progressMessage: 'Working on it' }).success
			).toBe(true);
		});

		it('accepts sub count updates', () => {
			expect(progressTaskSchema.safeParse({ subTotal: 10, subDone: 3 }).success).toBe(true);
		});

		it('accepts empty object', () => {
			expect(progressTaskSchema.safeParse({}).success).toBe(true);
		});

		it('rejects subDone exceeding subTotal', () => {
			const result = progressTaskSchema.safeParse({ subTotal: 5, subDone: 10 });
			expect(result.success).toBe(false);
		});

		it('rejects negative subTotal', () => {
			expect(progressTaskSchema.safeParse({ subTotal: -1 }).success).toBe(false);
		});

		it('rejects negative subDone', () => {
			expect(progressTaskSchema.safeParse({ subDone: -1 }).success).toBe(false);
		});
	});

	describe('completeTaskSchema', () => {
		it('accepts completion with commit hash', () => {
			expect(
				completeTaskSchema.safeParse({ commitHash: 'abc1234', progressMessage: 'Done' })
					.success
			).toBe(true);
		});

		it('accepts empty object', () => {
			expect(completeTaskSchema.safeParse({}).success).toBe(true);
		});

		it('rejects oversized commitHash', () => {
			expect(
				completeTaskSchema.safeParse({ commitHash: 'x'.repeat(41) }).success
			).toBe(false);
		});
	});

	describe('adminTaskActionSchema', () => {
		it('accepts valid admin action', () => {
			expect(
				adminTaskActionSchema.safeParse({ status: 'review', progressMessage: 'Checking' })
					.success
			).toBe(true);
		});

		it('rejects invalid status', () => {
			expect(adminTaskActionSchema.safeParse({ status: 'foobar' }).success).toBe(false);
		});

		it('accepts all valid task statuses', () => {
			for (const status of ['todo', 'in-progress', 'blocked', 'review', 'done', 'skipped'] as const) {
				expect(adminTaskActionSchema.safeParse({ status }).success).toBe(true);
			}
		});

		it('accepts assignee field for force release', () => {
			expect(
				adminTaskActionSchema.safeParse({ status: 'todo', assignee: null }).success
			).toBe(true);
		});

		it('accepts assignee string for reassignment', () => {
			expect(
				adminTaskActionSchema.safeParse({ status: 'in-progress', assignee: 'bob' }).success
			).toBe(true);
		});

		it('rejects oversized assignee', () => {
			expect(
				adminTaskActionSchema.safeParse({ status: 'todo', assignee: 'x'.repeat(101) }).success
			).toBe(false);
		});
	});

	describe('updateTaskSchema', () => {
		it('accepts title update', () => {
			expect(updateTaskSchema.safeParse({ title: 'New Title' }).success).toBe(true);
		});

		it('accepts description update', () => {
			expect(updateTaskSchema.safeParse({ description: 'Updated desc' }).success).toBe(true);
		});

		it('accepts null description', () => {
			expect(updateTaskSchema.safeParse({ description: null }).success).toBe(true);
		});

		it('accepts assignee update', () => {
			expect(updateTaskSchema.safeParse({ assignee: 'alice' }).success).toBe(true);
		});

		it('accepts null assignee for clearing', () => {
			expect(updateTaskSchema.safeParse({ assignee: null }).success).toBe(true);
		});

		it('accepts multiple fields', () => {
			expect(
				updateTaskSchema.safeParse({ title: 'X', description: 'Y', assignee: 'Z' }).success
			).toBe(true);
		});

		it('accepts empty object (no-op)', () => {
			expect(updateTaskSchema.safeParse({}).success).toBe(true);
		});

		it('rejects empty title', () => {
			expect(updateTaskSchema.safeParse({ title: '' }).success).toBe(false);
		});

		it('rejects missing title field (empty string)', () => {
			expect(updateTaskSchema.safeParse({ title: '' }).success).toBe(false);
		});

		it('rejects oversized title', () => {
			expect(updateTaskSchema.safeParse({ title: 'x'.repeat(301) }).success).toBe(false);
		});

		it('rejects oversized description', () => {
			expect(updateTaskSchema.safeParse({ description: 'x'.repeat(10001) }).success).toBe(false);
		});

		it('rejects oversized assignee', () => {
			expect(updateTaskSchema.safeParse({ assignee: 'x'.repeat(101) }).success).toBe(false);
		});
	});

	describe('taskResponseSchema', () => {
		const validResponse = {
			id: 'TASK-1',
			shortId: 1,
			moduleId: 'MOD-1-1',
			title: 'Build API',
			description: null,
			references: null,
			status: 'todo',
			assignee: null,
			subTotal: 0,
			subDone: 0,
			progressMessage: null,
			blockedReason: null,
			commitHash: null,
			evidence: null,
			filesTouched: null,
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z',
			reportedAt: null
		};

		it('accepts valid response', () => {
			expect(taskResponseSchema.safeParse(validResponse).success).toBe(true);
		});

		it('rejects invalid ID format', () => {
			expect(
				taskResponseSchema.safeParse({ ...validResponse, id: 'BAD' }).success
			).toBe(false);
		});

		it('rejects invalid moduleId format', () => {
			expect(
				taskResponseSchema.safeParse({ ...validResponse, moduleId: 'BAD' }).success
			).toBe(false);
		});

		it('rejects negative shortId', () => {
			expect(
				taskResponseSchema.safeParse({ ...validResponse, shortId: -1 }).success
			).toBe(false);
		});

		it('accepts all valid task statuses', () => {
			for (const status of ['todo', 'in-progress', 'blocked', 'review', 'done', 'skipped'] as const) {
				expect(
					taskResponseSchema.safeParse({ ...validResponse, status }).success
				).toBe(true);
			}
		});
	});

	describe('isValidTransition', () => {
		it('allows todo → in-progress', () => {
			expect(isValidTransition('todo', 'in-progress')).toBe(true);
		});

		it('allows todo → skipped', () => {
			expect(isValidTransition('todo', 'skipped')).toBe(true);
		});

		it('allows in-progress → blocked', () => {
			expect(isValidTransition('in-progress', 'blocked')).toBe(true);
		});

		it('allows in-progress → review', () => {
			expect(isValidTransition('in-progress', 'review')).toBe(true);
		});

		it('allows review → done', () => {
			expect(isValidTransition('review', 'done')).toBe(true);
		});

		it('allows review → in-progress (rework)', () => {
			expect(isValidTransition('review', 'in-progress')).toBe(true);
		});

		it('blocks todo → done', () => {
			expect(isValidTransition('todo', 'done')).toBe(false);
		});

		it('blocks done → todo', () => {
			expect(isValidTransition('done', 'todo')).toBe(false);
		});

		it('blocks done → in-progress', () => {
			expect(isValidTransition('done', 'in-progress')).toBe(false);
		});

		it('blocks unknown → anything', () => {
			expect(isValidTransition('unknown', 'todo')).toBe(false);
		});
	});
});

// ── Auth schemas ────────────────────────────────────────────────────────────

import { loginRequestSchema, loginResponseSchema } from './auth.js';

describe('auth schemas', () => {
	describe('loginRequestSchema', () => {
		it('accepts valid password', () => {
			expect(loginRequestSchema.safeParse({ password: 'secret123' }).success).toBe(true);
		});

		it('rejects missing password', () => {
			expect(loginRequestSchema.safeParse({}).success).toBe(false);
		});

		it('rejects empty password', () => {
			expect(loginRequestSchema.safeParse({ password: '' }).success).toBe(false);
		});

		it('rejects non-string password', () => {
			expect(loginRequestSchema.safeParse({ password: 123 }).success).toBe(false);
		});
	});

	describe('loginResponseSchema', () => {
		it('accepts valid response', () => {
			expect(loginResponseSchema.safeParse({ token: 'jwt-token-here' }).success).toBe(true);
		});

		it('rejects empty token', () => {
			expect(loginResponseSchema.safeParse({ token: '' }).success).toBe(false);
		});

		it('rejects missing token', () => {
			expect(loginResponseSchema.safeParse({}).success).toBe(false);
		});
	});
});

// ── Common schemas ──────────────────────────────────────────────────────────

import {
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

describe('common schemas', () => {
	describe('paginationQuerySchema', () => {
		it('uses defaults for empty input', () => {
			const result = paginationQuerySchema.parse({});
			expect(result.page).toBe(1);
			expect(result.perPage).toBe(20);
		});

		it('coerces string values', () => {
			const result = paginationQuerySchema.parse({ page: '3', perPage: '50' });
			expect(result.page).toBe(3);
			expect(result.perPage).toBe(50);
		});

		it('rejects zero page', () => {
			expect(paginationQuerySchema.safeParse({ page: 0 }).success).toBe(false);
		});

		it('rejects perPage over 100', () => {
			expect(paginationQuerySchema.safeParse({ perPage: 101 }).success).toBe(false);
		});

		it('rejects negative values', () => {
			expect(paginationQuerySchema.safeParse({ page: -1 }).success).toBe(false);
			expect(paginationQuerySchema.safeParse({ perPage: -1 }).success).toBe(false);
		});
	});

	describe('paginatedResponseSchema', () => {
		it('wraps an item schema', () => {
			const schema = paginatedResponseSchema(milestoneResponseSchema);
			const result = schema.safeParse({
				data: [],
				pagination: { page: 1, perPage: 20, total: 0, totalPages: 0 }
			});
			expect(result.success).toBe(true);
		});

		it('validates items against the item schema', () => {
			const schema = paginatedResponseSchema(milestoneResponseSchema);
			const result = schema.safeParse({
				data: [{ invalid: true }],
				pagination: { page: 1, perPage: 20, total: 1, totalPages: 1 }
			});
			expect(result.success).toBe(false);
		});
	});

	describe('errorResponseSchema', () => {
		it('accepts error without details', () => {
			expect(
				errorResponseSchema.safeParse({
					error: { code: 'NOT_FOUND', message: 'Resource not found' }
				}).success
			).toBe(true);
		});

		it('accepts error with field details', () => {
			expect(
				errorResponseSchema.safeParse({
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Invalid input',
						details: [{ field: 'title', message: 'Required' }]
					}
				}).success
			).toBe(true);
		});

		it('rejects missing error object', () => {
			expect(errorResponseSchema.safeParse({}).success).toBe(false);
		});
	});

	describe('fieldErrorSchema', () => {
		it('accepts valid field error', () => {
			expect(fieldErrorSchema.safeParse({ field: 'title', message: 'Required' }).success).toBe(
				true
			);
		});

		it('rejects missing fields', () => {
			expect(fieldErrorSchema.safeParse({ field: 'title' }).success).toBe(false);
		});
	});

	describe('ID format schemas', () => {
		it('milestoneIdSchema validates MS-{seq}', () => {
			expect(milestoneIdSchema.safeParse('MS-1').success).toBe(true);
			expect(milestoneIdSchema.safeParse('MS-999').success).toBe(true);
			expect(milestoneIdSchema.safeParse('ms-1').success).toBe(false);
			expect(milestoneIdSchema.safeParse('MS').success).toBe(false);
			expect(milestoneIdSchema.safeParse('MS-').success).toBe(false);
			expect(milestoneIdSchema.safeParse('MS-1a').success).toBe(false);
		});

		it('moduleIdSchema validates MOD-{ms_seq}-{seq}', () => {
			expect(moduleIdSchema.safeParse('MOD-1-1').success).toBe(true);
			expect(moduleIdSchema.safeParse('MOD-99-10').success).toBe(true);
			expect(moduleIdSchema.safeParse('mod-1-1').success).toBe(false);
			expect(moduleIdSchema.safeParse('MOD-1').success).toBe(false);
			expect(moduleIdSchema.safeParse('MOD-1-').success).toBe(false);
		});

		it('taskIdSchema validates TASK-{seq}', () => {
			expect(taskIdSchema.safeParse('TASK-1').success).toBe(true);
			expect(taskIdSchema.safeParse('TASK-999').success).toBe(true);
			expect(taskIdSchema.safeParse('task-1').success).toBe(false);
			expect(taskIdSchema.safeParse('TASK').success).toBe(false);
			expect(taskIdSchema.safeParse('TASK-').success).toBe(false);
		});
	});

	describe('sourceMdSchema', () => {
		it('accepts normal content', () => {
			expect(sourceMdSchema.safeParse('# Spec\nSome content').success).toBe(true);
		});

		it('accepts content at exactly 1MB', () => {
			expect(sourceMdSchema.safeParse('x'.repeat(SOURCE_MD_MAX_BYTES)).success).toBe(true);
		});

		it('rejects content over 1MB', () => {
			expect(sourceMdSchema.safeParse('x'.repeat(SOURCE_MD_MAX_BYTES + 1)).success).toBe(
				false
			);
		});
	});
});

// ── Barrel export verification ──────────────────────────────────────────────

import * as schemas from './index.js';

describe('barrel exports', () => {
	it('exports all milestone schemas', () => {
		expect(schemas.createMilestoneSchema).toBeDefined();
		expect(schemas.updateMilestoneSchema).toBeDefined();
		expect(schemas.milestoneResponseSchema).toBeDefined();
	});

	it('exports all module schemas', () => {
		expect(schemas.createModuleSchema).toBeDefined();
		expect(schemas.updateModuleSchema).toBeDefined();
		expect(schemas.moduleResponseSchema).toBeDefined();
	});

	it('exports all task schemas', () => {
		expect(schemas.claimTaskSchema).toBeDefined();
		expect(schemas.progressTaskSchema).toBeDefined();
		expect(schemas.completeTaskSchema).toBeDefined();
		expect(schemas.adminTaskActionSchema).toBeDefined();
		expect(schemas.updateTaskSchema).toBeDefined();
		expect(schemas.taskResponseSchema).toBeDefined();
		expect(schemas.isValidTransition).toBeDefined();
	});

	it('exports all auth schemas', () => {
		expect(schemas.loginRequestSchema).toBeDefined();
		expect(schemas.loginResponseSchema).toBeDefined();
	});

	it('exports all common schemas', () => {
		expect(schemas.paginationQuerySchema).toBeDefined();
		expect(schemas.paginatedResponseSchema).toBeDefined();
		expect(schemas.errorResponseSchema).toBeDefined();
		expect(schemas.milestoneIdSchema).toBeDefined();
		expect(schemas.moduleIdSchema).toBeDefined();
		expect(schemas.taskIdSchema).toBeDefined();
	});
});

// ── Types re-export verification ────────────────────────────────────────────

import type {
	CreateMilestoneInput,
	UpdateMilestoneInput,
	MilestoneResponse,
	CreateModuleInput,
	UpdateModuleInput,
	ModuleResponse,
	ClaimTaskInput,
	ProgressTaskInput,
	CompleteTaskInput,
	AdminTaskActionInput,
	UpdateTaskInput,
	TaskResponse,
	LoginRequest,
	LoginResponse,
	PaginationQuery,
	ErrorResponse,
	FieldError
} from '../types.js';

describe('type re-exports from types.ts', () => {
	// This describe block exists to verify the type imports compile.
	// If any type is missing, TypeScript will fail at build time.
	it('all types are importable (compile-time check)', () => {
		// This test passes if the file compiles — the types exist.
		const types: string[] = [
			'CreateMilestoneInput',
			'UpdateMilestoneInput',
			'MilestoneResponse',
			'CreateModuleInput',
			'UpdateModuleInput',
			'ModuleResponse',
			'ClaimTaskInput',
			'ProgressTaskInput',
			'CompleteTaskInput',
			'AdminTaskActionInput',
			'UpdateTaskInput',
			'TaskResponse',
			'LoginRequest',
			'LoginResponse',
			'PaginationQuery',
			'ErrorResponse',
			'FieldError'
		];
		expect(types).toHaveLength(17);
	});
});
