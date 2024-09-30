/**
 * This is STORAGE utility
 * Here I have integrated KV of cloudflare workers.
 * KV is a simple key/value based storage mechanism.
 * We have the methods to deal with all models INVOICE, CUSTOMER, SUBSCRIPTION, PAYMENT
 */

import { Invoice } from "../types/entities";

export async function kvGetCustomer<T>(env:Env, key: string): Promise<T | null> {
  const value = await env.CUSTOMER_KV.get(key);
  return value ? JSON.parse(value) : null;
}

export async function kvGetAllCustomers(env: Env, cursor: string) {
  let docs = [];
  let list = await env.CUSTOMER_KV.list({cursor}); // can get max 1000 users in one go without pagination

  for (const key of list.keys) {
    const value = await env.CUSTOMER_KV.get(key.name, "json");
    docs.push(value);
  }

  return {
    docs,
    options: list
  };
}

export async function kvPutCustomer(env:Env, key: string, value: any): Promise<void> {
  await env.CUSTOMER_KV.put(key, JSON.stringify(value));
}

export async function kvGetInvoice<T>(env:Env, key: string): Promise<T | null> {
  const value = await env.INVOICE_KV.get(key);
  return value ? JSON.parse(value) : null;
}

export async function kvPutInvoice(env:Env, key: string, value: any): Promise<void> {
  await env.INVOICE_KV.put(key, JSON.stringify(value));
}

export async function kvGetAllInvoices(env: Env): Promise<Invoice[]> {
  let docs = [];
  let list = await env.INVOICE_KV.list();

  for (const key of list.keys) {
    const value = await env.INVOICE_KV.get(key.name, "json");
    docs.push(value);
  }

  return docs as Invoice[];
}

export async function kvGetPayment<T>(env:Env, key: string): Promise<T | null> {
  const value = await env.PAYMENTS_KV.get(key);
  return value ? JSON.parse(value) : null;
}

export async function kvPutPayment(env:Env, key: string, value: any): Promise<void> {
  await env.PAYMENTS_KV.put(key, JSON.stringify(value));
}

export async function kvGetSubscription<T>(env:Env, key: string): Promise<T | null> {
  const value = await env.SUBSCRIPTION_KV.get(key);
  return value ? JSON.parse(value) : null;
}

export async function kvPutSubscription(env:Env, key: string, value: any): Promise<void> {
  await env.SUBSCRIPTION_KV.put(key, JSON.stringify(value));
}
