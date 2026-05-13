import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DecomposeEvent, DecomposeModule, DecomposeDoneEvent } from '$lib/schemas/decompose.js';

// ── Mock dependencies ───────────────────────────────────────────────────────

const mockGetMilestone = vi.fn();
vi.mock('$lib/server/milestone-service.js', () => ({
	getMilestone: (...args: any[]) => mockGetMilestone(...args)
}));

const mockStreamEvents: DecomposeEvent[] = [];
const mockStreamDecompose = vi.fn();
vi.mock('$lib/server/decompose-service.js', () => ({
	streamDecompose: (...args: any[]) => mockStreamDecompose(...args)
}));

vi.mock('$lib/db/index.js', () => ({
	db: {}
}));

// ── Import handler after mocks ───────────────────────────────────────────────

import { POST } from '../../routes/api/milestones/[id]/decompose/+server.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function createRequest(id: string): Request {
	return new Request(`http://localhost/api/milestones/${id}/decompose`, {
		method: 'POST'
	});
}

/** Read an SSE stream into an array of { event, data } objects. */
async function readSSEStream(response: Response): Promise<Array<{ event: string; data: any }>> {
	const text = await response.text();
	const events: Array<{ event: string; data: any }> = [];

	// Parse SSE format: "event: xxx\ndata: {...}\n\n"
	const blocks = text.split('\n\n').filter((b) => b.trim());
	for (const block of blocks) {
		const lines = block.split('\n');
		let eventType = '';
		let dataStr = '';
		for (const line of lines) {
			if (line.startsWith('event: ')) eventType = line.slice(7).trim();
			if (line.startsWith('data: ')) dataStr = line.slice(6);
		}
		if (eventType && dataStr) {
			events.push({ event: eventType, data: JSON.parse(dataStr) });
		}
	}
	return events;
}

