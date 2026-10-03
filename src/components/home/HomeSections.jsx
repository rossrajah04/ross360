import { Link } from 'react-router-dom';
import Button from '../Button.jsx';
import SectionHeading from '../SectionHeading.jsx';
import Frame from '../Frame.jsx';
import FeeSchedule from '../FeeSchedule.jsx';
import PortfolioGallery from '../PortfolioGallery.jsx';
import ProcessSteps from '../ProcessSteps.jsx';
import { site } from '../../content/site.js';
import { lowestPrice, pricingHeading, pricingIntro, propertyPricingLine } from '../../content/pricing.js';
import { provides, businessPremises, propertyClients, agencyNote } from '../../content/services.js';
import { projects } from '../../content/portfolio.js';

// 1. Hero: typography, then a large image area reserved for real 360° photography, then the facts.
export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="container hero__top">
        <h1 id="hero-heading" className="hero__title">
          {site.descriptor}
        </h1>
        <div className="hero__body">
          <p className="lead lead--ink">
            Professional 360° photography and interactive virtual tours for commercial premises and property.
          </p>
          <p>
            ROSS 360 creates detailed virtual tours that allow customers, clients, buyers and tenants to explore a
            space online before visiting.
          </p>
          <div className="btn-row">
            <Button to="/get-a-quote">{site.cta.primary}</Button>
            <Button to="/portfolio" variant="secondary">
              {site.cta.work}
            </Button>
          </div>
        </div>
      </div>
      <div className="container container--wide">
        <Frame image={site.images.hero} ratio="wide" caption="360° photography" className="hero__media" />
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

// 3. What ROSS 360 provides: an indexed list rather than feature cards.
export function WhatWeProvide() {
  return (
    <section className="section" aria-labelledby="provide-heading">
      <div className="container">
        <SectionHeading id="provide-heading" title="Professional 360° photography and virtual tour production">
          <p className="lead lead--ink">
            We photograph your premises in 360° and produce an interactive virtual tour that can be shared online
            and embedded into your website.
          </p>
          <p>Depending on the project, tours can also be prepared for publication on Google Street View.</p>
        </SectionHeading>
        <ol className="index-list">
          {provides.map((item, index) => (
            <li key={item.title} className="index-list__item">
              <span className="index-list__num" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="index-list__title">{item.title}</h3>
              <p className="index-list__text">{item.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// 4. Business and property: two applications, each led by a large image area.
export function Applications() {
  return (
    <section className="section section--soft" aria-labelledby="who-heading">
      <div className="container">
        <SectionHeading id="who-heading" title="Who we work with" />

        <article className="application" aria-labelledby="app-business">
          <Frame image={site.images.business} ratio="landscape" caption="Business premises" className="application__media" />
          <div className="application__body">
            <h3 id="app-business" className="application__title">
              Businesses
            </h3>
            <p>360° virtual tours for premises including:</p>
            <ul className="columns-list">
              {businessPremises.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link className="text-link" to="/businesses">
              Business virtual tours
            </Link>
          </div>
        </article>

        <article className="application application--reverse" aria-labelledby="app-property">
          <Frame image={site.images.property} ratio="landscape" caption="Property" className="application__media" />
          <div className="application__body">
            <h3 id="app-property" className="application__title">
              Property
            </h3>
            <p>360° tours for:</p>
            <ul className="columns-list">
              {propertyClients.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link className="text-link" to="/property">
              Property tours
            </Link>
          </div>
        </article>

        <p className="section-note">{agencyNote}</p>
      </div>
    </section>
  );
}

// 5. Selected work. Image-led once projects exist; a composed statement until then.
export function SelectedWork() {
  const hasProjects = projects.length > 0;
  return (
    <section className="section section--dark" aria-labelledby="work-heading">
      <div className="container">
        <SectionHeading id="work-heading" title="Our Work">
          <p className="lead">Selected 360° virtual tours produced by ROSS 360.</p>
          {hasProjects ? null : (
            <p>
              Our portfolio is currently being developed. New business and property projects will be added here as
              they are completed.
            </p>
          )}
          <Link className="text-link" to="/portfolio">
            {site.cta.work}
          </Link>
        </SectionHeading>
        {hasProjects ? <PortfolioGallery headingLevel="h3" limit={3} /> : null}
      </div>
    </section>
  );
}

// 6. Process
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

// 7. Pricing
export function PricingPreview() {
  return (
    <section className="section section--soft" aria-labelledby="pricing-heading">
      <div className="container">
        <SectionHeading id="pricing-heading" title={pricingHeading} lead={pricingIntro} />
        <FeeSchedule />
        <p className="section-note">
          {propertyPricingLine} <Link to="/pricing">Pricing factors</Link>
        </p>
      </div>
    </section>
  );
}

// 8. About / founder
export function AboutPreview() {
  const photo = site.images.founder;
  return (
    <section className="section" aria-labelledby="about-heading">
      <div className={`container${photo ? ' founder' : ''}`}>
        {photo ? <Frame image={photo} ratio="portrait" className="founder__photo" /> : null}
        <SectionHeading id="about-heading" title="About ROSS 360">
          <p className="lead lead--ink">
            ROSS 360 was founded by {site.founder} to provide businesses and property professionals with a
            straightforward way to present their premises online.
          </p>
          <p>
            Each project is handled directly from initial enquiry through photography, tour production and delivery.
          </p>
          <p>
            The focus is simple: accurate photography, professionally produced tours and a clear service from start
            to finish.
          </p>
        </SectionHeading>
      </div>
    </section>
  );
}
