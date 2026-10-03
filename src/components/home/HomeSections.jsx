import { Link } from 'react-router-dom';
import Button from '../Button.jsx';
import SectionHeading from '../SectionHeading.jsx';
import TourEmbed from '../TourEmbed.jsx';
import MediaFrame from '../MediaFrame.jsx';
import PricingCard from '../PricingCard.jsx';
import PortfolioGallery from '../PortfolioGallery.jsx';
import FAQItem from '../FAQItem.jsx';
import ProcessSteps from '../ProcessSteps.jsx';
import Checklist from '../Checklist.jsx';
import { site } from '../../content/site.js';
import { plans, pricingNote, lowestPrice } from '../../content/pricing.js';
import { coreDeliverable, reasons, businessChannels } from '../../content/services.js';
import { projects } from '../../content/portfolio.js';
import { faqs } from '../../content/faq.js';

const hasExampleTour = Boolean(site.exampleTour.embedUrl);
const hasProjects = projects.length > 0;

// The hero's secondary action always leads somewhere real: work if it exists, then the example tour,
// then pricing.
function secondaryAction() {
  if (hasProjects) return { to: '/portfolio', label: site.cta.work };
  if (hasExampleTour) return { href: '#example-tour', label: site.cta.example };
  return { to: '/pricing', label: site.cta.pricing };
}

// 1. Hero
export function Hero() {
  const secondary = secondaryAction();
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="container hero__grid">
        <div className="hero__text">
          <h1 id="hero-heading">{site.descriptor}</h1>
          <p className="lead">
            Professional 360° photography and interactive tours, so customers, buyers and tenants can see a space
            properly before they visit.
          </p>
          <div className="btn-row">
            <Button to="/get-a-quote" variant="inverse">
              {site.cta.primary}
            </Button>
            <Button to={secondary.to} href={secondary.href} variant="outline-inverse">
              {secondary.label}
            </Button>
          </div>
        </div>
        <MediaFrame image={site.images.hero} fallback className="hero__media" />
      </div>
      <div className="container">
        <ul className="hero__facts">
          <li>Available {site.serviceArea}</li>
          <li>Business tours from £{lowestPrice}</li>
          <li>Property individually quoted</li>
          <li>{site.hosting.includedMonths} months’ hosting included</li>
        </ul>
      </div>
    </section>
  );
}

// 2. Example tour, or — until one exists — how a visitor uses a tour.
export function TourExperience() {
  if (hasExampleTour) {
    return (
      <section id="example-tour" className="section section--soft" aria-labelledby="example-heading">
        <div className="container">
          <SectionHeading
            id="example-heading"
            eyebrow="Example tour"
            title="Move through a space the way a visitor would"
            lead="A demonstration tour, shown so you can try the experience. It is not a client project."
          />
          <TourEmbed className="tour-stage--large" />
        </div>
      </section>
    );
  }

  return (
    <section className="section section--soft" aria-labelledby="experience-heading">
      <div className="container">
        <SectionHeading
          id="experience-heading"
          eyebrow="The experience"
          title="What a visitor can do with a tour"
        />
        <ol className="numbered">
          <li>
            <h3>Look around</h3>
            <p>Drag on a computer, or swipe on a phone, to look in any direction from each viewpoint.</p>
          </li>
          <li>
            <h3>Move through</h3>
            <p>Select the next point to move on. Viewpoints connect in the order you would walk through.</p>
          </li>
          <li>
            <h3>Open it anywhere</h3>
            <p>The tour runs in the browser from your website, a listing or a shared link. No app is needed.</p>
          </li>
        </ol>
      </div>
    </section>
  );
}