/** Create an async generator from an array of events for mocking. */
function eventsGenerator(events: DecomposeEvent[]): AsyncGenerator<DecomposeEvent> {
	return (async function* () {
		for (const event of events) yield event;
	})();
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/milestones/:id/decompose', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 404 when milestone does not exist', async () => {
		mockGetMilestone.mockResolvedValue(null);

		const response = await POST({
			request: createRequest('MS-999'),
			params: { id: 'MS-999' },
			url: new URL('http://localhost/api/milestones/MS-999/decompose'),
			cookies: {},
			setHeaders: () => {},
			fetch: globalThis.fetch,
			locals: {} as any,
			route: { id: '/api/milestones/[id]/decompose' },
			isDataRequest: false,
			isSubRequest: false,
			depends: () => {},
			getClientAddress: () => '127.0.0.1',
			platform: undefined
		} as any);

		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body.error).toBe('not_found');
	});

	it('returns 400 when milestone has no sourceMd', async () => {
		mockGetMilestone.mockResolvedValue({
			id: 'MS-1',
			title: 'Test',
			sourceMd: null,
			status: 'draft'
		});

		const response = await POST({
			request: createRequest('MS-1'),
			params: { id: 'MS-1' },
			url: new URL('http://localhost/api/milestones/MS-1/decompose'),
			cookies: {},
			setHeaders: () => {},
			fetch: globalThis.fetch,
			locals: {} as any,
			route: { id: '/api/milestones/[id]/decompose' },
			isDataRequest: false,
			isSubRequest: false,
			depends: () => {},
			getClientAddress: () => '127.0.0.1',
			platform: undefined
		} as any);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('bad_request');
		expect(body.message).toContain('no source markdown');
	});

	it('returns 400 when milestone status is not draft', async () => {
		mockGetMilestone.mockResolvedValue({
			id: 'MS-1',
			title: 'Test',
			sourceMd: '# Some markdown',
			status: 'in-progress'
		});

		const response = await POST({
			request: createRequest('MS-1'),
			params: { id: 'MS-1' },
			url: new URL('http://localhost/api/milestones/MS-1/decompose'),
			cookies: {},
			setHeaders: () => {},
			fetch: globalThis.fetch,
			locals: {} as any,
			route: { id: '/api/milestones/[id]/decompose' },
			isDataRequest: false,
			isSubRequest: false,
			depends: () => {},
			getClientAddress: () => '127.0.0.1',
			platform: undefined
		} as any);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('bad_request');
		expect(body.message).toContain('in-progress');
	});

	it('returns SSE stream with correct headers for valid milestone', async () => {
		const mockMilestone = {
			id: 'MS-1',
			title: 'Test',
			sourceMd: '# Test milestone\nSome content',
			status: 'draft'
		};
		mockGetMilestone.mockResolvedValue(mockMilestone);

		const events: DecomposeEvent[] = [
			{ type: 'module', index: 0, module: { name: 'Module 1', tasks: [{ title: 'T1' }] } as DecomposeModule },
			{ type: 'done', total: 1, errors: 0 } as DecomposeDoneEvent
		];
		mockStreamDecompose.mockReturnValue(eventsGenerator(events));

		const response = await POST({
			request: createRequest('MS-1'),
			params: { id: 'MS-1' },
			url: new URL('http://localhost/api/milestones/MS-1/decompose'),
			cookies: {},
			setHeaders: () => {},
			fetch: globalThis.fetch,
			locals: {} as any,
			route: { id: '/api/milestones/[id]/decompose' },
			isDataRequest: false,
			isSubRequest: false,
			depends: () => {},
			getClientAddress: () => '127.0.0.1',
			platform: undefined
		} as any);

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('text/event-stream');
		expect(response.headers.get('Cache-Control')).toBe('no-cache');
		expect(response.headers.get('Connection')).toBe('keep-alive');

		// Verify SSE content
		const sseEvents = await readSSEStream(response);
		expect(sseEvents).toHaveLength(2);
		expect(sseEvents[0].event).toBe('module');
		expect(sseEvents[0].data.index).toBe(0);
		expect(sseEvents[0].data.module.name).toBe('Module 1');
		expect(sseEvents[1].event).toBe('done');
		expect(sseEvents[1].data.total).toBe(1);
	});

	it('streams module, error, and done events in correct order', async () => {
		mockGetMilestone.mockResolvedValue({
			id: 'MS-1',
			title: 'Test',
			sourceMd: '# Content',
			status: 'draft'
		});

		const events: DecomposeEvent[] = [
			{ type: 'module', index: 0, module: { name: 'Valid Module', tasks: [{ title: 'T1' }] } as DecomposeModule },
			{ type: 'error', stage: 'parsing', message: 'Zod validation failed: name: Required' },
			{ type: 'module', index: 1, module: { name: 'Another Module', tasks: [] } as DecomposeModule },
			{ type: 'done', total: 2, errors: 1 } as DecomposeDoneEvent
		];
		mockStreamDecompose.mockReturnValue(eventsGenerator(events));

		const response = await POST({
			request: createRequest('MS-1'),
			params: { id: 'MS-1' },
			url: new URL('http://localhost/api/milestones/MS-1/decompose'),
			cookies: {},
			setHeaders: () => {},
			fetch: globalThis.fetch,
			locals: {} as any,
			route: { id: '/api/milestones/[id]/decompose' },
			isDataRequest: false,
			isSubRequest: false,
			depends: () => {},
			getClientAddress: () => '127.0.0.1',
			platform: undefined
		} as any);

		const sseEvents = await readSSEStream(response);

		expect(sseEvents).toHaveLength(4);
		expect(sseEvents[0].event).toBe('module');
		expect(sseEvents[0].data.index).toBe(0);
		expect(sseEvents[1].event).toBe('error');
		expect(sseEvents[1].data.stage).toBe('parsing');
		expect(sseEvents[1].data.message).toContain('Zod validation failed');
		expect(sseEvents[2].event).toBe('module');
		expect(sseEvents[2].data.index).toBe(1);
		expect(sseEvents[3].event).toBe('done');
		expect(sseEvents[3].data.total).toBe(2);
		expect(sseEvents[3].data.errors).toBe(1);
	});

	it('passes sourceMd to streamDecompose', async () => {
		const mockMilestone = {
			id: 'MS-1',
			title: 'Test',
			sourceMd: '# My milestone content',
			status: 'draft'
		};
		mockGetMilestone.mockResolvedValue(mockMilestone);
		mockStreamDecompose.mockReturnValue(eventsGenerator([
			{ type: 'done', total: 0, errors: 0 } as DecomposeDoneEvent
		]));

		const response = await POST({
			request: createRequest('MS-1'),
			params: { id: 'MS-1' },
			url: new URL('http://localhost/api/milestones/MS-1/decompose'),
			cookies: {},
			setHeaders: () => {},
			fetch: globalThis.fetch,
			locals: {} as any,
			route: { id: '/api/milestones/[id]/decompose' },
			isDataRequest: false,
			isSubRequest: false,
			depends: () => {},
			getClientAddress: () => '127.0.0.1',
			platform: undefined
		} as any);

		await readSSEStream(response);

		expect(mockStreamDecompose).toHaveBeenCalledWith('# My milestone content');
	});

	it('returns JSON error (not SSE) for precondition failures', async () => {
		mockGetMilestone.mockResolvedValue(null);

		const response = await POST({
			request: createRequest('MS-999'),
			params: { id: 'MS-999' },
			url: new URL('http://localhost/api/milestones/MS-999/decompose'),
			cookies: {},
			setHeaders: () => {},
			fetch: globalThis.fetch,
			locals: {} as any,
			route: { id: '/api/milestones/[id]/decompose' },
			isDataRequest: false,
			isSubRequest: false,
			depends: () => {},
			getClientAddress: () => '127.0.0.1',
			platform: undefined
		} as any);

		// Precondition errors should be JSON, not SSE
		expect(response.headers.get('Content-Type')).not.toBe('text/event-stream');
		expect(response.headers.get('Content-Type')).toContain('application/json');
	});

	it('handles stream with all errors gracefully', async () => {
		mockGetMilestone.mockResolvedValue({
			id: 'MS-1',
			title: 'Test',
			sourceMd: '# Bad content',
			status: 'draft'
		});

		const events: DecomposeEvent[] = [
			{ type: 'error', stage: 'parsing', message: 'Zod validation failed: name: Required' },
			{ type: 'error', stage: 'parsing', message: 'JSON parse error' },
			{ type: 'done', total: 0, errors: 2 } as DecomposeDoneEvent
		];
		mockStreamDecompose.mockReturnValue(eventsGenerator(events));

		const response = await POST({
			request: createRequest('MS-1'),
			params: { id: 'MS-1' },
			url: new URL('http://localhost/api/milestones/MS-1/decompose'),
			cookies: {},
			setHeaders: () => {},
			fetch: globalThis.fetch,
			locals: {} as any,
			route: { id: '/api/milestones/[id]/decompose' },
			isDataRequest: false,
			isSubRequest: false,
			depends: () => {},
			getClientAddress: () => '127.0.0.1',
			platform: undefined
		} as any);

		const sseEvents = await readSSEStream(response);
		expect(sseEvents).toHaveLength(3);
		expect(sseEvents[0].event).toBe('error');
		expect(sseEvents[1].event).toBe('error');
		expect(sseEvents[2].event).toBe('done');
		expect(sseEvents[2].data.total).toBe(0);
		expect(sseEvents[2].data.errors).toBe(2);
	});
});
