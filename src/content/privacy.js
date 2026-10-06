// Privacy Notice wording. Written for ROSS 360 (4 October 2026) from what the website and the agreed
// workflow actually do. It is a working draft for the business to approve, not legal advice.
//
// What this notice is based on (checked in the code on 4 October 2026):
//   - Get a Quote form -> Cloudflare Pages Function (functions/api/quote.js) -> Resend -> newquote@ross360.co.uk.
//     (Updated 5 October 2026.) Where the Admin records system is enabled (the D1 binding `DB` is set
//     for that environment), each enquiry is also stored in a Cloudflare D1 database and managed in the
//     private Admin. The notice says this "where our enquiry records system is in use", so it is accurate
//     both before and after Production D1 is connected. Stored enquiries are erased by hand; see README.
//   - Optional customer acknowledgement email via Resend (only when SEND_ACKNOWLEDGEMENT is "true"),
//     sent from contact@ross360.co.uk.
//   - Cloudflare Turnstile spam check (when VITE_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are set;
//     required wherever enquiries are stored). Always on: a hidden honeypot field and a timing check,
//     which process no extra personal information.
//   - An external example tour from Panoee (tour.panoee.com) is embedded and loads automatically with the
//     page. ROSS 360 chose automatic loading (4 October 2026) and accepts the third-party embed; keep the
//     cookies and sharing wording below accurate to that.
//   - Fonts are self-hosted. No analytics, advertising or tracking code, and the site's own code sets no
//     cookies and uses no browser storage.
//   - Hosting: Cloudflare Pages.
//
// Business services named by ROSS 360 and described here: Google Workspace (email) and Google Street View
// publication.
//
// Decisions (ROSS 360, 4 October 2026):
//   - Stripe (customer payments) and Mettle (business banking) are intended but not yet in use, so they
//     are not named. Add them to the sharing section when those systems go live.
//   - Retention: no fixed periods yet. The notice explains the criteria; an internal retention schedule
//     will be set separately.
//   - ICO: no registration number until the data protection fee self-assessment is done. Never invent one.
//   - Controller identity: "a trading name of Ross Rajah … not a limited company" stays on this page only.
//     Not on marketing pages, and no "sole trader".
//
// Still to check before launch:
//   - International transfers: each provider's safeguard for processing outside the UK. The notice states
//     no specific mechanism until this is confirmed.
//   - Cloudflare dashboard: Web Analytics and any bot-management cookies are off, or describe them under
//     cookies.

import { site } from './site.js';
import { previewLegalWording } from './legalPreview.js';

