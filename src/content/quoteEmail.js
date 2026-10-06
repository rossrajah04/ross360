// Wording of the quotation emailed to a customer from the Admin (Phase B).
// The opening, VAT and closing lines were supplied by ROSS 360 (5 October 2026); the link line and the
// next-steps line were approved for Phase C (6 October 2026). All are used verbatim. Everything else here is a plain label. Edit wording here only; the template is in
// server/admin/quoteRender.js and is the same for the Admin preview and the email that is sent.

export const quoteEmail = {
  subject: (reference) => `ROSS 360 quotation ${reference}`,
  title: 'Quotation',
  opening: 'Thanks for the opportunity to provide a quotation for your 360° virtual tour project.',
  vat: 'VAT is not charged.',
  // The link to the customer's quotation page (Phase C). Its text is the link.
  linkLine: 'View your quotation and choose a preferred date online.',
  nextSteps:
    'To go ahead, choose a preferred date online or reply to this email. Nothing is booked until ROSS 360 confirms the date with you.',
  closing: 'We look forward to working with you.',
  labels: {
    date: 'Date',
    enquiry: 'Enquiry reference',
    preparedFor: 'Prepared for',
    project: 'Project',
    description: 'Description',
    quantity: 'Qty',
    unit: 'Unit price',
    amount: 'Amount',
    subtotal: 'Subtotal',
    travel: 'Travel',
    discount: 'Discount',
    total: 'Total',
    validUntil: (date, days) => `Valid until ${date} (${days} ${days === 1 ? 'day' : 'days'})`,
    terms: 'Terms and Conditions',
  },
  termsPath: '/terms',
};
