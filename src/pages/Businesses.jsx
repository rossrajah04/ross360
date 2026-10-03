import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import FeeSchedule from '../components/FeeSchedule.jsx';
import Checklist from '../components/Checklist.jsx';
import Frame from '../components/Frame.jsx';
import ProcessSteps from '../components/ProcessSteps.jsx';
import CtaBand from '../components/CtaBand.jsx';
import Button from '../components/Button.jsx';
import { businessPremises, projectIncludes, outOfScopeNote } from '../content/services.js';
import { pricingHeading, pricingIntro } from '../content/pricing.js';
import { site } from '../content/site.js';

export default function Businesses() {
  return (
    <>
      <Seo page="businesses" />
      <PageHero
        title="360° Virtual Tours for Businesses"
        lead="Professional 360° photography and interactive virtual tours for commercial premises."
      >
        <div className="btn-row">
          <Button to="/get-a-quote?type=business">{site.cta.primary}</Button>
        </div>
      </PageHero>

      <div className="container container--wide page-media">
        <Frame image={site.images.business} ratio="wide" caption="Business premises" />
      </div>

      <section className="section" aria-labelledby="premises-heading">
        <div className="container">
          <SectionHeading id="premises-heading" title="Premises we photograph">
            <p className="lead lead--ink">360° virtual tours for premises including:</p>
            <Checklist items={businessPremises} columns />
          </SectionHeading>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="receive-heading">
        <div className="container">
          <SectionHeading id="receive-heading" title="A complete virtual tour, ready to use">
            <p className="lead lead--ink">Your project includes:</p>
            <Checklist items={projectIncludes} />
            <p className="small">{outOfScopeNote}</p>
          </SectionHeading>
        </div>
      </section>

      <section id="business-pricing" className="section" aria-labelledby="business-pricing-heading">
        <div className="container">
          <SectionHeading id="business-pricing-heading" title={pricingHeading} lead={pricingIntro} />
          <FeeSchedule />
          <p className="section-note">
            <Link to="/pricing">Pricing factors</Link>
          </p>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="process-heading">
        <div className="container">
          <SectionHeading id="process-heading" title="A straightforward process from photography to delivery" />
          <ProcessSteps />
        </div>
      </section>

      <CtaBand to="/get-a-quote?type=business" />
    </>
  );
}
