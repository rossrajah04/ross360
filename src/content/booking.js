// Wording for self-service booking and payment (Phase C): the customer's booking pages under
// /q/<token> and the booking emails.
//
// "Book a slot" was supplied by ROSS 360 (6 October 2026) and the closing line is ROSS 360's own (from
// quoteEmail.js). EVERYTHING ELSE HERE IS A DRAFT for ROSS 360 to approve before release; it is listed
// in the Phase C pull request. The cancellation lines restate the existing 48-hour term; the deposit
// and unpaid-balance lines describe rules that the published Terms do not contain yet (see the
// proposed Terms wording in the pull request).

import { site } from './site.js';

const hours = site.policy.freeCancellationHours;
const percent = site.policy.lateCancellationMaxPercent;

export const booking = {
  // Supplied by ROSS 360.
  bookSlot: 'Book a slot',

  // --- Choosing a slot (draft) ---
  slotsHeading: 'Choose a slot',
  slotsIntro: 'Choose a date for the capture. Your booking is confirmed once payment is received.',
  continue: 'Continue',
  back: 'Back to the quotation',
  noSlots: 'No slots are available online at the moment. Please reply to the quotation email to arrange a date.',
  chooseOne: 'Please choose a slot.',
  slotGone: 'This slot is no longer available. Please choose another.',
  formExpired: 'This page has expired. Please try again.',

  // --- Payment summary (draft) ---
  payHeading: 'Payment',
  labels: {
    slot: 'Slot',
    quotation: 'Quotation',
    total: 'Quotation total',
    dueNow: 'Due now',
    paid: 'Paid',
    balance: 'Balance',
    balanceDue: 'Balance due by',
    refunded: 'Refunded',
    retained: 'Retained',
  },
  payFull: 'Pay in full',
  payDeposit: 'Pay a deposit',
  depositOption: (deposit, balance, date) => `${deposit} now, and the balance of ${balance} by the end of ${date}`,
  fullOption: (total) => `${total} now`,
  fullOnly: {
    within_7_days: 'Slots 7 days away or fewer are paid in full when booking.',
    no_package: 'This quotation is paid in full when booking.',
    total_too_low: 'This quotation is paid in full when booking.',
  },
  choosePlan: 'Please choose how to pay.',
  cancellationHeading: 'Cancellation',
  cancellationTerms: [
    'You can cancel online before your slot.',
    `If you cancel more than ${hours} hours before the slot, the amount you have paid is refunded in full.`,
    `If you cancel within ${hours} hours of the slot, ROSS 360 may keep up to ${percent}% of the booking price and will refund the rest.`,
  ],
  depositTerm: (date) => `If you pay a deposit and the balance is not paid by the end of ${date}, the booking is cancelled and the deposit refunded in full.`,
  agree: 'I have read the cancellation terms and the',
  agreeLink: 'Terms and Conditions',
  mustAgree: 'Please confirm you have read the cancellation terms and the Terms and Conditions.',
  toPayment: 'Continue to payment',
  holdNote: 'The slot is held for you for 30 minutes while you pay.',
  stripeNote: 'Payment is taken securely by Stripe. ROSS 360 does not see or store card details.',
  // Quotes not marked business (consumer and property): booked by email for now.
  byEmail: "To go ahead, please reply to the quotation email and we'll arrange the next steps with you.",
  paymentsOff: 'Online booking is not available at the moment. Please reply to the quotation email to arrange a date.',
  paymentStartFailed: 'Payment could not be started. Please try again in a moment.',

  // --- The booking on the quotation page (draft) ---
  holding: (time) => `Your payment is in progress. The slot is held for you until ${time}.`,
  continuePayment: 'Continue to payment',
  chooseDifferent: 'Choose a different slot',
  confirming: 'Thank you. Your payment is being confirmed. Refresh this page in a moment to see your booking.',
  refresh: 'Refresh',
  checkoutCancelled: 'Payment was not completed, so the slot has been released.',
  bookingHeading: 'Your booking',
  confirmed: 'Your booking is confirmed.',
  paidInFull: 'Paid in full.',
  payBalance: 'Pay balance',
  cancelBooking: 'Cancel booking',
  cancelRequested:
    'We have received your cancellation request. ROSS 360 will confirm the outcome and any refund by email.',
  cancelled: (date) => `This booking was cancelled on ${date}.`,
  refundIssued: (amount) => `A refund of ${amount} has been issued to the card used for payment.`,
  refundPending: (amount) => `A refund of ${amount} will be issued to the card used for payment.`,
  lateRefund: 'Your payment was completed after the slot had been taken, so it has been refunded in full.',
  bookAgain: 'Book another slot',

  // --- Balance (draft) ---
  balanceHeading: 'Pay balance',
  balanceIntro: (amount, date) => `The balance of ${amount} is due by the end of ${date}.`,
  balanceNothingDue: 'There is no balance to pay.',
  balanceTooLate: 'The balance can no longer be paid online. Please reply to the booking email.',

  // --- Cancelling (draft) ---
  cancelHeading: 'Cancel booking',
  cancelFree: (amount) =>
    `Your slot is more than ${hours} hours away. If you cancel, the booking ends and ${amount} is refunded in full to the card used for payment.`,
  cancelFreeNothingPaid: `Your slot is more than ${hours} hours away. If you cancel, the booking ends.`,
  cancelLate: (max) =>
    `Your slot is within ${hours} hours. Your request will be sent to ROSS 360, who may keep up to ${percent}% of the booking price (at most ${max}) and will refund the rest. You will receive the outcome by email.`,
  cancelStarted: 'This slot has started, so the booking cannot be cancelled online. Please contact ROSS 360.',
  confirmCancel: 'Cancel booking',
  confirmCancelRequest: 'Send cancellation request',
  keepBooking: 'Keep my booking',
  cancelDone: (amount) => `Your booking has been cancelled. ${amount} will be refunded to the card used for payment.`,
  cancelDoneNothingPaid: 'Your booking has been cancelled.',

  // --- Errors (draft) ---
  notAllowed: 'This quotation can no longer be booked online.',
  error: 'Something went wrong. Please try again, or reply to the quotation email.',
};

