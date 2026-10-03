import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import PricingCard from '../components/PricingCard.jsx';
import Checklist from '../components/Checklist.jsx';
import MediaFrame from '../components/MediaFrame.jsx';
import CtaBand from '../components/CtaBand.jsx';
import Button from '../components/Button.jsx';
import { businessSectors, businessChannels, coreDeliverable } from '../content/services.js';
import { plans, pricingNote } from '../content/pricing.js';
import { site } from '../content/site.js';

export default function Businesses() {
  return (
    <>
      <Seo page="businesses" />
      <PageHero
        eyebrow="For businesses"
        title="360° virtual tours for businesses"
        lead="A professionally produced tour of your premises, so customers know what to expect before they book, join or visit."
      >
        <div className="btn-row">
          <Button to="/get-a-quote?type=business">{site.cta.primary}</Button>
          <Button href="#business-pricing" variant="secondary">
            {site.cta.pricing}
          </Button>
        </div>
      </PageHero>

      <MediaFrame image={site.images.business} tone="light" className="page-media container" />

      <section className="section" aria-labelledby="sectors-heading">
        <div className="container">
          <SectionHeading
            id="sectors-heading"
            title="How businesses use a tour"
            lead="The value of a tour depends on the decision your customers are making. These are the most common uses."
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

      <section className="section section--soft" aria-labelledby="channels-heading">
        <div className="container split">
          <SectionHeading
            id="channels-heading"
            title="Where the finished tour goes"
            lead="You receive a link and embed code, so the tour can sit wherever customers look for you."
          />
          <ul className="rule-list">
            {businessChannels.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="included-heading">
        <div className="container split">
          <SectionHeading
            id="included-heading"
            title="Included in every package"
            lead="Packages differ by the size and complexity of the premises, not by what you receive."
          />
          <Checklist items={coreDeliverable} />
        </div>
      </section>

      <section id="business-pricing" className="section section--soft" aria-labelledby="business-pricing-heading">
        <div className="container">
          <SectionHeading id="business-pricing-heading" title="Business packages" lead={pricingNote} />
          <div className="plans">
            {plans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>
          <p className="small">
            <Link to="/pricing">See what affects the final price</Link>
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="next-heading">
        <div className="container split">
          <SectionHeading id="next-heading" title="What happens after you enquire" />
          <ol className="next-steps">
            <li>We reply {site.responseTime} and review the location and what needs to be captured.</li>
            <li>We send a quote with your exact price, including any travel.</li>
            <li>If you go ahead, you pay and we agree an appointment. If not, there is nothing to cancel.</li>
          </ol>
        </div>
      </section>

      <CtaBand to="/get-a-quote?type=business" />
    </>
  );
}
