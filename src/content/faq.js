import { site } from './site.js';
import { lowestPrice } from './pricing.js';

// FAQ — plain text answers. Rendered with native <details>/<summary> (no JavaScript state).
export const faqs = [
  {
    q: 'What is a 360° virtual tour?',
    a: 'A 360° virtual tour is an interactive online version of a physical space. Visitors look around and move between connected viewpoints, so they can explore the space before they visit.',
  },
  {
    q: 'How much does it cost?',
    a: `Business tour packages start from £${lowestPrice}. Final pricing depends on the size and complexity of the space, location and any additional requirements, and your exact price is confirmed before booking. Property tours are individually quoted.`,
  },
  {
    q: 'Do you cover my area?',
    a: 'ROSS 360 works UK-wide. Travel is assessed before your quote is finalised, and any additional travel charge is confirmed in the quote before you pay.',
  },
  {
    q: 'Is Google Street View included?',
    a: 'For business tours, suitable imagery can be published to Google Street View where appropriate. Google is a separate third-party platform, so approval, processing time, placement and availability cannot be guaranteed. For property, Google publishing is not automatically included.',
  },
  {
    q: 'Can I put the tour on my website?',
    a: 'Yes. Tours are prepared so they can be embedded on your website or shared with a link.',
  },
  {
    q: 'How long is the tour hosted for?',
    a: `${site.hosting.includedMonths} months of ROSS 360 interactive-tour hosting is included. ${site.hosting.afterwards}`,
  },
  {
    q: 'How does booking and payment work?',
    a: `Once you send an enquiry, we review the details and send you a quote. When you accept it, payment is taken in full up front (${site.payment.upfrontPercent}%) and your booking is confirmed. We then send a short questionnaire to prepare for the capture.`,
  },
  {
    q: 'What is your cancellation policy?',
    a: `You can cancel free of charge up to ${site.policy.freeCancellationHours} hours before the scheduled appointment. Cancellations within ${site.policy.freeCancellationHours} hours may incur a charge of up to ${site.policy.lateCancellationMaxPercent}% of the booking price, reflecting time and costs reserved for the appointment. If ROSS 360 cancels, we will reschedule or give you a full refund. Full details are in our Terms & Conditions.`,
  },
  {
    q: 'Can you work with estate agencies that have multiple properties?',
    a: 'Yes. ROSS 360 can work with individual properties, multiple properties and ongoing agency requirements. Use the quote form to tell us about your agency requirements.',
  },
];
