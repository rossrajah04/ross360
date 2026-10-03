import { Link } from 'react-router-dom';
import Button from '../Button.jsx';
import SectionHeading from '../SectionHeading.jsx';
import MediaFrame from '../MediaFrame.jsx';
import PricingCard from '../PricingCard.jsx';
import PortfolioGallery from '../PortfolioGallery.jsx';
import ProcessSteps from '../ProcessSteps.jsx';
import Checklist from '../Checklist.jsx';
import { site } from '../../content/site.js';
import { plans, lowestPrice, pricingHeading, pricingIntro, propertyPricingLine } from '../../content/pricing.js';
import {
  provides,
  reasons,
  businessPremises,
  propertyClients,
  agencyNote,
  projectIncludes,
  outOfScopeNote,
} from '../../content/services.js';
import { projects } from '../../content/portfolio.js';

// Hero
export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="container hero__grid">
        <div className="hero__text">
          <h1 id="hero-heading">{site.descriptor}</h1>
          <p className="lead">
            Professional 360° photography and interactive virtual tours for commercial premises and property.
          </p>
          <p className="hero__support">
            ROSS 360 creates detailed virtual tours that allow customers, clients, buyers and tenants to explore a
            space online before visiting.
          </p>
          <div className="btn-row">
            <Button to="/get-a-quote" variant="inverse">
              {site.cta.primary}
            </Button>
            <Button to="/portfolio" variant="outline-inverse">
              {site.cta.work}
            </Button>
          </div>
        </div>
        <MediaFrame image={site.images.hero} fallback className="hero__media" />
      </div>
      <div className="container">
        <ul className="hero__facts">
          <li>UK-wide service</li>
          <li>Business tours from £{lowestPrice}</li>
          <li>Property individually quoted</li>
          <li>{site.hosting.includedMonths} months’ hosting</li>
        </ul>
      </div>
    </section>
  );
}

// What ROSS 360 provides
export function WhatWeProvide() {
  return (
    <section className="section" aria-labelledby="provide-heading">
      <div className="container">
        <div className="split">
          <SectionHeading
            id="provide-heading"
            title="Professional 360° photography and virtual tour production"
          />
          <div className="prose-block">
            <p className="lead lead--ink">
              We photograph your premises in 360° and produce an interactive virtual tour that can be shared online
              and embedded into your website.
            </p>
            <p>Depending on the project, tours can also be prepared for publication on Google Street View.</p>
          </div>
        </div>
        <ul className="rule-grid rule-grid--four section-follow">
          {provides.map((item) => (
            <li key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Why use a 360° tour?
export function WhyUse() {
  return (
    <section className="section section--soft" aria-labelledby="why-heading">
      <div className="container">
        <div className="split">
          <SectionHeading id="why-heading" title="Give people a more complete view of your space" />
          <div className="prose-block">
            <p className="lead lead--ink">
              Traditional photographs show selected views. A 360° tour allows a visitor to look around the space
              themselves.
            </p>
            <p>
              This can be particularly useful for businesses and property where the layout, size and condition of
              the premises are important to the decision being made.
            </p>
          </div>
        </div>
        <ul className="rule-grid section-follow">
          {reasons.map((item) => (
            <li key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Who we work with
export function WhoWeWorkWith() {
  return (
    <section className="section" aria-labelledby="who-heading">
      <div className="container">
        <SectionHeading id="who-heading" title="Who we work with" />
        <div className="audience">
          <article className="audience__panel">
            <h3>Businesses</h3>
            <p>360° virtual tours for premises including:</p>
            <ul className="plain-list">
              {businessPremises.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link className="text-link" to="/businesses">
              Business virtual tours
            </Link>
          </article>
          <article className="audience__panel">
            <h3>Property</h3>
            <p>360° tours for:</p>
            <ul className="plain-list">
              {propertyClients.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link className="text-link" to="/property">
              Property tours
            </Link>
          </article>
        </div>
        <p className="small section-note">{agencyNote}</p>
      </div>
    </section>
  );
}

// What you receive
export function WhatYouReceive() {
  return (
    <section className="section section--soft" aria-labelledby="receive-heading">
      <div className="container split">
        <SectionHeading
          id="receive-heading"
          title="A complete virtual tour, ready to use"
          lead="Your project includes:"
        />
        <div>
          <Checklist items={projectIncludes} />
          <p className="small">{outOfScopeNote}</p>
        </div>
      </div>
    </section>
  );
}

// How it works
export function HowItWorks() {
  return (
    <section id="how-it-works" className="section" aria-labelledby="how-heading">
      <div className="container">
        <SectionHeading id="how-heading" title="A straightforward process from photography to delivery" />
        <ProcessSteps />
      </div>
    </section>
  );
}

// Business pricing
export function PricingPreview() {
  return (
    <section className="section section--soft" aria-labelledby="pricing-heading">
      <div className="container">
        <SectionHeading id="pricing-heading" title={pricingHeading} lead={pricingIntro} />
        <div className="plans">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
        <p className="small">
          {propertyPricingLine} <Link to="/pricing">Pricing factors</Link>
        </p>
      </div>
    </section>
  );
}

// Portfolio (only once there is genuine work to show)
export function PortfolioSection() {
  if (projects.length === 0) return null;
  return (
    <section className="section" aria-labelledby="work-heading">
      <div className="container">
        <SectionHeading id="work-heading" title="Our Work" lead="Selected 360° virtual tours produced by ROSS 360." />
        <PortfolioGallery headingLevel="h3" />
        <p className="small">
          <Link to="/portfolio">{site.cta.work}</Link>
        </p>
      </div>
    </section>
  );
}
