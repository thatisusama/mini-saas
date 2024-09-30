# Mini Saas App

## Summary
I have developed a backend for the saas app, The app has the entry level functionality for the customers have subscriptions and thr subscriptions will be renewed automatically at the end of their choosen plan's cycle. I have tried to cover many possible cases as I can.

# Stack
It is based on nodejs typescript with cloudflare serverless workers architecture. I have used KV as my data store in the app.

# Usecases
I have handled following use cases in the product:

1. Customer signup with subscription using api endpoint
2. Subscription plans api endpoint to create the plan
3. Assigning the plan to the customer
4. Midway plan upgrade proration handled by introducing a credit field in customer schema/model which can be adjusted in the amount of invoice
5. Midway plan downgrade proration handled
6. Customer can pay using credit-card or paypal using an api endpoint
7. A cronjob to run on daily basis to generate invoices for the customers whos payment cycle is completed.
8. An email will be sent to the customer when an invoice generates or if a payment is processed.
9. Email notifications will also send incase of failed payment.
10. A 2nd cronjob to run on daily basis to process any failed invoice which have payment_status as failed.
11. Added some tests in test file but can add more tests by following the existing samples.


# Models

```
Customer {
  id: string;
  name: string;
  email: string;
  subscription_plan_id: string;
  subscription_status: 'active' | 'cancelled';
  billing_start_date?: string;
  next_billing_date: string;
  credits: number;
}

SubscriptionPlan {
  id: string;
  name: string;
  billing_duration: number; // 30/180/365 days etc
  price: number;
  status: 'active' | 'inactive';
}

Invoice {
  id: string;
  customer_id: string;
  amount: number;
  due_date: string;
  payment_status: 'paid' | 'failed' | 'generated';
  payment_date?: string;
  is_prorated?: boolean;  // Whether the invoice is prorated or not
  credits_applied?: number;  // Any credits applied due to downgrades or early cancellation
}

Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: 'credit_card' | 'paypal' | 'other';
  payment_date: string;
}
```

# Directory structure

    -src
        
        index.ts // main entry point
         
        -handlers
                 customer.ts
                 invoice.ts
                 payment.ts
                 subscription.ts
                 
        -types
                 entities.ts
                 
        -utils
                cron.ts
                email.ts
                storage.ts
            


# How to run the app
```
 - you need to have installed latest node version
 - run command "npm i"
 - once all packages are installed then do the following command
 - "npm run dev" it will start the app on port 8787
 
 To Deploy the app on cloudflare just run the following command
 - "npm run deploy"
 it will open cloudflare auth in the browser, perform login/signup and then it will start deployment of the app in region EARTH :D
```