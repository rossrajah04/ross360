import { Link } from 'react-router-dom';
import Photo from './Photo.jsx';
import TourStage from './TourStage.jsx';
import { home } from '../../content/home.js';
import { media } from '../../content/media.js';
import { site } from '../../content/site.js';
import { plans, propertyPricingLine } from '../../content/pricing.js';

// Homepage: the space and one tour, then a short sequence below it: why it matters, what is delivered,
// who it is for, how it works, what it costs, who is behind it, and the enquiry.
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

// Why it matters. Set on the same dark ground as the tour, so it reads as a continuation of it.
export function Explore() {
  const { explore } = home;
  return (
    <section className="h-explore" aria-labelledby="h-explore-title">
      <div className="h-wrap h-explore__inner">
        <h2 id="h-explore-title" className="h-title" data-reveal>
          {explore.title}
        </h2>
        <p className="h-explore__text" data-reveal>
          {explore.text}
        </p>
      </div>
    </section>
  );
}

// Each section below shares one layout: its heading on the left, its content on the right.
function Block({ id, title, tone = 'light', rule = false, children }) {
  return (
    <section className={`h-block h-block--${tone}${rule ? ' h-block--rule' : ''}`} aria-labelledby={id}>
      <div className="h-wrap h-block__grid">
        <h2 id={id} className="h-block__title" data-reveal>
          {title}
        </h2>
        <div className="h-block__body">{children}</div>
      </div>
    </section>
  );
}

// What the client receives.
export function Delivers() {
  const { delivers } = home;
  return (
    <Block id="h-delivers-title" title={delivers.title}>
      <ul className="h-rows">
        {delivers.items.map((item) => (
          <li key={item} className="h-rows__item" data-reveal>
            {item}
          </li>
        ))}
      </ul>
    </Block>
  );
}

// Who it is for: the kinds of space, set as a list of names.
export function SpaceTypes() {
  const { spaces } = home;
  return (
    <Block id="h-types-title" title={spaces.title} rule>
      <ul className="h-types">
        {spaces.items.map((item) => (
          <li key={item.label} data-reveal>
            <Link className="h-types__link" to={item.to}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </Block>
  );
}

// How it works: three stages.
export function Process() {
  const { process } = home;
  return (
    <Block id="h-process-title" title={process.title} tone="dark">
      <ol className="h-steps">
        {process.steps.map((step, index) => (
          <li key={step.title} className="h-steps__item" data-reveal>
            <span className="h-steps__num" aria-hidden="true">
              {pad(index + 1)}
            </span>
            <h3 className="h-steps__name">{step.title}</h3>
            <p className="h-steps__text">{step.text}</p>
          </li>
        ))}
      </ol>
    </Block>
  );
}

// What it costs: the three starting prices, then property.
export function Fees() {
  const { pricing } = home;
  return (
    <Block id="h-fees-title" title={pricing.title}>
      <ul className="h-fees">
        {plans.map((plan) => (
          <li key={plan.id} className="h-fees__row" data-reveal>
            <h3 className="h-fees__name">{plan.name}</h3>
            <p className="h-fees__price">
              <span className="h-fees__from">From</span> £{plan.price}
            </p>
          </li>
        ))}
      </ul>
      <div className="h-fees__foot" data-reveal>
        <p className="h-fees__property">{propertyPricingLine}</p>
        <Link className="h-link" to="/pricing">
          {pricing.link}
          <Arrow />
        </Link>
      </div>
    </Block>
  );
}

// Who is behind it.
export function About() {
  const { about } = home;
  return (
    <Block id="h-about-title" title={about.title} rule>
      <div data-reveal>
        <p className="h-statement h-about__lead">{about.lead}</p>
        <p className="h-about__text">{about.text}</p>
        <Link className="h-link" to="/about">
          {about.link}
          <Arrow />
        </Link>
      </div>
    </Block>
  );
}

// The conclusion: the enquiry, over the closing photograph.
export function Closing() {
  const { closing } = home;
  return (
    <section className="h-close" aria-labelledby="h-close-title">
      <Photo image={media.closing} className="h-close__photo" decorative />
      <div className="h-close__shade" aria-hidden="true" />
      <div className="h-wrap h-close__inner">
        <h2 id="h-close-title" className="h-close__title" data-reveal>
          {closing.title}
        </h2>
        <div className="h-close__action" data-reveal>
          <Link className="h-close__cta" to={site.quoteLink.to}>
            {closing.cta}
            <Arrow />
          </Link>
        </div>
      </div>
    </section>
  );
}