// Customer emails (draft). `closing` is ROSS 360's own line.
export const bookingEmails = {
  closing: 'We look forward to working with you.',
  viewBooking: 'View your booking',
  payBalance: 'Pay balance',
  chooseSlot: 'Choose another slot',
  confirmed: {
    subject: (slot) => `ROSS 360 booking confirmed: ${slot}`,
    lead: 'Thank you. Your booking is confirmed.',
    balance: (amount, date) =>
      `The balance of ${amount} is due by the end of ${date}. We will email you a link to pay it before then. If it is not paid by then, the booking is cancelled and your deposit refunded in full.`,
    paidInFull: 'Your booking is paid in full.',
  },
  reminder: {
    subject: (date) => `ROSS 360 balance due by ${date}`,
    lead: (slot, date) => `The balance for your booking on ${slot} is due by the end of ${date}.`,
    consequence: (deposit) => `If it is not paid by then, the booking will be cancelled and your deposit of ${deposit} refunded in full.`,
  },
  balancePaid: {
    subject: 'ROSS 360 balance received',
    lead: (amount, slot) => `Thank you. We have received your balance payment of ${amount}. Your booking on ${slot} is paid in full.`,
  },
  overdue: {
    subject: 'ROSS 360 booking cancelled',
    lead: (slot, date) => `The balance for your booking on ${slot} was not paid by the end of ${date}, so the booking has been cancelled.`,
    again: 'If you would still like to go ahead, please reply to this email.',
  },
  cancelled: {
    subject: 'ROSS 360 booking cancelled',
    lead: (slot) => `Your booking on ${slot} has been cancelled.`,
  },
  cancelledByUs: {
    subject: 'ROSS 360 booking cancelled',
    lead: (slot) => `We are sorry, but we have had to cancel your booking on ${slot}.`,
    again: 'If you would like to arrange another date, please reply to this email.',
  },
  cancelRequest: {
    subject: 'ROSS 360 cancellation request received',
    lead: (slot) =>
      `We have received your request to cancel your booking on ${slot}. As it is within ${hours} hours of the slot, ROSS 360 will confirm the outcome and any refund by email.`,
  },
  moved: {
    subject: (slot) => `ROSS 360 booking moved: ${slot}`,
    lead: (slot) => `Your booking has been moved to ${slot}.`,
  },
  lateRefund: {
    subject: 'ROSS 360 payment refunded',
    lead: (slot) =>
      `Your payment for ${slot} was completed after the slot had been taken by another booking, so it has been refunded in full.`,
  },
  refund: {
    full: (amount) => `${amount} has been refunded in full to the card used for payment.`,
    partial: (paid, retained, refunded) =>
      `Of the ${paid} paid, ${retained} has been retained and ${refunded} refunded to the card used for payment.`,
    pending: (amount) => `A refund of ${amount} will be issued to the card used for payment.`,
    none: 'No payment was taken, so there is nothing to refund.',
  },
};
