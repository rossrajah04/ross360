// Wording of the customer's quotation page, /q/<token> (Phase C).
//
// Approved by ROSS 360 on 6 October 2026 and used verbatim: `chooseDate` and `received` (and, in
// quoteEmail.js, the email's link line and next-steps line). Every other line here is a DRAFT label,
// listed in the Phase C pull request for approval before release. None of it may say or imply that a
// date is booked or confirmed.

export const customerQuote = {
  // Approved (6 October 2026).
  chooseDate: 'Choose a date',
  received: "Thank you. We've received your preferred date. Nothing is booked until ROSS 360 confirms the date with you.",

  // Drafts for approval.
  datesHeading: 'Choose a preferred date',
  datesIntro: 'Nothing is booked until ROSS 360 confirms the date with you.',
  noteLabel: 'Note (optional)',
  submit: 'Send date request',
  yourDate: 'Your preferred date',
  changeDate: 'Choose a different date',
  back: 'Back to the quotation',
  noDates: 'No dates are available online at the moment. Please reply to the quotation email to arrange a date.',
  chooseOne: 'Please choose a date.',
  noteTooLong: (max) => `Please keep the note under ${max} characters.`,
  slotGone: 'This date is no longer available. Please choose another date.',
  formExpired: 'This page has expired. Please choose your date again.',
  notAllowed: 'Dates can no longer be requested for this quotation.',
  expired: (date) => `This quotation expired on ${date}.`,
  replaced: 'This quotation has been replaced by a newer one.',
  unavailable: "This quotation isn't available online.",
  gone: 'This link is no longer available.',
  error: 'Something went wrong. Please try again, or reply to the quotation email.',
};
