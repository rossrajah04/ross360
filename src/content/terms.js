// Terms & Conditions wording. Written for ROSS 360 (4 October 2026) from the business decisions in force:
// published "from" prices, property individually quoted, 100% payment before booking, no recurring
// hosting charge, Google Street View never guaranteed, 48-hour cancellation with a charge of up to 50%.
// A working draft for ROSS 360 to approve with professional advice. It is not legal advice.
//
// Not yet in place, so described only as possible or future: Stripe (no website integration yet),
// the booking system, the admin/CRM.
//
// Decisions (ROSS 360, 4 October 2026):
//   - Quotations are valid for 14 days unless the quotation says otherwise. The future quote
//     template/system must show this validity period (default 14 days) on every quotation.
//   - No recurring hosting fee and no promise of indefinite third-party hosting: ROSS 360 acts reasonably
//     to keep a completed tour available as delivered.
//   - The licence continues for the same agreed purpose if the business or property changes hands.
//   - The up-to-50% charge is discretionary, reasonable and proportionate; never an automatic penalty.
//
// TODO (booking system) — BEFORE ACCEPTING CONSUMER BOOKINGS:
//   - provide any legally required pre-contract information (Consumer Contracts Regulations 2013)
//   - provide the appropriate cancellation information and cancellation form where required
//   - ensure the booking flow handles requests to begin services within any statutory cancellation period
//   - provide the legally required geographical address and trader details, in the pre-contract
//     information, quotation or booking flow (not on the marketing pages)
//   - ensure cancellation and refund handling complies with mandatory consumer law
//   Consumer and private-property enquiries can still be accepted through the website meanwhile.
//
// LEGAL REVIEW BEFORE LAUNCH:
//   - The business liability cap (the price paid for the project) and the exclusion of indirect loss in
//     the Liability section must be professionally reviewed.
//   - Fairness of the up-to-50% charge for consumers (Consumer Rights Act 2015, Part 2).

import { site } from './site.js';
import { previewLegalWording } from './legalPreview.js';
import { lowestPrice } from './pricing.js';

const { freeCancellationHours: hours, lateCancellationMaxPercent: percent } = site.policy;

