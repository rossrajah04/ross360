import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import { site } from '../content/site.js';
import { legal } from '../content/legal.js';

// Open legal decisions (governing law, licence, liability limit) are listed in src/content/legal.js.
// Nothing in this page is presented as legal advice having been obtained.
export default function Terms() {
  const { freeCancellationHours: hours, lateCancellationMaxPercent: percent } = site.policy;
  const mail = <a href={`mailto:${site.email}`}>{site.email}</a>;

  return (
    <>
      <Seo page="terms" />
      <PageHero
        title="Terms & Conditions"
        lead="The terms that apply when you book a ROSS 360 virtual tour."
      />
      <section className="section" aria-label="Terms and Conditions">
        <div className="container container--narrow prose">
          <p className="legal-meta">Last updated {legal.updated}</p>

          <h2>1. About these terms</h2>
          <p>
            These terms apply to services provided by {site.legalName} (“ROSS 360”, “we”, “us”). Each job is
            described in a written quote. Together, the quote you accept and these terms form our agreement with
            you. If the quote and these terms differ, the quote applies.
          </p>
          <p>Nothing in these terms affects your statutory rights as a consumer.</p>

          <h2>2. The service</h2>
          <p>
            We photograph the agreed areas of your premises in 360°, process the panoramas into an interactive
            virtual tour, and deliver it to you with a shareable link and embed code. The areas to be captured and
            anything else included are set out in your quote. Work not described in the quote is not included.
          </p>

          <h2>3. Quotes and pricing</h2>
          <p>
            Prices published on our website are starting prices. Your price depends on the size and complexity of
            the space, its location and any additional requirements, and is confirmed in your quote before you book.
            Any additional travel charge is shown in the quote. Property tours are individually quoted.
          </p>

          <h2>4. Booking and payment</h2>
          <p>
            Your booking is confirmed when you have accepted the quote and paid in full ({site.payment.upfrontPercent}%
            in advance). Payment is taken through our payment provider. After booking we send a short questionnaire
            to plan the capture.
          </p>

          <h2>5. Your responsibilities</h2>
          <ul>
            <li>Give us safe access to the agreed areas at the agreed time.</li>
            <li>
              Prepare the space before we arrive: clean, tidy and arranged as you want it to appear, with people,
              confidential paperwork and personal items out of view.
            </li>
            <li>Give us accurate information about the space and what you need.</li>
            <li>Make sure you have the authority to allow the premises to be photographed.</li>
          </ul>

          <h2>6. Photography and capture</h2>
          <p>
            We capture the agreed areas with reasonable skill and care. The finished tour shows the space as it was
            on the day of capture. If, when we arrive, an area is not ready to be photographed, we will discuss the
            options with you; capturing it on another day may be charged separately (see section 10).
          </p>

          <h2>7. Google Street View</h2>
          <p>
            Where appropriate, and only with your separate authorisation, we can publish agreed imagery to Google
            Street View. Google is a separate third-party platform. Google decides whether imagery is accepted and
            controls processing time, placement and availability, so we cannot guarantee any of these, or any effect
            on search rankings. Google publishing is not automatically included in property tours.
          </p>

          <h2>8. Hosting</h2>
          <p>
            {site.hosting.includedMonths} months of ROSS 360 interactive-tour hosting is included.{' '}
            {site.hosting.afterwards} Imagery published to Google Street View is held by Google and does
            not carry a ROSS 360 hosting fee.
          </p>

          <h2>9. Corrections</h2>
          <p>
            Please check your tour when it is delivered and tell us about any problem. If something is wrong because
            of an error on our part, such as an agreed area or panorama missing, or a technical fault we caused, we
            will correct it at no extra cost where reasonably practical.
          </p>
          <p>
            Changes requested for other reasons, for example a change of mind about what to include, new areas, or
            changes to the premises, are not corrections. We are happy to help and will quote for them separately.
          </p>

          <h2>10. Reshoots</h2>
          <p>
            If a reshoot is needed because of our error, it is carried out at no extra cost. A return visit is
            chargeable when it is needed for reasons outside our control, such as the agreed space not being ready
            or accessible at the appointment, or after refurbishment or other changes to the premises. We will
            always confirm the cost before arranging it.
          </p>

          <h2>11. Cancellation and rescheduling</h2>
          <ul>
            <li>You can cancel free of charge up to {hours} hours before the appointment.</li>
            <li>
              If you cancel within {hours} hours of the appointment, a charge of up to {percent}% of the booking
              price may apply, reflecting the time and costs reserved for the appointment.
            </li>
            <li>
              If we cannot access the premises, or no one is available at the appointment, a charge of up to{' '}
              {percent}% may also apply.
            </li>
            <li>If we need to cancel, we will offer to reschedule or give you a full refund.</li>
          </ul>
          <p>
            Where circumstances are genuinely exceptional, please contact us as early as you can. We will deal with
            the situation fairly and reasonably.
          </p>

          <h2>12. Permissions</h2>
          <p>We ask for three separate permissions. Each is recorded on its own:</p>
          <ul>
            <li>
              <strong>Service authorisation:</strong> permission to photograph the premises and create the tour.
              This is needed to carry out the work.
            </li>
            <li>
              <strong>Google publication:</strong> permission to publish agreed imagery to Google Street View. This
              is optional.
            </li>
            <li>
              <strong>Portfolio use:</strong> permission to show the project, its imagery and your business details
              in our portfolio and marketing. This is optional, and declining it does not affect your service.
            </li>
          </ul>

          <h2>13. Ownership and use of the tour</h2>
          {legal.licence ? (
            <p>{legal.licence}</p>
          ) : (
            <p>How you may use the finished tour and imagery is set out in your quote.</p>
          )}

          <h2>14. Third-party services</h2>
          <p>
            The service relies on third-party platforms, including Panoee for tour hosting and Google for Street
            View. Their availability and terms are outside our control.
          </p>

          <h2>15. Liability</h2>
          <p>
            Nothing in these terms limits or excludes liability that cannot be limited or excluded by law, including
            liability for death or personal injury caused by negligence, or for fraud.
          </p>
          {legal.liabilityCap ? <p>{legal.liabilityCap}</p> : null}

          <h2>16. Complaints</h2>
          <p>
            If you are unhappy with any part of the service, please email {mail} with the details. We will
            acknowledge your complaint, look into it properly and reply with what we will do to put it right.
          </p>

          <h2>17. Privacy</h2>
          <p>
            How we handle personal information is explained in our <Link to="/privacy">Privacy Notice</Link>.
          </p>

          {legal.governingLaw ? (
            <>
              <h2>18. Governing law</h2>
              <p>These terms are governed by {legal.governingLaw}.</p>
            </>
          ) : null}

          <h2>Contact</h2>
          <p>
            {site.legalName}. Email: {mail}.
          </p>
        </div>
      </section>
    </>
  );
}
