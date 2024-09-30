import { getAllCustomers, getCustomer } from "../handlers/customer";
import { getFailedInvoices } from "../handlers/invoice";
import { processPayment } from "../handlers/payment";
import { getSubscription } from "../handlers/subscription";
import { Customer, Invoice } from "../types/entities";
import { sendFailedPaymentEmail, sendInvoiceGenerationEmail, sendSuccessfullPaymentEmail } from "./email";
import { kvPutCustomer, kvPutInvoice } from "./storage";

// recuring invoice generation automatically
export async function scheduleRecurringInvoices(env: Env) {
  let cursor = null;
  let hasMore = true;
  const currentDate = new Date();

  while (hasMore) {
    // Fetch a batch of customers with pagination support
    const { docs:customers, options } = await getAllCustomers(env, cursor);

    for (const customer of customers) {
      const nextBillingDate = new Date(customer.next_billing_date);

      // Check if the current date is past the next billing date
      if (customer.subscription_status === 'active' && currentDate >= nextBillingDate) {
        // Fetch the subscription plan
        const subscriptionPlan = await getSubscription(env, customer.subscription_plan_id);

        if (!subscriptionPlan) {
          console.error(`Subscription plan not found for customer ${customer.id}`);
          continue;
        }

        // Calculate invoice amount with credits applied
        let totalAmount = subscriptionPlan.price;

        // Apply credits, if any, from downgrades or other adjustments
        if (customer.credits && customer.credits > 0) {
          totalAmount -= customer.credits;
          customer.credits = 0; // Reset credits after applying them to the invoice
        }

        // Keep non-negative or zero amount invoice
        if (totalAmount < 0) {
          totalAmount = 0;
        }

        // Generate the new invoice
        const invoice: Invoice = {
          id: crypto.randomUUID(),
          customer_id: customer.id,
          amount: totalAmount,
          due_date: currentDate.toISOString(),
          payment_status: 'generated',
          is_prorated: false, // Regular billing, not prorated
          credits_applied: customer.credits, // Track how much credit was applied
        };

        // Save the invoice to KV
        await kvPutInvoice(env, invoice.id, JSON.stringify(invoice));

        // Update the customer's billing dates for the next cycle
        const newBillingStartDate = new Date();
        const newNextBillingDate = new Date();
        newNextBillingDate.setDate(newBillingStartDate.getDate() + subscriptionPlan.billing_duration); // Assuming monthly billing cycle

        customer.billing_start_date = newBillingStartDate.toISOString();
        customer.next_billing_date = newNextBillingDate.toISOString();

        // Update customer in KV Storage
        await kvPutCustomer(env, customer.id, JSON.stringify(customer));

        console.log(`Invoice generated for customer ${customer.id}, amount: ${totalAmount}`);
        await sendInvoiceGenerationEmail(customer.email, invoice.id);
      }
    }

    // Update the cursor for the next batch
    cursor = options.cursor;
    hasMore = !!options.cursor;
  }
}


// Re-process failed payments for invoices
export async function reprocessFailedPayments(env: Env) {
  const invoices = await getFailedInvoices(env);  // Fetch all failed invoices

  for (const invoice of invoices) {
    try {
      console.log(`Reprocessing payment for invoice ${invoice.id}, customer: ${invoice.customer_id}`);

      // Retry payment processing
      const paymentResult = await processPayment(env, invoice.id, 'credit_card');

      // fetching customer for his/her email
      const customer: Customer | null = await getCustomer(env, invoice.customer_id) as Customer;

      if (paymentResult) {

        console.log(`Payment successful for invoice ${invoice.id}`);
        
        // sending email for successfull payment
        await sendSuccessfullPaymentEmail(customer.email, invoice.id);
      } else {
        // Payment failed again, log the retry failure
        console.error(`Payment failed again for invoice ${invoice.id}`);

        // sending failure payment email
        await sendFailedPaymentEmail(customer.email, invoice.id);
      }
    } catch (error) {
      console.error(`Error reprocessing payment for invoice ${invoice.id}`);
    }
  }
}

// Cloudflare Worker cron event to trigger the invoice generation
// addEventListener('scheduled', (event) => {
//   event.waitUntil(scheduleRecurringInvoices());
// });
