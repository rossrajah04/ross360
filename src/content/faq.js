import { site } from './site.js';
import { lowestPrice } from './pricing.js';

// FAQ — plain text answers. Rendered with native <details>/<summary> (no JavaScript state).
// Each answer covers something not already explained in full elsewhere on the homepage.
export const faqs = [
  {
    q: 'How much does a tour cost?',
    a: `Business tour packages start from £${lowestPrice}. The final price depends on the size and complexity of the space, its location and any additional requirements, and is confirmed in your quote before you book. Property tours are individually quoted.`,
  },
  {
    q: 'Do you cover my area?',
    a: 'Yes. ROSS 360 works UK-wide. Travel is assessed when we prepare your quote, and any additional travel charge is shown in the quote before you pay.',
  },
  {
    q: 'Does requesting a quote commit me to anything?',
    a: 'No. A quote request simply gives us what we need to price the work. Nothing is booked until you accept the quote and pay.',
  },
  {
    q: 'Is Google Street View included?',
    a: 'For business tours, suitable imagery can be published to Google Street View where appropriate and with your separate authorisation. Google decides whether imagery is accepted and controls timing and placement, so this cannot be guaranteed. Street View is not automatically part of property tours.',
  },
  {
    q: 'How long is the tour hosted for?',
    a: `${site.hosting.includedMonths} months of ROSS 360 interactive-tour hosting is included. ${site.hosting.afterwards}`,
  },
  {
    q: 'How do booking and payment work?',
    a: `When you accept your quote, payment is taken in full (${site.payment.upfrontPercent}%) and your booking is confirmed. We then send a short questionnaire so the capture can be planned properly.`,
  },
  {
    q: 'What do I need to do before the visit?',
    a: 'Make sure we can access the agreed areas at the agreed time, and that the space is clean, tidy and arranged as you want it to appear. People, paperwork and personal items should be out of view.',
  },
  {
    q: 'What if something in the tour needs correcting?',
    a: 'If we have made a mistake, such as missing an agreed area, we will put it right at no extra cost where reasonably practical. Changes for other reasons, such as refurbishment or adding areas, are quoted separately.',
  },
  {
    q: 'What is your cancellation policy?',
    a: `You can cancel free of charge up to ${site.policy.freeCancellationHours} hours before the appointment. Later cancellations may incur a charge of up to ${site.policy.lateCancellationMaxPercent}% of the booking price. If we have to cancel, we will reschedule or refund you in full. Full details are in our Terms & Conditions.`,
  },
];
