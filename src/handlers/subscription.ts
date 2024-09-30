import { SubscriptionPlan, Customer } from '../types/entities';
import { kvGetCustomer, kvGetSubscription, kvPutCustomer, kvPutSubscription } from '../utils/storage';

export async function createSubscriptionPlan(env:Env, name: string, billing_duration: number, price: number): Promise<SubscriptionPlan> {
  
  let plan: SubscriptionPlan = {
    id: crypto.randomUUID(),
    name,
    billing_duration,
    price,
    status: 'active'
  }
  
  await kvPutSubscription(env, plan.id, plan);
  return plan;
}

export async function assignSubscription(env:Env, customerId: string, planId: string): Promise<any> {
  const currentDate = new Date();
  
  const customer: Customer | null = await kvGetCustomer(env, customerId);

  if(!customer) {
    return {
      success: false,
      message: "Customer not found"
    }
  }
  const plan: SubscriptionPlan | null = await kvGetSubscription(env, planId);
  
  if (!plan) {
    return {
      success: false,
      message: "Plan not found"
    }
  }
  
  customer.subscription_plan_id = plan.id;
  customer.subscription_status = 'active';
  customer.next_billing_date = new Date(currentDate.setDate(currentDate.getDate() + plan.billing_duration)).toISOString(),
  customer.billing_start_date = new Date().toISOString(),
  customer.credits = 0
  
  await kvPutCustomer(env, customer.id, customer);

  return { 
    success: true,
    message: "subscription assigned to the customer" 
  }
}

export async function getSubscription(env: Env, id: string): Promise<SubscriptionPlan | null>{
  let found = await kvGetSubscription(env, id);

  // Check if found is not null or undefined and then cast to SubscriptionPlan
  if (found) {
    return found as SubscriptionPlan;  // Type assertion
  } else {
    return null;
  }
}
