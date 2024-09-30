import { Invoice, Customer, SubscriptionPlan } from '../types/entities';
import { sendInvoiceGenerationEmail } from '../utils/email';
import { kvGetSubscription, kvPutInvoice, kvGetCustomer, kvGetAllInvoices } from '../utils/storage';

export async function generateInvoice(env:Env, customerId: string): Promise<any> {
  // Fetch the customer from storage
  const customer: Customer | null = await kvGetCustomer<Customer>(env, customerId);
  if (!customer) {
    return {
      success: false,
      message: "Customer not found"
    }
  }

  // Fetch the subscription plan based on customer's current plan
  const plan: SubscriptionPlan | null = await kvGetSubscription<SubscriptionPlan>(env, customer.subscription_plan_id);
  if (!plan) {
    return {
      success: false,
      message: "SubscriptionPlan not found"
    }
  }

  // Generate a new invoice object
  const invoice: Invoice = {
    id: crypto.randomUUID(),
    customer_id: customer.id,
    amount: plan.price,
    due_date: new Date().toISOString(),
    payment_status: 'generated',
  };

  // Store the invoice in storage
  await kvPutInvoice(env, invoice.id, invoice);

  await sendInvoiceGenerationEmail(customer.email, invoice.id);

  return {
    success: true,
    message: "Invoice generated success"
  }
}

export async function getCustomerInvoices(env:Env, customerId: string) {

  const listResponse = await kvGetAllInvoices(env);

  return findInvoicesByCustomerId(listResponse, customerId);
}

function findInvoicesByCustomerId(invoices: Invoice[], customerId: string) {
  let result: Invoice[] = [];

  invoices.forEach(element => {
    if (element.customer_id === customerId) {
      result.push(element);
    }
  });
  return result;
}

export async function getFailedInvoices(env:Env) {

  const list = await kvGetAllInvoices(env);
  let docs = list.filter(invoice => invoice.payment_status === 'failed');
  return docs;
}
