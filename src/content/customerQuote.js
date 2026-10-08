// Wording of the customer's quotation page, /q/<token> (Phase C): the states a link can be in.
// Booking and payment wording is in booking.js. All lines here are DRAFTS, listed in the Phase C pull
// request for approval before release.

export const customerQuote = {
  expired: (date) => `This quotation expired on ${date}. Please reply to the quotation email if you would like an updated quotation.`,
  replaced: 'This quotation has been replaced by a newer one.',
  unavailable: "This quotation isn't available online.",
  gone: 'This link is no longer available.',
};
