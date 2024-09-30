/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { createCustomerWithSubscription, getAllCustomers, getCustomer } from './handlers/customer';
import { createSubscriptionPlan, assignSubscription } from './handlers/subscription';
import { generateInvoice, getCustomerInvoices } from './handlers/invoice';
import { processPayment } from './handlers/payment';

import { Hono } from 'hono';
import { reprocessFailedPayments, scheduleRecurringInvoices } from './utils/cron';

export type Env = {
	CUSTOMER_KV: KVNamespace;
	INVOICE_KV: KVNamespace;
	SUBSCRIPTION_KV: KVNamespace;
	PAYMENTS_KV: KVNamespace;
};

const app = new Hono<{ Bindings: Env }>();


/**
 * GET / 
 * it will just return 
 * the status/ping as our app is UP
 */ 

app.get('/', async (c) => {
	return c.json({
		message: "Saas-app is UP"
	});
});


/** POST /customers
 * It is for creation of a customer with subscription.
 * It required following attributes
 * name:string, email:string, subscription_plan_id:string
 * it will return 400 if any of the required filed missed
 * other wise will return success message with code 201
 */ 

app.post('/customers', async (c) => {
	const body = await c.req.json();
	const { name, email, subscription_plan_id } = body;

	if (!name || !email || !subscription_plan_id) {
		return c.json({
			success: false,
			message: 'Missing required fields'
		}, { status: 400 });
	}

	let created = await createCustomerWithSubscription(c.env,
		name,
		email,
		subscription_plan_id);

	if (created.success) {
		return c.json(created, 201);
	} else {
		return c.json(created, 400);
	}
})

/**
 * GET /customers
 * It will return list if all customers with status code 200
 */
app.get('/customers', async (c) => {
	const cursor = c.req.query('cursor');

	let list = await getAllCustomers(c.env, cursor ? cursor : "");

	return c.json({ docs: list.docs, options:list });
})

/**
 * GET /customers/:id
 * it take id as param and will return the customer with status code 200
 */
app.get('/customers/:id', async (c) => {
	const id = c.req.param('id');
	let found = await getCustomer(c.env, id);

	if (!found) {
		return c.json({
			success: false,
			message: 'Customer not found'
		}, { status: 404 });
	}
	return c.json(found, 200);
})

/**
 * POST /subscription-plan
 * This endpoint is used to create a subscription plan
 * It takes following required parameters
 * name:string billing_duration:number price:number
 * It will return 400 if any field is missing
 * Will return status 201 if get success
 */

app.post('/subscription-plan', async (c) => {
	const body = await c.req.json();

	const { name, billing_duration, price } = body;

	if (!name || !billing_duration || !price) {
		return c.json({
			success: false,
			message: 'Missing required fields'
		}, { status: 400 });
	}

	let created = await createSubscriptionPlan(
		c.env,
		name,
		billing_duration,
		price
	);

	return c.json(created, 201);
})

/**
 * POST /subscribe
 * This endpoint will be used to assign a subscription plan to the customer
 * so it needs 2 required params
 * customer_id:string, plan_id:string
 * It will return 400 if any field is missed else will return 201
 */

app.post('/subscribe', async (c) => {
	const body = await c.req.json();

	const { customer_id, plan_id } = body;

	if (!customer_id || !plan_id) {
		return c.json({
			success: false,
			message: 'Missing required fields'
		}, { status: 400 });
	}

	let assign = await assignSubscription(
		c.env,
		customer_id,
		plan_id
	);

	if (assign.success) {
		return c.json(assign, 201);
	} else {
		return c.json(assign, 400);
	}
});

/**
 * POST /invoices
 * It is used to generate/create invoice for the customer
 * It takes customer_id:string as required param and will return 201 in case of success
 */

app.post('/invoices', async (c) => {
	const body = await c.req.json();

	const { customer_id } = body;

	if (!customer_id) {
		return c.json({
			success: false,
			message: 'Missing required fields'
		}, { status: 400 });
	}

	let generated = await generateInvoice(c.env, customer_id);

	if (generated.success) {
		return c.json(generated, 201);
	} else {
		return c.json(generated, 400);
	}
});


/**
 * POST /Payments
 * It will be used to pay for the invoice
 * It required 2 params invoice_id:string, payment_method:string
 * Will return 201 if payment successful
 */

app.post('/payments', async (c) => {

	const { invoice_id, payment_method } = await c.req.json();

	if (!invoice_id || !payment_method) {
		return c.json({
			success: false,
			message: 'Missing required fields'
		}, { status: 400 });
	}

	let payment = await processPayment(c.env, invoice_id, payment_method);

	if (payment.success) {
		return c.json(payment, 201);
	} else {
		return c.json(payment, 400);
	}
});

/**
 * GET /invoices/:customer_id
 * It will return the invoices of the provided customer_id
 * customer_id:string is required parameter.
 */

app.get('/invoices/:customer_id', async (c) => {
	const customerId = c.req.param('customer_id');

	if (!customerId) {
		return c.json({
			success: false,
			message: 'Missing required fields'
		}, { status: 400 });
	}

	const list = await getCustomerInvoices(c.env, customerId);

	return c.json({ docs: list });
});

export default {
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext,
	) {
		switch (controller.cron) {
      case "0 23 * * *":
        // Every day 11pm
        await scheduleRecurringInvoices(env);
        break;
      case "0 0 * * *":
        // Every day 12am
        await reprocessFailedPayments(env);
        break;
    }
		console.log("cron processed");
	},

	fetch: app.fetch,  // Export Hono app as fetch handler for HTTP requests
};

