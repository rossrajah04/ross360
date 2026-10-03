import { Link } from 'react-router-dom';
import Photo from './Photo.jsx';
import TourStage from './TourStage.jsx';
import { home } from '../../content/home.js';
import { media } from '../../content/media.js';
import { site } from '../../content/site.js';
import { plans } from '../../content/pricing.js';

// Homepage: the opening photograph and one tour, then what we create, how it works, business pricing,
// about ROSS 360, and the enquiry.
// The Step inside tour is the only example of a space on the page.
// Wording comes from src/content/home.js and photographs from src/content/media.js.

const pad = (number) => String(number).padStart(2, '0');

function Arrow() {
  return (
    <span className="h-arrow" aria-hidden="true">
      →
    </span>
  );
}

// The opening photograph, with the heading set quietly over it.
export function Opening() {
  const { hero } = home;
  return (
    <section className="h-hero" aria-labelledby="h-hero-title">
      <Photo image={media.hero} className="h-hero__photo" eager />
      <div className="h-hero__shade" aria-hidden="true" />
      <div className="h-wrap h-hero__content">
        <h1 id="h-hero-title" className="h-hero__title">
          {hero.title}
        </h1>
        <p className="h-hero__lead">{hero.lead}</p>
      </div>
      <a className="h-hero__scroll" href="#step-inside" aria-label="Scroll to the 360° preview">
        <span className="h-hero__scroll-line" aria-hidden="true" />
      </a>
    </section>
  );
}

// Step inside: the one tour on the homepage. The frame holds the Panoee tour set in
// site.stepInsideTour, and a placeholder if that is empty. An external example is labelled and
// credited under the frame.
export function StepInside() {
  const { tour } = home;
  const example = site.stepInsideTour;
  return (
    <section id="step-inside" className="h-tour" aria-labelledby="h-tour-title">
      <div className="h-wrap h-tour__head">
        <h2 id="h-tour-title" className="h-title" data-reveal>
          {tour.title}
        </h2>
        <div className="h-tour__aside" data-reveal>
          <p>{tour.text}</p>
          {example.openUrl ? (
            <a className="h-link" href={example.openUrl} target="_blank" rel="noopener noreferrer">
              {tour.open}
              <Arrow />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          ) : null}
        </div>
      </div>
      <div className="h-wrap">
        <TourStage tour={example} label={tour.placeholderLabel} placeholder={tour.placeholder} />
        {example.embedUrl && example.external ? (
          <p className="h-tour__note">
            <span className="h-tour__note-label">{example.label}</span>
            <span>{example.credit}</span>
          </p>
        ) : example.embedUrl && !example.isRealProject ? (
          <p className="h-tour__note">{tour.demoNote}</p>
        ) : null}
      </div>
    </section>
  );
}

// Everything below the tour shares one form: a section heading, an optional line of text, then the
// content, on the same grid and left edge. Sections are separated by a single rule.
function Section({ id, title, text, end = false, children }) {
  return (
    <section className={`h-sec${end ? ' h-sec--end' : ''}`} aria-labelledby={id}>
      <div className="h-wrap h-sec__inner">
        <header className="h-sec__head" data-reveal>
          <h2 id={id} className="h-sec__title">
            {title}
          </h2>
          {text ? <p className="h-sec__text">{text}</p> : null}
        </header>
        {children}
      </div>
    </section>
  );
}

// What we create.
export function WhatWeCreate() {
  const { create } = home;
  return (
    <Section id="h-create-title" title={create.title} text={create.text}>
      <ul className="h-deliver" data-reveal>
        {create.items.map((item) => (
          <li key={item} className="h-deliver__item">
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

// How it works.
export function HowItWorks() {
  const { process } = home;
  return (
    <Section id="h-how-title" title={process.title}>
      <ol className="h-cols">
        {process.steps.map((step, index) => (
          <li key={step.title} className="h-cols__item" data-reveal>
            <span className="h-step__num" aria-hidden="true">
              {pad(index + 1)}
            </span>
            <h3 className="h-cols__name">{step.title}</h3>
            <p className="h-cols__text">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// Business tour pricing.
export function Pricing() {
  const { pricing } = home;
  return (
    <Section id="h-pricing-title" title={pricing.title}>
      <ul className="h-cols h-cols--prices">
        {plans.map((plan) => {
          const copy = pricing.plans[plan.id] || {};
          return (
            <li key={plan.id} className="h-cols__item h-plan" data-reveal>
              <p className="h-plan__price">
                £{plan.price}
                {copy.plus ? '+' : ''}
              </p>
              <h3 className="h-cols__name h-plan__name">{plan.name}</h3>
              <p className="h-cols__text h-plan__text">{copy.text || plan.summary}</p>
            </li>
          );
        })}
      </ul>
      <div className="h-pricing__foot" data-reveal>
        <p className="h-pricing__property">{pricing.property}</p>
        <div className="h-pricing__actions">
          <Link className="h-button" to={site.quoteLink.to}>
            {pricing.cta}
          </Link>
          <Link className="h-link" to="/pricing">
            {pricing.link}
            <Arrow />
          </Link>
        </div>
      </div>
    </Section>
  );
}

// About ROSS 360.
export function About() {
  const { about } = home;
  return (
    <Section id="h-about-title" title={about.title} end>
      <div className="h-about" data-reveal>
        <p className="h-about__lead">{about.lead}</p>
        <p className="h-about__text">{about.text}</p>
        <Link className="h-link" to="/about">
          {about.link}
          <Arrow />
        </Link>
      </div>
    </Section>
  );
}

// The enquiry, over the closing photograph.
export function Closing() {
  const { closing } = home;
  return (
    <section className="h-close" aria-labelledby="h-close-title">
      <Photo image={media.closing} className="h-close__photo" decorative />
      <div className="h-close__shade" aria-hidden="true" />
      <div className="h-wrap h-close__inner" data-reveal>
        <h2 id="h-close-title" className="h-close__title">
          {closing.title}
        </h2>
        <p className="h-close__text">{closing.text}</p>
        <Link className="h-close__cta" to={site.quoteLink.to}>
          {closing.cta}
          <Arrow />
        </Link>
      </div>
    </section>
  );
}