// {email}, {privacy} and {quote} in any string are rendered as links.
export const terms = {
  title: 'Terms & Conditions',
  lead: 'The terms that apply when ROSS 360 provides 360° photography and virtual tour services.',
  updated: '4 October 2026',

  sections: [
    {
      id: 'introduction',
      intro: true,
      title: 'Terms & Conditions',
      blocks: [
        {
          p: 'These terms explain how we work: how projects are quoted, booked and paid for, what we need from you, what happens if plans change, and how you can use the finished tour. Please read them before accepting a quotation.',
        },
      ],
    },
    {
      id: 'about',
      title: 'About these terms',
      blocks: [
        {
          p: `These terms apply to services provided by ROSS 360 (“ROSS 360”, “we”, “us”, “our”). ROSS 360 is a trading name of ${site.founder}. ROSS 360 is not a limited company.`,
        },
        {
          p: '“You” means the person or business that books our services. Each project is described in a written quotation. The quotation you accept, our booking confirmation and these terms together form the agreement between us. If the quotation or booking confirmation says something different from these terms, the quotation or booking confirmation applies.',
        },
        {
          p: 'Most of our customers are businesses. If you are booking as a private individual, rather than for a business, you are a consumer and the “Consumer customers” section also applies to you.',
        },
      ],
    },
    {
      id: 'services',
      title: 'Services',
      blocks: [
        { h: 'Business projects' },
        { p: 'A business project may include:' },
        {
          ul: [
            '360° photography of the agreed areas of your premises',
            'processing of the imagery',
            'production of an interactive virtual tour',
            'a quality check before delivery',
            'a shareable tour URL',
            'a website-ready embed',
            'a tour that works on desktop and mobile',
            'publication to Google Street View, where appropriate and separately authorised (see “Google Street View” below)',
          ],
        },
        { h: 'Property projects' },
        {
          p: 'Property projects are individually quoted because requirements vary. A property project may include 360° photography, an interactive tour, a shareable URL and integration with a website or listing where appropriate. Google Street View publication is not automatically included in property projects.',
        },
        { h: 'What is included' },
        {
          p: 'The areas to be captured and everything included in your project are set out in your quotation. Anything not described in the quotation is not included. We do not charge a recurring hosting fee.',
        },
      ],
    },
    {
      id: 'quotations',
      title: 'Quotations and scope',
      blocks: [
        {
          ul: [
            `Prices on our website are starting prices (business tours from £${lowestPrice}). The final price depends on the size and complexity of the space, the number of areas, its location, travel and any additional requirements.`,
            'An enquiry, including one made through our {quote} form, is not a booking.',
            'Your quotation is based on the information you give us. If the actual project differs materially from that information, for example the space is larger or more complex than described, we may need to revise the quotation. We will tell you before carrying out any additional work.',
            'Any additional travel costs or other requirements will be agreed with you before they are charged.',
            'Each quotation is valid for 14 days from the date it is issued, unless the quotation states a different period.',
          ],
        },
      ],
    },
    {
      id: 'payment',
      title: 'Payment',
      blocks: [
        {
          // Preview builds only: the online-booking wording approved for Preview testing (6 October 2026).
          ul: previewLegalWording
            ? [
                'A booking is confirmed only when payment has been received. Until then, no date is reserved for you.',
                'When you book online, you can pay in full or, for the Essential, Professional and Bespoke packages when the booked date is more than 7 days away, pay a deposit of £50, £70 or £100 respectively. Bookings made 7 days or fewer before the date, and quotations that do not use one of those packages, are paid in full when booking.',
                'A deposit counts toward the total price shown on your quotation. The balance is the total price less the deposit, and is due by the end of the day (UK time) 7 days before the booked date. We will send you reminders with a link to pay it.',
                'If the balance has not been paid by then, the booking is cancelled, the date is released and your deposit is refunded in full. We will email you to confirm this.',
                'Online card payments are processed by Stripe. We do not see or store your full card details.',
                'You can also pay using any other payment method we agree with you, such as bank transfer.',
                'We do not begin work until the booking has been confirmed.',
              ]
            : [
                'Paid projects require payment in full before the booking is confirmed.',
                'You can pay using the payment methods we offer at the time, which may include online card payment and bank transfer.',
                'Online card payments may be processed by a third-party payment provider, such as Stripe. Where a payment provider processes your payment, we do not see or store your full card details.',
                'We do not begin work until payment has been received and the booking has been confirmed.',
              ],
        },
      ],
    },
    {
      id: 'booking',
      title: 'Booking',
      blocks: [
        {
          p: 'A booking is confirmed only when you have accepted the quotation, paid in full and received our booking confirmation. Until then, no date is reserved. After booking, we may ask for further details to plan the visit, such as access arrangements and the order in which the space should be captured.',
        },
      ],
    },
    {
      id: 'responsibilities',
      title: 'Customer responsibilities',
      blocks: [
        { p: 'You are responsible for:' },
        {
          ul: [
            'giving us accurate information about the project',
            'making sure we have lawful permission to photograph the premises',
            'obtaining any permissions needed from landlords, owners, tenants, venues or anyone else whose agreement is required',
            'making sure we have appropriate access at the agreed time',
            'telling us about any areas that should not be photographed',
            'managing staff, customers and visitors during the photography',
          ],
        },
        {
          p: 'We will not photograph areas that cannot be accessed safely or lawfully.',
        },
      ],
    },
    {
      id: 'preparing',
      title: 'Preparing the premises',
      blocks: [
        {
          p: 'The finished tour shows the space as it is on the day. Before we arrive, please make sure the space is reasonably prepared: clean, tidy and arranged as you want it to appear, with confidential or private information removed or secured, and people kept out of view where possible.',
        },
        { h: 'Safety' },
        {
          p: 'We will not carry out photography where conditions are unsafe, for example where there are unstable surfaces, nowhere safe to position a tripod, blocked fire exits, dangerous access, or work at height that would need equipment we do not have, or any other obvious hazard. You are responsible for the condition and safety of your premises. If we cannot safely carry out the work, the “Cancellation and rescheduling” section applies.',
        },
      ],
    },
    {
      id: 'cancellation',
      title: 'Cancellation and rescheduling',
      blocks: [
        {
          ul: [
            // Preview builds only: the online-booking wording approved for Preview testing (6 October 2026).
            ...(previewLegalWording
              ? [
                  'You can cancel a confirmed booking online, from your quotation page, or by emailing us.',
                  `If you cancel more than ${hours} hours before the booked time, we refund everything you have paid in full.`,
                  `If you cancel within ${hours} hours of the booked time, we may keep up to ${percent}% of the total price of the booking, and never more than you have paid. We refund the rest.`,
                  `To move your booking to another date, please email us. With more than ${hours} hours’ notice there is no charge.`,
                ]
              : [
                  `You can cancel or reschedule free of charge with at least ${hours} hours’ notice before the appointment.`,
                  `If you cancel or reschedule with less than ${hours} hours’ notice, we may make a charge of up to ${percent}% of the project price.`,
                ]),
            `If no one is available at the appointment, we are denied access, or we cannot carry out the booked work because the premises are not ready or not safe, we may make a charge of up to ${percent}% of the project price.`,
            'These charges are not automatic. Whether we make a charge, and how much, is at our discretion and will be reasonable and proportionate to the circumstances and to the time and costs we have incurred, particularly where consumer law applies.',
            'If we need to cancel or reschedule, you can choose a reasonable alternative date or a full refund of any amount paid for work not carried out.',
          ],
        },
        {
          p: 'If something exceptional happens, please contact us as early as you can. We will consider the circumstances fairly and reasonably. If you are a consumer, this section does not affect your statutory cancellation rights (see “Consumer customers”).',
        },
      ],
    },
    {
      id: 'corrections',
      title: 'Photography, corrections and reshoots',
      blocks: [
        {
          p: 'We carry out the work with reasonable care and skill. Please check your tour when it is delivered and tell us about any problem.',
        },
        { h: 'Our mistakes' },
        {
          p: 'If there is a technical error on our part, or we fail to capture an agreed area that should have been captured, we will make reasonable efforts to correct it at no additional charge, including returning to recapture where that is needed and reasonably practical.',
        },
        { h: 'Reshoots and changes that may be charged' },
        { p: 'An additional charge may apply if a reshoot or change is needed because:' },
        {
          ul: [
            'the premises were not ready, or were inaccessible, at the appointment',
            'the premises have since been changed or refurbished',
            'you want additional areas captured, or areas removed',
            'the original scope has changed',
            'you want materially different imagery',
            'you want the tour structure changed, new branding added or a significant redesign after production',
            'you want new premises or locations added',
          ],
        },
        {
          p: 'We will always confirm any additional cost before carrying out the work. Reshoots for our own mistakes are covered as described above; we do not offer unlimited free reshoots for other reasons.',
        },
      ],
    },
    {
      id: 'google-street-view',
      title: 'Google Street View',
      blocks: [
        {
          p: 'Where appropriate, and only with your separate authorisation, we can prepare and submit imagery for publication on Google Street View in line with Google’s requirements.',
        },
        {
          p: 'Google is a separate company and controls its own platform. Google may process, modify, reject, remove or otherwise control imagery submitted to it, and its own terms apply. We cannot guarantee that imagery will be accepted, how quickly it will be processed, how or where it will appear, or that it will remain published, and we are not responsible for changes Google makes to its platform. We do not guarantee any ranking, search result or level of visibility on Google.',
        },
      ],
    },
    {
      id: 'third-party-platforms',
      title: 'Third-party platforms',
      blocks: [
        {
          p: 'We rely on third-party services to deliver projects, including Panoee (interactive tour platform), Google (including Street View), Cloudflare (website hosting) and Resend (enquiry emails), a payment provider such as Stripe for online payments when offered, and other services reasonably needed to deliver your project.',
        },
        {
          p: 'These services have their own terms, privacy policies, availability and limitations, and they may change their features, pricing or terms.',
        },
        { h: 'Availability of your tour' },
        {
          p: 'We do not charge a recurring hosting fee. We will act reasonably to keep your completed tour available as delivered. Where the tour relies on third-party platforms or services, we cannot guarantee that it, or any feature provided through those platforms, will remain available indefinitely or unchanged.',
        },
      ],
    },
    {
      id: 'licence',
      title: 'Intellectual property and licence',
      blocks: [
        {
          dl: [
            [
              'Your materials',
              'You keep ownership of anything you provide to us, such as logos, text and existing images. You give us permission to use them only to carry out your project.',
            ],
            [
              'Our work',
              'We own the photography, imagery, tour and production files we create, unless we agree otherwise in writing.',
            ],
            [
              'Third-party content',
              'Software, platforms and content provided by third parties, such as the tour platform and Google’s services, remain the property of those third parties and are used under their terms.',
            ],
          ],
        },
        { h: 'Your licence' },
        {
          p: 'Once you have paid in full, you may use the completed tour and its associated imagery for the business or property marketing purposes agreed for your project, with no time limit. This includes using them on your website, in property listings, on social media, in online marketing and on Google or Street View where applicable. The licence is non-exclusive.',
        },
        { h: 'If the business or property changes hands' },
        {
          p: 'If the business or property shown in the tour is sold or taken over, the new owner or operator may continue to use the completed tour for the same agreed marketing purpose, where appropriate. Any materially different use needs our agreement.',
        },
        { p: 'You must not:' },
        {
          ul: [
            'resell the tour or imagery as your own photography service',
            'redistribute the underlying production files as a standalone commercial product',
            'sublicense the work to unrelated third parties, or resell it',
            'remove ROSS 360 attribution where attribution is specifically included in the agreed deliverable',
          ],
        },
      ],
    },
    {
      id: 'portfolio',
      title: 'Portfolio and marketing use',
      blocks: [
        {
          p: 'With your permission, we may use imagery and details from a completed project in our portfolio, on our website and social media, in other marketing and in case studies. Portfolio permission is separate from the agreement to carry out the work, is optional and does not affect the service you receive. Where you have not given permission, we will not use your project in this way.',
        },
        {
          p: 'Where we agree to carry out a project free of charge for portfolio and development purposes, portfolio permission is agreed in writing before the work begins. There is no requirement or expectation that you leave a review, on Google or anywhere else, for any project.',
        },
      ],
    },
    {
      id: 'confidentiality',
      title: 'Confidentiality and privacy',
      blocks: [
        {
          p: 'We handle personal information in line with our {privacy}. We use the information you give us about your premises and your project only to carry out and support the work, and we take reasonable care with anything you tell us is confidential.',
        },
      ],
    },
    {
      id: 'liability',
      title: 'Liability',
      blocks: [
        {
          p: 'Nothing in these terms excludes or limits liability that cannot legally be excluded or limited, including liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or under your statutory rights as a consumer.',
        },
        { h: 'Business customers' },
        // LEGAL REVIEW: the liability cap (the price paid for the project) and the exclusion of indirect
        // loss must be professionally reviewed before launch.
        {
          p: 'If you are a business, our total liability to you in connection with a project is limited to the price paid for that project. We are not liable for loss of profit, revenue, business, goodwill or opportunity, or for any indirect or consequential loss.',
        },
        { h: 'Consumer customers' },
        {
          p: 'If you are a consumer, we are responsible for loss or damage you suffer that is a foreseeable result of our breaking these terms or failing to use reasonable care and skill. We are not responsible for business losses.',
        },
        { h: 'Things outside our responsibility' },
        {
          p: 'We are not responsible for losses caused solely by third-party platform outages, Google’s processing or publication decisions, internet failures, your own systems or website, changes to website hosting or third-party platforms, or events outside our reasonable control. This does not limit our responsibility for problems we cause.',
        },
      ],
    },
    {
      id: 'outside-our-control',
      title: 'Events outside our control',
      blocks: [
        {
          p: 'Occasionally something genuinely outside our reasonable control may prevent us from carrying out the work as planned, such as serious equipment failure, severe weather, an emergency, illness or a major service outage. If this happens, we will tell you as soon as we can and offer a reasonable alternative date. If a suitable date cannot be agreed, you can have a full refund of any amount paid for work not carried out.',
        },
      ],
    },
    {
      id: 'complaints',
      title: 'Complaints',
      blocks: [
        {
          p: 'If you are unhappy with any part of our service, please email {email} with the details. We will acknowledge your complaint, look into it properly and try to resolve it fairly and reasonably.',
        },
      ],
    },
    {
      id: 'consumers',
      title: 'Consumer customers',
      // TODO (booking system): see "BEFORE ACCEPTING CONSUMER BOOKINGS" at the top of this file. The wording
      // below preserves statutory rights without hard-coding a cancellation process.
      blocks: [
        {
          p: 'If you are a consumer, you have legal rights in relation to services that are not carried out with reasonable care and skill, and you may have a legal right to cancel certain contracts within a set period after entering into them. Nothing in these terms affects those rights. Where a statutory cancellation right applies to your booking, we will explain it, and how to use it, before you book.',
        },
        {
          p: 'Advice about your legal rights is available from Citizens Advice.',
        },
      ],
    },
    {
      id: 'changes',
      title: 'Changes to these terms',
      blocks: [
        {
          p: 'We may update these terms from time to time, for example when our services or the law change. Updated terms apply to projects booked after the change. The terms that applied when your booking was confirmed will not be changed for that booking without your agreement.',
        },
      ],
    },
    {
      id: 'governing-law',
      title: 'Governing law',
      blocks: [
        {
          p: 'These terms are governed by the law of England and Wales, and the courts of England and Wales have jurisdiction. If you are a consumer living in Scotland or Northern Ireland, you can also bring proceedings in your local courts, and you keep the protection of any mandatory laws of the place where you live.',
        },
      ],
    },
    {
      id: 'contact',
      title: 'Contact',
      // TODO: the legally required geographical address is not published here or on marketing pages. It
      // must be given in the pre-contract information, quotation or booking flow before consumer
      // distance contracts are accepted.
      blocks: [
        {
          p: `ROSS 360 is a trading name of ${site.founder}. For any question about these terms, email {email}.`,
        },
      ],
    },
  ],
};
