import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import LegalDraftNotice from '../components/LegalDraftNotice.jsx';
import { site } from '../content/site.js';

// DRAFT structure for review. Wording that is not yet decided is shown in [square brackets].
export default function Privacy() {
  return (
    <>
      <Seo page="privacy" />
      <PageHero title="Privacy Notice" lead="How ROSS 360 collects, uses and protects personal information." />
      <section className="section" aria-label="Privacy Notice">
        <div className="container container--narrow prose">
          <LegalDraftNotice />

          <h2>1. Who we are</h2>
          <p>
            This website is operated by {site.legalName}. For data protection purposes, {site.founder} is the
            person responsible for the personal information described in this notice. You can contact us at{' '}
            <a href={`mailto:${site.email}`}>{site.email}</a>.
          </p>

          <h2>2. Information we collect</h2>
          <ul>
            <li>
              <strong>Enquiry details:</strong> the information you enter in the quote form, such as your name,
              business or organisation, email address, optional phone number, project type, address, postcode,
              details about the space, preferred timeframe, and any website, Google link or message you choose to
              add.
            </li>
            <li>
              <strong>Correspondence:</strong> emails and other messages between you and us.
            </li>
            <li>
              <strong>Booking and payment records:</strong> details of quotes, bookings and payments. Card details
              are entered with our payment provider and are not stored by us.
            </li>
            <li>
              <strong>Photography and tour content:</strong> 360° imagery of the premises you ask us to capture
              (see section 8).
            </li>
          </ul>

          <h2>3. Why we use it, and our lawful basis</h2>
          <ul>
            <li>
              To respond to your enquiry, prepare a quote and, if you go ahead, provide the service: taking steps at
              your request before entering a contract, and performing a contract.
            </li>
            <li>
              To run and improve our business, keep records and protect the website against spam and misuse:
              our legitimate interests.
            </li>
            <li>To keep records we are legally required to keep, such as accounting records: legal obligation.</li>
            <li>
              Where we ask for your permission (for example, to use project imagery in our portfolio), we rely on
              your consent, which you can withdraw at any time.
            </li>
          </ul>

          <h2>4. Who we share it with</h2>
          <p>We use trusted providers to run the website and the service. Depending on what you ask us to do, these may include:</p>
          <ul>
            <li>Cloudflare, for website hosting, DNS and security.</li>
            <li>Resend, to deliver enquiries from the website form to our inbox.</li>
            <li>Google Workspace, for business email.</li>
            <li>Stripe, to take payment after you accept a quote.</li>
            <li>Panoee, to host interactive 360° tours.</li>
            <li>Google, if you authorise us to publish agreed imagery to Google Street View.</li>
            <li>Google Sheets, for our internal business records.</li>
          </ul>
          <p>We do not sell your personal information.</p>

          <h2>5. Transfers outside the UK</h2>
          <p>
            Some of these providers may process information outside the UK. [Details of safeguards to be confirmed.]
          </p>

          <h2>6. How long we keep it</h2>
          <p>[Retention periods to be confirmed.]</p>

          <h2>7. Your rights</h2>
          <p>
            Under UK data protection law you have rights including access to your information, correction,
            erasure, restriction, objection and, in some cases, portability. To exercise a right, contact us at{' '}
            <a href={`mailto:${site.email}`}>{site.email}</a>. You can also complain to the Information
            Commissioner’s Office at <a href="https://ico.org.uk">ico.org.uk</a>.
          </p>

          <h2>8. Photography and data considerations</h2>
          <p>
            360° photography of premises may incidentally capture people, signage, documents or personal items.
            Customers are asked to prepare the space before capture. [Handling of people and sensitive items to be
            confirmed.] Permission to photograph the premises, permission to publish to Google and permission to use
            project imagery in our portfolio are each recorded separately.
          </p>

          <h2>9. Cookies and analytics</h2>
          <p>
            This website does not currently use analytics or advertising cookies. If we add them in future, we will
            update this notice and ask for consent where required. If the optional Cloudflare Turnstile spam check
            is enabled on the quote form, Cloudflare may process technical information from your browser to run that
            check.
          </p>

          <h2>10. Changes to this notice</h2>
          <p>We may update this notice from time to time. The current version is always on this page.</p>
        </div>
      </section>
    </>
  );
}
