import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import PricingCard from '../components/PricingCard.jsx';
import Checklist from '../components/Checklist.jsx';
import CtaBand from '../components/CtaBand.jsx';
import { plans, pricingNote, travelNote } from '../content/pricing.js';
import { coreDeliverable } from '../content/services.js';
import { site, hostingIncludedLine } from '../content/site.js';

export default function Pricing() {
  return (
    <>
      <Seo page="pricing" />
      <PageHero
        eyebrow="Pricing"
        title="Clear pricing for 360° virtual tours"
        lead="Business tour packages start from the prices below. The right package depends mainly on the size and complexity of the space."
      />

      <section className="section" aria-labelledby="packages-heading">
        <div className="container">
          <SectionHeading id="packages-heading" title="Business tour packages" lead={pricingNote} />
          <div className="plans">
            {plans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="included-heading">
        <div className="container split">
          <SectionHeading
            id="included-heading"
            title="What every tour includes"
            lead="A single professional 360° virtual tour, delivered ready to use."
          />
          <div>
            <Checklist
              items={coreDeliverable.map((item) =>
                item === 'Initial hosting' ? `Initial hosting (${site.hosting.includedMonths} months)` : item,
              )}
            />
            <p>{hostingIncludedLine}</p>
            <p>{site.hosting.afterwards}</p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="property-price-heading">
        <div className="container split">
          <SectionHeading id="property-price-heading" title="Property tours" />
          <div>
            <p>{site.propertyPricingShort}</p>
            <p>
              Working with an agency? See <Link to="/property#agencies">agency requirements</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="travel-heading">
        <div className="container split">
          <SectionHeading id="travel-heading" title="Location and travel" />
          <div>
            <p>{travelNote}</p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="payment-heading">
        <div className="container split">
          <SectionHeading id="payment-heading" title="How payment works" />
          <div>
            <p>
              After you accept your quote, payment is taken in full up front ({site.payment.upfrontPercent}%) and
              your booking is confirmed. Free cancellation applies up to {site.policy.freeCancellationHours} hours
              before the appointment; see the <Link to="/terms">Terms &amp; Conditions</Link> for details.
            </p>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
