// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Hello World worker', () => {
	it('responds with Hello World! (unit style)', async () => {
		const request = new IncomingRequest('http://example.com');
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(await response.json()).contain({"message": "Hello World"})
		//.toMatchInlineSnapshot(`{"message": "Hello World"}`);
	});

	it('responds with Hello World! (integration style)', async () => {
		const response = await SELF.fetch('https://example.com');
		expect(await response.json()).contain({"message": "Hello World"});
	});

	it('responds 400 if any fileds are missing', async () => {
		const response = await SELF.fetch('https://example.com/customers', {
			method: "POST",
			body: JSON.stringify({
				name: null
			})
		});
		expect(response.status).toBe(400);
	});

	it('responds success if customer and subscription plan created', async () => {
		const response = await SELF.fetch('https://example.com/subscription-plan', {
			method: "POST",
			body: JSON.stringify({
				"name": "Alpha_t",
				"billing_duration": 30,
				"price": 100
			})
		});

		const {id} = await response.json() as any;


		const response2 = await SELF.fetch('https://example.com/customers', {
			method: "POST",
			body: JSON.stringify({
				"name": "Usama_t",
				"email": "t@test.com",
				"subscription_plan_id": id
			})
		});
		expect(response2.status).toBe(201);
	});
});
