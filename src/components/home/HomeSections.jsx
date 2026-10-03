import { Link } from 'react-router-dom';
import Button from '../Button.jsx';
import SectionHeading from '../SectionHeading.jsx';
import TourEmbed from '../TourEmbed.jsx';
import PricingCard from '../PricingCard.jsx';
import PortfolioGallery from '../PortfolioGallery.jsx';
import FAQItem from '../FAQItem.jsx';
import ProcessSteps from '../ProcessSteps.jsx';
import Checklist from '../Checklist.jsx';
import { site } from '../../content/site.js';
import { plans, pricingNote } from '../../content/pricing.js';
import { whatYouReceive, whyThreeSixty } from '../../content/services.js';
import { faqs } from '../../content/faq.js';

// 1. Hero
export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      {/* Decorative 360° motif: abstract lines only, not a photograph and not a tour. */}
      <svg className="hero__backdrop" viewBox="0 0 1200 600" aria-hidden="true" focusable="false">
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <ellipse cx="900" cy="300" rx="120" ry="280" />
          <ellipse cx="900" cy="300" rx="240" ry="280" />
          <ellipse cx="900" cy="300" rx="360" ry="280" />
          <ellipse cx="900" cy="300" rx="480" ry="280" />
          <line x1="420" y1="300" x2="1380" y2="300" />
          <path d="M470 170 Q900 130 1330 170" />
          <path d="M470 430 Q900 470 1330 430" />
        </g>
      </svg>
      <div className="container hero__inner">
        <h1 id="hero-heading">{site.descriptor}</h1>
        <p className="lead">
          ROSS 360 captures your space in 360° and turns it into an interactive online tour, so customers, buyers
          and visitors can explore it before they visit.
        </p>
        <div className="btn-row">
          <Button to="/get-a-quote" variant="inverse">
            {site.cta.primary}
          </Button>
          <Button to="/portfolio" variant="outline-inverse">
            {site.cta.secondary}
          </Button>
        </div>
      </div>
    </section>
  );
}

// 2. Explore a Real Tour (labelled as an example until genuine work is added)
export function ExploreTour() {
  const real = site.exampleTour.isRealProject;
  return (
    <section className="section section--soft" aria-labelledby="explore-heading">
      <div className="container">
        <SectionHeading
          id="explore-heading"
          eyebrow={real ? 'Interactive tour' : 'Example Tour'}
          title={real ? 'Explore a real tour' : 'Explore an example tour'}
          lead={
            real
              ? 'Look around and move through the space, just as a visitor would.'
              : 'This is a demonstration experience, not a client project. Genuine ROSS 360 tours will replace it as projects are completed.'
          }
        />
        <TourEmbed className="tour-stage--large" />
      </div>
    </section>
  );
}

// 3. What ROSS 360 does
export function WhatWeDo() {
  return (
    <section className="section" aria-labelledby="what-heading">
      <div className="container split">
        <SectionHeading
          id="what-heading"
          eyebrow="What ROSS 360 does"
          title="Your space, explorable online"
          lead="ROSS 360 captures spaces in 360° and turns them into interactive online experiences."
        />
        <div>
          <p>A finished tour can be used in a number of places:</p>
          <ul className="rule-list">
            <li>
              <strong>Your website</strong>
              <span>Embed the tour where visitors can explore it.</span>
            </li>
            <li>
              <strong>Online marketing</strong>
              <span>Share a link wherever you promote your space.</span>
            </li>
            <li>
              <strong>Property listings</strong>
              <span>Where appropriate, alongside a listing.</span>
            </li>
            <li>
              <strong>Google Maps / Street View</strong>
              <span>Where appropriate, for business tours.</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

// 4. Why 360°
export function WhyThreeSixty() {
  return (
    <section className="section section--soft" aria-labelledby="why-heading">
      <div className="container">
        <SectionHeading id="why-heading" eyebrow="Why 360°" title="A better way to show a space" />
        <ul className="rule-grid">
          {whyThreeSixty.map((item) => (
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

// 5. Who it's for
export function WhoItsFor() {
  return (
    <section className="section" aria-labelledby="who-heading">
      <div className="container">
        <SectionHeading id="who-heading" eyebrow="Who it’s for" title="Two ways we work" />
        <div className="audience">
          <article className="audience__panel">
            <h3>Businesses</h3>
            <p>
              Restaurants, gyms, hotels, venues, retail, showrooms, clinics, offices and other commercial spaces.
            </p>
            <Button to="/businesses" variant="secondary">
              {site.cta.business}
            </Button>
          </article>
          <article className="audience__panel audience__panel--dark">
            <h3>Property &amp; Estate Agents</h3>
            <p>Residential property, commercial property, developers and estate agencies.</p>
            <Button to="/property" variant="inverse">
              {site.cta.property}
            </Button>
          </article>
        </div>
      </div>
    </section>
  );
}

// 6. What you receive
export function WhatYouReceive() {
  return (
    <section className="section section--soft" aria-labelledby="receive-heading">
      <div className="container split">
        <SectionHeading
          id="receive-heading"
          eyebrow="What you receive"
          title="A finished, professional tour"
          lead="Everything is prepared for you, so you can start using the tour straight away."
        />
        <div>
          <Checklist items={whatYouReceive} />
          <p className="small">
            <Link to="/virtual-tours">See what’s included in more detail</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

// 7. How it works
export function HowItWorks() {
  return (
    <section className="section" aria-labelledby="how-heading">
      <div className="container">
        <SectionHeading id="how-heading" eyebrow="How it works" title="From enquiry to finished tour" />
        <ProcessSteps />
      </div>
    </section>
  );
}

// 8. Pricing
export function PricingPreview() {
  return (
    <section className="section section--soft" aria-labelledby="pricing-heading">
      <div className="container">
        <SectionHeading
          id="pricing-heading"
          eyebrow="Pricing"
          title="Clear starting prices for business tours"
          lead={pricingNote}
        />
        <div className="plans">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
        <p className="small">
          {site.propertyPricingShort} <Link to="/pricing">See pricing details</Link>
        </p>
      </div>
    </section>
  );
}

// 9. Portfolio
export function PortfolioSection() {
  return (
    <section className="section" aria-labelledby="work-heading">
      <div className="container">
        <SectionHeading id="work-heading" eyebrow="Portfolio" title="Our work" />
        <PortfolioGallery />
      </div>
    </section>
  );
}

// 10. Website + Google
export function WebsiteAndGoogle() {
  return (
    <section className="section section--soft" aria-labelledby="google-heading">
      <div className="container split">
        <SectionHeading id="google-heading" eyebrow="Website + Google" title="Use your tour where people look" />
        <div>
          <p>
            <strong>On your website.</strong> Tours are prepared so they can be embedded on your website or shared
            with a link.
          </p>
          <p>
            <strong>On Google, where appropriate.</strong> {site.google.summary}
          </p>
          <p className="small">{site.google.disclaimer}</p>
        </div>
      </div>
    </section>
  );
}

// 11. FAQ
export function FaqSection() {
  return (
    <section className="section" aria-labelledby="faq-heading">
      <div className="container container--narrow">
        <SectionHeading id="faq-heading" eyebrow="FAQ" title="Common questions" />
        <div className="faq">
          {faqs.map((item) => (
            <FAQItem key={item.q} question={item.q} answer={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
