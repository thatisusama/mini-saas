import { Customer, Invoice, SubscriptionPlan } from '../types/entities';
import { kvGetAllCustomers, kvGetCustomer, kvPutCustomer, kvPutInvoice } from '../utils/storage';
import { getSubscription } from './subscription';

export async function createCustomerWithSubscription(env:Env, name: string, email: string, subscriptionPlanId: string): Promise<any> {
  
  // Get the current date
  const currentDate = new Date();
  let subscription = await getSubscription(env, subscriptionPlanId);

  if(!subscription) {
    return {
      success: false,
      message: "Subscription plan not found"
    }
  }

  const customer: Customer = {
    id: crypto.randomUUID(),
    name,
    email,
    subscription_plan_id: subscriptionPlanId,
    subscription_status: 'active',
    next_billing_date: new Date(currentDate.setDate(currentDate.getDate() + subscription.billing_duration)).toISOString(),
    billing_start_date: new Date().toISOString(),
    credits: 0
  };

  // Storing customer in storage
  await kvPutCustomer(env,customer.id, customer);
  return {
    success: true,
    customer
  };

}

export async function getCustomer(env:Env, id: string): Promise<Customer | null> {
  let found = await kvGetCustomer(env, id) as Customer;

  // Check if found is not null or undefined and then cast to SubscriptionPlan
  if (found) {
    return found as Customer;  // Type assertion
  } else {
    return null;
  }
}

export async function getAllCustomers(env:Env, cursor: string): Promise<any> {
  let found = await kvGetAllCustomers(env, cursor);

  if (found.docs) {
    return {
      docs: found.docs,
      options: found.options
    }
  } else {
    return [];
  }
}

function calculateProration(
  oldPlanPrice: number,
  newPlanPrice: number,
  daysUsed: number,
  totalDaysInCycle: number
): { oldPlanCost: number, newPlanCost: number } {
  const oldPlanDailyRate = oldPlanPrice / totalDaysInCycle;
  const newPlanDailyRate = newPlanPrice / totalDaysInCycle;

  const oldPlanCost = oldPlanDailyRate * daysUsed;
  const newPlanCost = newPlanDailyRate * (totalDaysInCycle - daysUsed);

  return { oldPlanCost, newPlanCost };
}

export async function handleProratedUpgrade(env:Env, customerId: string, newPlanId: string): Promise<any> {
  const customer: Customer | null = await getCustomer(env, customerId);

  if(!customer) {
    return {
      success: false,
      message: "Customer not found"
    };
  }

  const currentPlan: SubscriptionPlan | null = await getSubscription(env, customer.subscription_plan_id);

  if(!currentPlan) {
    return {
      success: false,
      message: "Current subscription plan not found by provided id"
    };
  }

  const newPlan: SubscriptionPlan | null =  await getSubscription(env, newPlanId);

  if(!newPlan) {
    return {
      success: false,
      message: "New subscription plan not found by provided id"
    };
  }

  const currentDate = new Date();
  const billingStartDate = new Date(customer.billing_start_date);
  const totalDaysInCycle = newPlan.billing_duration;
  const daysUsed = Math.floor((currentDate.getTime() - billingStartDate.getTime()) / (1000 * 60 * 60 * 24));

  const { oldPlanCost, newPlanCost } = calculateProration(
      currentPlan.price,
      newPlan.price,
      daysUsed,
      totalDaysInCycle
  );

  let proratedCost = oldPlanCost + newPlanCost;

  // Create a prorated invoice for the customer
  const proratedInvoice: Invoice = {
      id: crypto.randomUUID(),
      customer_id: customerId,
      amount: proratedCost,  // Total prorated cost
      due_date: new Date().toISOString(),
      payment_status: 'generated',
      is_prorated: true,
  };

  // if any credits are available in customer
  if (customer.credits > 0) {
    proratedCost -= customer.credits;
    proratedInvoice.credits_applied = customer.credits;
    customer.credits = 0;  // Reset the credits after applying them
}

  await kvPutInvoice(env, proratedInvoice.id, proratedInvoice);

  // Update customer's subscription to the new plan
  customer.subscription_plan_id = newPlanId;
  customer.billing_start_date = currentDate.toISOString();  // Reset billing start date to today
  customer.next_billing_date = new Date(currentDate.setDate(currentDate.getDate() + totalDaysInCycle)).toISOString();  // Set next billing date
  
  await kvPutCustomer(env, customerId, customer);

  return {
    success: true,
    message: "Plan upgraded"
  }
}

function calculateDowngradeCredit(
  oldPlanPrice: number,
  newPlanPrice: number,
  daysRemaining: number,
  totalDaysInCycle: number
): number {
  const oldPlanDailyRate = oldPlanPrice / totalDaysInCycle;
  const newPlanDailyRate = newPlanPrice / totalDaysInCycle;

  const remainingOldCost = oldPlanDailyRate * daysRemaining;
  const remainingNewCost = newPlanDailyRate * daysRemaining;

  // The credit is the difference between what they paid on the old plan vs. the cost of the new plan
  return remainingOldCost - remainingNewCost;
}


export async function handleProratedDowngrade(env:Env, customerId: string, newPlanId: string): Promise<any> {
  const customer: Customer | null = await getCustomer(env, customerId);

  if(!customer) {
    return {
      success: false,
      message: "Customer not found"
    };
  }

  const currentPlan: SubscriptionPlan | null = await getSubscription(env, customer.subscription_plan_id);

  if(!currentPlan) {
    return {
      success: false,
      message: "Current subscription plan not found by provided id"
    };
  }

  const newPlan: SubscriptionPlan | null =  await getSubscription(env, newPlanId);

  if(!newPlan) {
    return {
      success: false,
      message: "New subscription plan not found by provided id"
    };
  }

  if (!customer || !currentPlan || !newPlan) {
      return new Response('Invalid customer or subscription plan', { status: 400 });
  }

   // Get the current billing start date and current date
   const currentDate = new Date();
   const billingStartDate = new Date(customer.billing_start_date);
   const totalDaysInCycle = newPlan.billing_duration;  // Assuming a monthly billing cycle (30 days)
   const daysUsed = Math.floor((currentDate.getTime() - billingStartDate.getTime()) / (1000 * 60 * 60 * 24));
   const daysRemaining = totalDaysInCycle - daysUsed;

   // Calculate the prorated credit using the helper function
   const proratedCredit = calculateDowngradeCredit(
       currentPlan.price,
       newPlan.price,
       daysRemaining,
       totalDaysInCycle
   );

   // Apply the prorated credit to the customer (can be used for the next billing cycle)
   // Only apply positive credits
   customer.credits += proratedCredit > 0 ? proratedCredit : 0;

   // Update the customer's subscription to the new plan
   customer.subscription_plan_id = newPlanId;
   customer.billing_start_date = currentDate.toISOString();  // Reset billing start date
   customer.next_billing_date = new Date(currentDate.setDate(currentDate.getDate() + totalDaysInCycle)).toISOString();  // Set next billing date

   // Save the updated customer data in KV
   await kvPutCustomer(env, customerId, customer);
}



