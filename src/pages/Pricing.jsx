import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import PricingCard from '../components/PricingCard.jsx';
import Checklist from '../components/Checklist.jsx';
import CtaBand from '../components/CtaBand.jsx';
import { plans, pricingNote, priceFactors, travelNote } from '../content/pricing.js';
import { coreDeliverable } from '../content/services.js';
import { site } from '../content/site.js';

export default function Pricing() {
  return (
    <>
      <Seo page="pricing" />
      <PageHero
        eyebrow="Pricing"
        title="360° virtual tour pricing"
        lead="Business tours have published starting prices. Property tours are quoted individually. Either way, you see the exact price before you book."
      />

      <section className="section" aria-labelledby="packages-heading">
        <div className="container">
          <SectionHeading
            id="packages-heading"
            title="Business packages"
            lead="Every package includes the same finished tour. The package is chosen by the size and complexity of the premises."
          />
          <div className="plans">
            {plans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>
          <p className="small">{pricingNote}</p>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="included-heading">
        <div className="container split">
          <SectionHeading
            id="included-heading"
            title="Included in every business package"
            lead="One professional 360° virtual tour, delivered ready to use."
          />
          <div>
            <Checklist items={coreDeliverable} />
            <p className="small">{site.hosting.afterwards}</p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="factors-heading">
        <div className="container">
          <SectionHeading id="factors-heading" title="What affects the final price" lead={travelNote} />
          <ul className="rule-grid rule-grid--four">
            {priceFactors.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="property-price-heading">
        <div className="container split">
          <SectionHeading id="property-price-heading" title="Property tours" />
          <div className="prose-block">
            <p>{site.propertyPricingNote}</p>
            <p>
              Google Street View is not included in property tours by default. Agencies with several properties or
              ongoing requirements can <Link to="/property#agencies">enquire about agency requirements</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="payment-heading">
        <div className="container split">
          <SectionHeading id="payment-heading" title="Payment and booking" />
          <div className="prose-block">
            <p>
              Your quote confirms the price, including any travel. Once you accept it, payment is taken in full (
              {site.payment.upfrontPercent}% upfront) and the appointment is booked.
            </p>
            <p>
              Free cancellation applies up to {site.policy.freeCancellationHours} hours before the appointment. Full
              details are in the <Link to="/terms">Terms &amp; Conditions</Link>.
            </p>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