// {email} in any string is rendered as a link to the contact address; {ico} as a link to the ICO.
export const privacy = {
  title: 'Privacy Notice',
  lead: 'How ROSS 360 collects, uses, stores and shares personal information.',
  updated: '5 October 2026',

  sections: [
    {
      id: 'introduction',
      // Shown as the opening paragraph, under the page's own heading.
      intro: true,
      title: 'Privacy Notice',
      blocks: [
        {
          p: 'ROSS 360 respects your privacy. This notice explains what personal information we collect when you use this website or work with us, how we use it, how long we keep it, who we share it with and the rights you have.',
        },
      ],
    },
    {
      id: 'who-we-are',
      title: 'Who we are',
      blocks: [
        {
          p: `ROSS 360 provides 360° virtual tours and 360° photography for businesses and property across the UK. ROSS 360 is a trading name of ${site.founder}, who is the controller of the personal information described in this notice. ROSS 360 is not a limited company.`,
        },
        { p: 'For any question about this notice or your personal information, email {email}.' },
      ],
    },
    {
      id: 'information-we-collect',
      title: 'Information we collect',
      blocks: [
        { h: 'When you request a quote' },
        { p: 'The Get a Quote form asks for:' },
        {
          ul: [
            'your name',
            'your business or organisation',
            'your email address',
            'your phone number, if you give one',
            'the type of project, and a short explanation if you choose “Other”',
            'the type of business or property',
            'the address or postcode of the space',
            'its approximate size or number of areas',
            'the areas you would like photographed',
            'your preferred date or timing, if you give one',
            'anything else you choose to tell us',
            'how you heard about us, if you tell us',
          ],
        },
        {
          p: 'We use these details to respond to your enquiry, prepare a quotation, arrange the project and keep business records. Your enquiry is sent to us by email and, where our enquiry records system is in use, is also stored in that system, which is hosted by Cloudflare.',
        },
        { h: 'When you work with us' },
        { p: 'If you go on to book, we may also hold:' },
        {
          ul: [
            'quotations and what was agreed',
            'booking details, such as the date, access arrangements and on-site contacts',
            // Preview builds only: the online-booking wording, for review (6 October 2026).
            previewLegalWording
              ? 'booking and payment information, such as the date you booked, amounts paid and refunded, payment deadlines and payment references from our payment provider'
              : 'payment information, such as invoices, amounts and whether a payment has been made',
            'correspondence between you and us',
            'project details and the information needed to deliver the service',
            'the 360° photographs and finished tour of your space',
          ],
        },
        {
          p: 'We do not store full payment card details.',
        },
        { h: 'When you visit this website' },
        {
          p: 'Our hosting provider processes basic technical information, such as your IP address and browser details, to deliver the website and protect it from misuse. We do not use analytics or advertising tools on this website.',
        },
      ],
    },
    {
      id: 'how-we-collect',
      title: 'How we collect information',
      blocks: [
        { p: 'We collect personal information:' },
        {
          ul: [
            'when you submit the Get a Quote form',
            'when you email us or reply to our emails',
            'when you accept a quotation and book',
            'through payment records when you pay us',
            'during the photography visit and production of your tour',
            'automatically, through the technical information described above, when you use this website',
          ],
        },
      ],
    },
    {
      id: 'how-we-use',
      title: 'How we use information',
      blocks: [
        { p: 'We use personal information to:' },
        {
          ul: [
            'respond to your enquiry and prepare a quotation',
            'arrange and confirm bookings',
            'carry out the 360° photography and produce your virtual tour',
            'communicate with you about your project',
            'take and record payments',
            'deliver the finished tour, including its shareable link and website embed',
            'publish imagery to Google Street View where you have authorised it and it is appropriate',
            'keep business and accounting records',
            'deal with questions, complaints or disputes',
            'improve our service and this website',
            'keep the website and the quote form secure and prevent spam, misuse or fraud',
            'meet our legal obligations',
          ],
        },
        {
          p: 'We do not sell your information or use it for advertising.',
        },
      ],
    },
    {
      id: 'lawful-basis',
      title: 'Our lawful basis',
      blocks: [
        { p: 'UK data protection law requires a lawful basis for each use of personal information. We rely on:' },
        {
          dl: [
            [
              'Steps before a contract',
              'Responding to your enquiry and preparing a quotation, because you have asked us to.',
            ],
            [
              'Performing our contract',
              'Arranging and carrying out the work you have booked, communicating with you about it, taking payment and delivering your tour, including Google Street View publication where it forms part of the agreed service.',
            ],
            [
              'Legitimate interests',
              'Running and administering the business, keeping records, dealing with complaints and disputes, improving the service and keeping the website secure. Where a customer is a business, we also rely on this for the details of the people we deal with there. We only rely on legitimate interests where they are not outweighed by your rights.',
            ],
            [
              'Legal obligation',
              'Keeping financial and accounting records, and responding to lawful requests from public authorities.',
            ],
            [
              'Consent',
              'Only where we ask for your permission, for example to feature a project in our portfolio. You can withdraw consent at any time by emailing {email}; this does not affect anything done before you withdraw it.',
            ],
          ],
        },
      ],
    },
    {
      id: 'sharing',
      title: 'Sharing information with service providers',
      blocks: [
        {
          p: 'We share personal information only where it is needed to run the business, with service providers who handle it on our behalf or provide a service you have asked for:',
        },
        {
          dl: [
            [
              'Cloudflare',
              'Hosts this website, runs the code that receives quote form submissions and provides the database for our enquiry records system, where enquiries are stored. If a spam check appears on the form, it is Cloudflare Turnstile, which processes technical information from your browser to tell people and automated software apart.',
            ],
            [
              'Resend',
              previewLegalWording
                ? 'Delivers our emails: the details you submit through the Get a Quote form to our inbox, any email confirming we have received your enquiry, your quotation, and emails about your booking, such as confirmations, payment reminders and cancellations.'
                : 'Delivers the details you submit through the Get a Quote form to our inbox, and may send you an email confirming we have received your enquiry.',
            ],
            ...(previewLegalWording
              ? [
                  [
                    'Stripe',
                    'Processes online card payments and refunds when you book or pay a balance. Stripe receives the amount, your email address and your card details, and handles them under its own privacy policy. We receive confirmation of payment, the amount and Stripe’s reference for it; we do not receive or store your full card details.',
                  ],
                ]
              : []),
            ['Google Workspace', 'Provides our business email, including {email}.'],
            [
              'Panoee',
              'Hosts interactive 360° tours, including the example tour shown on this website. When a page with an embedded tour loads, your browser connects to Panoee.',
            ],
            [
              'Google (Street View)',
              'Receives 360° imagery for publication on Google Maps and Street View, only where you have authorised it.',
            ],
          ],
        },
        {
          p: 'We may also share information with our bank and any payment provider we use to take payments, with professional advisers, such as an accountant, where needed, and with public authorities where the law requires it.',
        },
        { p: 'We do not sell personal information.' },
      ],
    },
    {
      id: 'street-view',
      title: 'Google Street View and imagery',
      blocks: [
        {
          p: 'Where you ask for, or authorise, publication to Google Street View, we submit 360° imagery of your space to Google. Google then processes and publishes it through its own services. Google is a separate company and its own terms and privacy policy apply to imagery published on its platforms.',
        },
        {
          p: 'Google decides whether and when imagery is published, so we cannot guarantee that it will appear or how it will be shown. Once published, imagery is held by Google, and some requests about it, such as removal, may need to be made to Google directly. We can help with this where we are able to.',
        },
      ],
    },
    {
      id: 'photography',
      title: 'Photographs and identifiable people',
      blocks: [
        {
          p: '360° photography records everything visible from each viewpoint, so it can capture people, vehicles, signs, documents or other information within a space.',
        },
        {
          p: 'Before a visit, we ask customers to prepare the space: for example, keeping people out of view where possible and removing confidential paperwork and personal items. During production we take reasonable steps to avoid or deal with inappropriate personal information, such as choosing viewpoints carefully or obscuring details where this is practical.',
        },
        {
          p: 'We cannot guarantee that every person or item will always be removed. If you notice something in a tour or image that should not be there, please email {email} and we will look into it.',
        },
      ],
    },
    {
      id: 'retention',
      title: 'How long we keep information',
      blocks: [
        {
          p: 'We keep personal information only for as long as reasonably necessary for the purposes in this notice, taking into account legal, accounting, contractual and operational requirements. After that, we delete or anonymise it.',
        },
        {
          dl: [
            [
              'Enquiries',
              'Enquiries that do not lead to a booking are kept for as long as needed to respond and for a reasonable period afterwards in case you come back to us.',
            ],
            [
              'Customer and project records',
              'Kept for the duration of the project and afterwards for as long as reasonably needed to support the finished tour and to deal with any questions, complaints or claims.',
            ],
            [
              'Financial and accounting records',
              'Kept for the period required by UK tax and accounting rules.',
            ],
            [
              'Project imagery and files',
              'Kept for as long as needed to produce, deliver and support your tour, or for any period agreed with you.',
            ],
            [
              'Portfolio material',
              'Used only with permission, and kept until that permission is withdrawn or we stop using it.',
            ],
          ],
        },
        {
          p: 'Imagery published to Google Street View is held by Google under its own terms, as described above.',
        },
      ],
    },
    {
      id: 'security',
      title: 'Keeping information secure',
      blocks: [
        { p: 'We take reasonable steps to protect personal information, including:' },
        {
          ul: [
            'limiting access to the people who need it',
            'protecting business accounts with strong passwords and two-step verification where it is offered',
            'using established service providers',
            'using encrypted connections, including on this website',
          ],
        },
        {
          p: 'No system is completely secure, but if a personal data breach occurs we will deal with it as the law requires.',
        },
      ],
    },
    {
      id: 'international-transfers',
      title: 'Processing outside the UK',
      blocks: [
        {
          p: 'Some of our service providers are based outside the UK or use systems outside the UK, so personal information may be processed abroad. Where it is, the transfer must be protected by safeguards recognised under UK data protection law. You can email {email} for more information about the safeguards that apply.',
        },
      ],
    },
    {
      id: 'your-rights',
      title: 'Your rights',
      blocks: [
        { p: 'Under UK data protection law you have the right to:' },
        {
          ul: [
            'access the personal information we hold about you',
            'ask us to correct information that is inaccurate or incomplete',
            'ask us to erase your information',
            'ask us to restrict how we use it',
            'object to our use of it where we rely on legitimate interests',
            'receive information you have given us in a portable format, where this applies',
            'withdraw consent at any time, where we rely on consent',
            'complain to the Information Commissioner’s Office',
          ],
        },
        {
          p: 'Some rights apply only in certain circumstances and are subject to legal exceptions; for example, we may need to keep accounting records even if you ask us to erase them. To exercise a right, email {email}. We will respond within the time limits set by law, normally one month.',
        },
      ],
    },
    {
      id: 'cookies',
      title: 'Cookies and analytics',
      blocks: [
        {
          p: 'This website does not use analytics, advertising or tracking cookies.',
        },
        {
          p: 'Some pages show an example 360° tour hosted by Panoee. When it loads, Panoee may use cookies or similar technologies in your browser under its own policies. If a spam check appears on the Get a Quote form, it is provided by Cloudflare Turnstile, as described above.',
        },
        {
          p: 'If we introduce analytics or other non-essential cookies, we will update this notice and ask for your consent first where the law requires it.',
        },
      ],
    },
    {
      id: 'complaints',
      title: 'Complaints',
      blocks: [
        {
          p: 'If you are unhappy with how we have handled your personal information, please email {email} first so we can try to put it right.',
        },
        {
          p: 'You also have the right to complain to the Information Commissioner’s Office, the UK regulator for data protection, at {ico}.',
        },
      ],
    },
    {
      id: 'changes',
      title: 'Changes to this notice',
      blocks: [
        {
          p: 'We may update this notice when our business, website, the services we use or legal requirements change. The current version is always published on this page, with the date it was last updated.',
        },
      ],
    },
  ],
};
