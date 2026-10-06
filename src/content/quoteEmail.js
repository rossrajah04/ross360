// Wording of the quotation emailed to a customer from the Admin (Phase B).
// The opening, VAT, next-steps and closing lines were supplied by ROSS 360 (5 October 2026) and are
// used verbatim. Everything else here is a plain label. Edit wording here only; the template is in
// server/admin/quoteRender.js and is the same for the Admin preview and the email that is sent.

export const quoteEmail = {
  subject: (reference) => `ROSS 360 quotation ${reference}`,
  title: 'Quotation',
  opening: 'Thanks for the opportunity to provide a quotation for your 360° virtual tour project.',
  vat: 'VAT is not charged.',
  nextSteps: "If you'd like to go ahead, simply reply to this email and we'll arrange the next steps with you.",
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
