import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import FeeSchedule from '../components/FeeSchedule.jsx';
import CtaBand from '../components/CtaBand.jsx';
import { pricingHeading, pricingIntro, priceFactors, propertyPricingLine } from '../content/pricing.js';
import { site } from '../content/site.js';

export default function Pricing() {
  return (
    <>
      <Seo page="pricing" />
      <PageHero title="Pricing" lead={pricingIntro} />

      <section className="section" aria-labelledby="packages-heading">
        <div className="container">
          <SectionHeading id="packages-heading" title={pricingHeading} />
          <FeeSchedule />
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="factors-heading">
        <div className="container">
          <SectionHeading id="factors-heading" title="Pricing factors">
            <ol className="ruled-list ruled-list--numbered">
              {priceFactors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <p>
              {propertyPricingLine} <Link to="/property">Property tours</Link>
            </p>
          </SectionHeading>
        </div>
      </section>

      <section className="section" aria-labelledby="payment-heading">
        <div className="container">
          <SectionHeading id="payment-heading" title="Payment and hosting">
            <p>
              Payment is made in full once the quotation is accepted. Cancellation is free up to{' '}
              {site.policy.freeCancellationHours} hours before the appointment.
            </p>
            <p>
              {site.hosting.includedMonths} months’ hosting is included. {site.hosting.afterwards}
            </p>
            <p>
              Full details are set out in the <Link to="/terms">Terms &amp; Conditions</Link>.
            </p>
          </SectionHeading>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
