import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import LegalDraftNotice from '../components/LegalDraftNotice.jsx';
import { Link } from 'react-router-dom';
import { site } from '../content/site.js';

// DRAFT structure for review. Wording that is not yet decided is shown in [square brackets].
export default function Terms() {
  const { freeCancellationHours: hours, lateCancellationMaxPercent: percent } = site.policy;

  return (
    <>
      <Seo page="terms" />
      <PageHero title="Terms & Conditions" lead="The terms that apply to ROSS 360 virtual tour services." />
      <section className="section" aria-label="Terms and Conditions">
        <div className="container container--narrow prose">
          <LegalDraftNotice />

          <h2>1. About these terms</h2>
          <p>
            These terms apply to services provided by {site.legalName} (“ROSS 360”, “we”, “us”). Each booking is
            confirmed in a quote that sets out the details for that job.
          </p>

          <h2>2. Service scope</h2>
          <p>
            We capture spaces in 360°, produce an interactive virtual tour and deliver it to you, as described in
            your quote. Anything not described in the quote is not included.
          </p>

          <h2>3. Pricing</h2>
          <p>
            Published prices are starting prices. Final pricing depends on the size and complexity of the space,
            location and any additional requirements, and is confirmed in your quote before you book. Any additional
            travel charge is confirmed in the quote before payment. Property tours are individually quoted.
          </p>

          <h2>4. Quotes, booking and payment</h2>
          <p>
            After you send an enquiry, we review the location and scope and send a quote. When you accept the
            quote, payment is taken in full up front ({site.payment.upfrontPercent}%), and your booking is then
            confirmed. We then send a detailed questionnaire to prepare for the capture.
          </p>

          <h2>5. Customer responsibilities</h2>
          <p>
            You agree to provide safe access to the premises at the agreed time, to prepare the space for
            photography, and to give us accurate information about the space and your requirements. You confirm
            that you have the authority to allow us to photograph the premises.
          </p>

          <h2>6. Photography and capture</h2>
          <p>
            We will capture the agreed areas with reasonable care. The finished tour reflects the space as it was
            on the day of capture.
          </p>

          <h2>7. Google publishing</h2>
          <p>
            Where appropriate and with your separate authorisation, we may publish agreed imagery to Google Street
            View. Google is a separate third-party platform. We cannot guarantee approval, processing time,
            placement or availability, or any effect on search rankings.
          </p>

          <h2>8. Interactive tour hosting</h2>
          <p>
            {site.hosting.includedMonths} months of ROSS 360 interactive-tour hosting is included. {site.hosting.afterwards}{' '}
            [Hosting terms after the initial period to be confirmed.] Google Street View is a separate platform
            and does not carry a ROSS 360 hosting fee.
          </p>

          <h2>9. Corrections</h2>
          <p>
            If you notice a problem with your delivered tour, please tell us and we will review it. [Time limit and
            process for corrections to be confirmed.]
          </p>

          <h2>10. Reshoots</h2>
          <p>[Reshoot terms to be confirmed.]</p>

          <h2>11. Cancellation</h2>
          <ul>
            <li>You can cancel free of charge up to {hours} hours before the scheduled appointment.</li>
            <li>
              Cancellations within {hours} hours may incur a charge of up to {percent}% of the booking price,
              reflecting time and costs reserved for the appointment.
            </li>
            <li>
              If we cannot access the premises or no one is available at the appointment, a charge of up to{' '}
              {percent}% may also apply.
            </li>
            <li>If ROSS 360 cancels, we will reschedule or give you a full refund.</li>
          </ul>
          <p>[Final cancellation wording to be confirmed.]</p>

          <h2>12. Permissions</h2>
          <p>We ask for three separate permissions, and each can be given or declined on its own:</p>
          <ul>
            <li>
              <strong>Service authorisation:</strong> permission to photograph the premises and create the tour.
            </li>
            <li>
              <strong>Google publication authorisation:</strong> permission to publish agreed imagery to Google where
              applicable.
            </li>
            <li>
              <strong>Portfolio permission:</strong> permission to use project imagery and business information for
              our portfolio and marketing.
            </li>
          </ul>

          <h2>13. Intellectual property and licensing</h2>
          <p>[Ownership of the imagery and tour, and the licence granted to you, to be confirmed.]</p>

          <h2>14. Third-party services</h2>
          <p>
            Our service relies on third-party platforms, including Panoee for tour hosting and Google for Street
            View. Their availability and terms are outside our control.
          </p>

          <h2>15. Liability</h2>
          <p>
            Nothing in these terms limits any liability that cannot be limited by law. [Remaining liability wording
            to be confirmed.]
          </p>

          <h2>16. Complaints</h2>
          <p>
            If you are unhappy with any part of the service, please email <a href={`mailto:${site.email}`}>{site.email}</a>{' '}
            and we will do our best to put it right. [Complaints process to be confirmed.]
          </p>

          <h2>17. Privacy</h2>
          <p>
            How we handle personal information is explained in our <Link to="/privacy">Privacy Notice</Link>.
          </p>

          <h2>18. Governing law</h2>
          <p>[Governing law and jurisdiction to be confirmed.]</p>
        </div>
      </section>
    </>
  );
}
