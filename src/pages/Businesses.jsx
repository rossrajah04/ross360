import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import PricingCard from '../components/PricingCard.jsx';
import CtaBand from '../components/CtaBand.jsx';
import Button from '../components/Button.jsx';
import { businessSectors } from '../content/services.js';
import { plans, pricingNote } from '../content/pricing.js';
import { site } from '../content/site.js';

export default function Businesses() {
  return (
    <>
      <Seo page="businesses" />
      <PageHero
        eyebrow="For businesses"
        title="360° virtual tours for businesses"
        lead="Let customers and visitors look around your premises online, so they know what to expect before they arrive."
      >
        <div className="btn-row">
          <Button to="/get-a-quote?type=business">{site.cta.primary}</Button>
        </div>
      </PageHero>

      <section className="section" aria-labelledby="sectors-heading">
        <div className="container">
          <SectionHeading
            id="sectors-heading"
            title="Practical ways businesses use a virtual tour"
            lead="ROSS 360 works with restaurants, cafés, gyms, studios, hotels, wedding and event venues, retail, showrooms, clinics, offices and other commercial premises."
          />
          <ul className="rule-grid">
            {businessSectors.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="business-pricing-heading">
        <div className="container">
          <SectionHeading
            id="business-pricing-heading"
            title="Starting prices"
            lead={pricingNote}
          />
          <div className="plans">
            {plans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>
          <p className="small">
            Looking for property work? See <Link to="/property">360° property tours</Link>.
          </p>
        </div>
      </section>

      <CtaBand to="/get-a-quote?type=business" />
    </>
  );
}
