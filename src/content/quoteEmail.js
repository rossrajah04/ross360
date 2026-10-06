// Wording of the quotation emailed to a customer from the Admin (Phase B).
// The opening, VAT and closing lines were supplied by ROSS 360 (5 October 2026) and the "Book a slot"
// button text on 6 October 2026; all are used verbatim. The next-steps line is a DRAFT for approval
// (Phase C booking and payment replaced the earlier date-request wording). Everything else here is a
// plain label. Edit wording here only; the template is in
// server/admin/quoteRender.js and is the same for the Admin preview and the email that is sent.

export const quoteEmail = {
  subject: (reference) => `ROSS 360 quotation ${reference}`,
  title: 'Quotation',
  opening: 'Thanks for the opportunity to provide a quotation for your 360° virtual tour project.',
  vat: 'VAT is not charged.',
  // The button to the customer's quotation page, where they book and pay (Phase C).
  bookButton: 'Book a slot',
  // Draft for approval.
  nextSteps: 'To go ahead, book a slot and pay online. Your booking is confirmed once payment is received.',
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
