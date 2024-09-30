export interface Customer {
  id: string;
  name: string;
  email: string;
  subscription_plan_id: string;
  subscription_status: 'active' | 'cancelled';
  billing_start_date: string;  // Date of the current billing cycle start
  next_billing_date: string;  // Date of the next billing cycle
  credits: number;  // credits to manage plan upgrad/downgrade
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  billing_duration: number; // 30/180/365 days etc
  price: number;
  status: 'active' | 'inactive';
}

export interface Invoice {
  id: string;
  customer_id: string;
  amount: number;
  due_date: string;
  payment_status: 'paid' | 'failed' | 'generated';
  payment_date?: string;
  is_prorated?: boolean;  // invoice is prorated or not
  credits_applied?: number;  // credits_applied if any proration plan downgradation is done
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: 'credit_card' | 'paypal' | 'other';
  payment_date: string;
}
