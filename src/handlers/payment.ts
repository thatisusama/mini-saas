import { Customer, Invoice, Payment } from '../types/entities';
import { sendSuccessfullPaymentEmail } from '../utils/email';
import { kvGetInvoice, kvPutInvoice, kvPutPayment } from '../utils/storage';
import { getCustomer } from './customer';

export async function processPayment(env:Env, invoiceId: string, paymentMethod: 'credit_card' | 'paypal' | 'other'): Promise<any> {
  const invoice: Invoice | null = await kvGetInvoice(env, invoiceId);

  if (!invoice) {
    
    return {
      success: false,
      message: "Invoice not found"
    }
  }
  
  if (invoice.payment_status === 'paid') {
    return {
      success: false,
      message: "Invoice has been paid already"
    }
  }

  // fetching customer for his/her email
  const customer : Customer | null = await getCustomer(env, invoice.customer_id);

  if (!customer) {
    
    return {
      success: false,
      message: "Customer not found"
    }
  }
  
  const payment: Payment = {
    id: crypto.randomUUID(),
    invoice_id: invoice.id,
    amount: invoice.amount,
    payment_method: paymentMethod,
    payment_date: new Date().toISOString(),
  };
  
  invoice.payment_status = 'paid';
  invoice.payment_date = payment.payment_date;
  
  await kvPutInvoice(env, invoice.id, invoice);
  await kvPutPayment(env, payment.id, payment);

  await sendSuccessfullPaymentEmail(customer.email, invoiceId);

  return {
    success: true,
    message: "Payment completed success"
  };
}
