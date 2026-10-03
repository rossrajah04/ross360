import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import { site } from '../content/site.js';
import { legal } from '../content/legal.js';

// Providers listed here must match the services actually in use.
// Open decisions (specific retention periods) are listed in src/content/legal.js.
export default function Privacy() {
  const mail = <a href={`mailto:${site.email}`}>{site.email}</a>;

  return (
    <>
      <Seo page="privacy" />
      <PageHero title="Privacy Notice" lead="How ROSS 360 collects, uses and protects personal information." />
      <section className="section" aria-label="Privacy Notice">
        <div className="container container--narrow prose">
          <p className="legal-meta">Last updated {legal.updated}</p>

          <h2>1. Who we are</h2>
          <p>
            This website and the ROSS 360 service are operated by {site.legalName}. {site.founder} is the
            controller of the personal information described in this notice. For any privacy question, or to
            exercise your rights, email {mail}.
          </p>

          <h2>2. Information we collect</h2>
          <ul>
            <li>
              <strong>Enquiry details:</strong> what you enter in the quote form: your name, business or
              organisation, email address, phone number if given, project type, address and postcode, details about
              the space, preferred timeframe, and any website, Google link or message you add.
            </li>
            <li>
              <strong>Correspondence:</strong> emails and other messages between you and us.
            </li>
            <li>
              <strong>Booking and payment records:</strong> quotes, bookings, invoices and payments. Card details are
              entered with our payment provider, Stripe, and are not seen or stored by us.
            </li>
            <li>
              <strong>Photography and tour content:</strong> 360° imagery of the premises you ask us to capture (see
              section 8).
            </li>
            <li>
              <strong>Technical information:</strong> our hosting provider processes basic technical data, such as
              IP addresses, to deliver the website securely and protect it from misuse.
            </li>
          </ul>

          <h2>3. Why we use it, and our lawful basis</h2>
          <ul>
            <li>
              <strong>To respond to your enquiry, prepare a quote and provide the service.</strong> Lawful basis:
              taking steps at your request before entering into a contract, and performing that contract.
            </li>
            <li>
              <strong>To run the business, keep records and protect the website from spam and misuse.</strong>{' '}
              Lawful basis: our legitimate interests in operating a secure and well-run business.
            </li>
            <li>
              <strong>To keep records the law requires, such as accounting records.</strong> Lawful basis: legal
              obligation.
            </li>
            <li>
              <strong>To use project imagery in our portfolio, or publish imagery to Google Street View.</strong>{' '}
              Lawful basis: your permission, which you can withdraw at any time by emailing {mail}.
            </li>
          </ul>

          <h2>4. Who we share it with</h2>
          <p>
            We use the following service providers. Each receives only the information it needs for the purpose
            described:
          </p>
          <ul>
            <li>Cloudflare: website hosting, domain and security.</li>
            <li>Resend: delivering enquiries from the website form to our inbox.</li>
            <li>Google Workspace: business email.</li>
            <li>Google Sheets: internal business records.</li>
            <li>Stripe: taking payment after you accept a quote.</li>
            <li>Panoee: hosting interactive 360° tours.</li>
            <li>Google: publishing agreed imagery to Google Street View, only where you have authorised it.</li>
          </ul>
          <p>We do not sell personal information, and we do not use it for advertising.</p>

          <h2>5. Processing outside the UK</h2>
          <p>
            Some of these providers may process information outside the UK. Where they do, the transfer must be
            protected by the safeguards UK data protection law requires. You can email {mail} for more information
            about the safeguards that apply.
          </p>

          <h2>6. How long we keep it</h2>
          {legal.retention ? (
            <p>{legal.retention}</p>
          ) : (
            <p>
              We keep personal information only for as long as we need it for the purposes above. Enquiries that do
              not lead to a booking are kept only as long as needed to deal with them and any follow-up. Booking,
              invoice and payment records are kept for as long as the law requires for accounting and tax purposes.
              Tour content is kept for as long as the tour is hosted, and for any longer period you agree to.
            </p>
          )}

          <h2>7. Your rights</h2>
          <p>
            Under UK data protection law you have the right to access the personal information we hold about you,
            and to ask us to correct it, erase it, restrict its use or transfer it, and to object to how we use it.
            Some rights apply only in certain circumstances. To exercise a right, email {mail}.
          </p>
          <p>
            If you are unhappy with how we have handled your information, please contact us first. You can also
            complain to the Information Commissioner’s Office at <a href="https://ico.org.uk">ico.org.uk</a>.
          </p>

          <h2>8. Photography</h2>
          <p>
            360° photography records everything visible from each viewpoint. Before the visit we ask customers to
            make sure people, confidential paperwork and personal items are out of view. If anything identifiable is
            captured unintentionally, please tell us and we will deal with it. Permission to photograph the
            premises, permission to publish imagery to Google and permission to use a project in our portfolio are
            each recorded separately.
          </p>

          <h2>9. Cookies and analytics</h2>
          <p>
            This website does not use analytics or advertising cookies. If that changes, we will update this notice
            and ask for your consent where the law requires it. If a spam check is shown on the quote form, it is
            provided by Cloudflare Turnstile, which processes technical information from your browser to tell people
            and automated software apart.
          </p>

          <h2>10. Changes to this notice</h2>
          <p>We may update this notice from time to time. The current version is always published on this page.</p>
        </div>
      </section>
    </>
  );
}
