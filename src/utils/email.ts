export async function sendInvoiceGenerationEmail(customerEmail: string, invoiceId: string): Promise<void> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      //'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: customerEmail }] }],
      from: { email: 'billing@saas-app.com' },
      subject: 'Invoice Generated',
      content: [{ type: 'text/plain', value: `Your invoice ${invoiceId} has been generated.` }],
    }),
  });

  if (!response.ok) throw new Error('Failed to send email');
}

export async function sendSuccessfullPaymentEmail(customerEmail: string, invoiceId: string): Promise<void> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      //'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: customerEmail }] }],
      from: { email: 'billing@saas-app.com' },
      subject: 'Payment Success',
      content: [{ type: 'text/plain', value: `Your invoice ${invoiceId} has been paid successfully.` }],
    }),
  });

  if (!response.ok) throw new Error('Failed to send email');
}

export async function sendFailedPaymentEmail(customerEmail: string, invoiceId: string): Promise<void> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      //'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: customerEmail }] }],
      from: { email: 'billing@saas-app.com' },
      subject: 'Payment Failed',
      content: [{ type: 'text/plain', value: `Your invoice ${invoiceId} payment has been failed.` }],
    }),
  });

  if (!response.ok) throw new Error('Failed to send email');
}