// 3. What ROSS 360 provides
export function WhatWeProvide() {
  return (
    <section className="section" aria-labelledby="provide-heading">
      <div className="container split">
        <SectionHeading
          id="provide-heading"
          eyebrow="What ROSS 360 provides"
          title="A finished tour, not a camera for hire"
        />
        <div className="prose-block">
          <p className="lead lead--ink">
            ROSS 360 plans the capture, photographs the space, builds the tour and delivers it ready to use.
          </p>
          <p>
            You don’t need equipment, software or technical knowledge. You agree what should be shown, make the
            space ready on the day, and receive a finished tour with a link to share and code to place on your
            website.
          </p>
          <p>
            <Link to="/virtual-tours">How the service works in detail</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

// 4. Why businesses and property professionals use 360°
export function WhyUse() {
  return (
    <section className="section section--soft" aria-labelledby="why-heading">
      <div className="container">
        <SectionHeading
          id="why-heading"
          eyebrow="Why use a 360° tour"
          title="Answer the questions photographs leave open"
        />
        <ul className="rule-grid">
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

// 5. Who it's for
export function WhoItsFor() {
  return (
    <section className="section" aria-labelledby="who-heading">
      <div className="container">
        <SectionHeading id="who-heading" eyebrow="Who it’s for" title="Businesses and property professionals" />
        <div className="audience">
          <article className="audience__panel">
            <h3>Businesses</h3>
            <p>
              Restaurants and cafés, gyms and studios, hotels, wedding and event venues, retail and showrooms,
              clinics, offices and commercial premises.
            </p>
            <Button to="/businesses" variant="secondary">
              {site.cta.business}
            </Button>
          </article>
          <article className="audience__panel audience__panel--dark">
            <h3>Property</h3>
            <p>
              Estate and letting agents, residential and commercial property, developers, and agencies with
              multiple properties.
            </p>
            <Button to="/property" variant="inverse">
              {site.cta.property}
            </Button>
          </article>
        </div>
      </div>
    </section>
  );
}

// 6. What the client receives
export function WhatYouReceive() {
  return (
    <section className="section section--soft" aria-labelledby="receive-heading">
      <div className="container split">
        <SectionHeading
          id="receive-heading"
          eyebrow="What you receive"
          title="Everything needed to use the tour"
          lead="The same deliverables come with every business package. Packages differ only by the size and complexity of the space."
        />
        <Checklist items={coreDeliverable} />
      </div>
    </section>
  );
}

// 7. How it works
export function HowItWorks() {
  return (
    <section id="how-it-works" className="section" aria-labelledby="how-heading">
      <div className="container">
        <SectionHeading
          id="how-heading"
          eyebrow="How it works"
          title="From enquiry to finished tour"
          lead="You see the exact price before anything is booked."
        />
        <ProcessSteps />
      </div>
    </section>
  );
}

// 8. Business pricing
export function PricingPreview() {
  return (
    <section className="section section--soft" aria-labelledby="pricing-heading">
      <div className="container">
        <SectionHeading
          id="pricing-heading"
          eyebrow="Business pricing"
          title="Starting prices for business tours"
          lead={pricingNote}
        />
        <div className="plans">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
        <p className="small">
          <Link to="/pricing">What each package suits and what affects the price</Link>
        </p>
      </div>
    </section>
  );
}

// 9. Property and estate agencies
export function PropertySection() {
  return (
    <section className="section" aria-labelledby="property-heading">
      <div className="container split">
        <SectionHeading
          id="property-heading"
          eyebrow="Property and estate agencies"
          title="One property or an ongoing instruction"
          lead={site.propertyPricingNote}
        />
        <div>
          <Checklist
            items={['Individual properties', 'Multiple properties', 'Ongoing agency requirements', 'Volume work']}
          />
          <div className="btn-row btn-row--tight">
            <Button to="/property">{site.cta.property}</Button>
            <Button to="/get-a-quote?type=agency" variant="secondary">
              {site.cta.agency}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// 10. Portfolio (only once there is genuine work to show)
export function PortfolioSection() {
  if (!hasProjects) return null;
  return (
    <section className="section" aria-labelledby="work-heading">
      <div className="container">
        <SectionHeading id="work-heading" eyebrow="Portfolio" title="Recent work" />
        <PortfolioGallery headingLevel="h3" />
        <p className="small">
          <Link to="/portfolio">{site.cta.work}</Link>
        </p>
      </div>
    </section>
  );
}

// 11. Website + Google
export function WebsiteAndGoogle() {
  return (
    <section className="section section--soft" aria-labelledby="google-heading">
      <div className="container split">
        <SectionHeading
          id="google-heading"
          eyebrow="Website + Google"
          title="Where your tour is seen"
          lead="You receive a link and embed code, so the tour can sit wherever people look for you."
        />
        <div>
          <ul className="rule-list">
            {businessChannels.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
          <p className="small">
            Google Street View is a separate Google platform. {site.google.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}

// 12. FAQ
export function FaqSection() {
  return (
    <section className="section" aria-labelledby="faq-heading">
      <div className="container container--narrow">
        <SectionHeading id="faq-heading" eyebrow="FAQ" title="Questions before you enquire" />
        <div className="faq">
          {faqs.map((item) => (
            <FAQItem key={item.q} question={item.q} answer={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
