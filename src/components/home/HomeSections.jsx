import { Link } from 'react-router-dom';
import Photo from './Photo.jsx';
import TourStage from './TourStage.jsx';
import { home } from '../../content/home.js';
import { media } from '../../content/media.js';
import { site } from '../../content/site.js';
import { plans } from '../../content/pricing.js';

// Homepage: the space and one tour, then a single story below it: why it matters, a more complete view,
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
// site.exampleTour.embedUrl, and a placeholder until then.
export function StepInside() {
  const { tour } = home;
  const example = site.exampleTour;
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
        {example.embedUrl && !example.isRealProject ? <p className="h-tour__note">{tour.demoNote}</p> : null}
      </div>
    </section>
  );
}

// Why it matters. Set on the same dark ground as the tour, so it reads as a continuation of it.
export function Explore() {
  const { explore } = home;
  return (
    <section className="h-explore" aria-labelledby="h-explore-title">
      <div className="h-wrap">
        <div className="h-explore__head">
          <h2 id="h-explore-title" className="h-title" data-reveal>
            {explore.title}
          </h2>
          <p className="h-explore__text" data-reveal>
            {explore.text}
          </p>
        </div>
        <ul className="h-explore__points">
          {explore.points.map((point) => (
            <li key={point.title} className="h-explore__point" data-reveal>
              <h3 className="h-label">{point.title}</h3>
              <p>{point.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// A photograph against a tour, set as two large statements: the first held back, the second in full.
export function Compare() {
  const { compare } = home;
  return (
    <section className="h-compare" aria-labelledby="h-compare-title">
      <div className="h-wrap">
        <h2 id="h-compare-title" className="h-title h-compare__title" data-reveal>
          {compare.title}
        </h2>
        <dl className="h-compare__rows">
          {[compare.photo, compare.tour].map((side, index) => (
            <div key={side.label} className={`h-compare__row${index ? ' h-compare__row--tour' : ''}`} data-reveal>
              <dt className="h-label">{side.label}</dt>
              <dd>{side.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// Who it is for: a catalogue of the kinds of space, set as type.
export function SpaceTypes() {
  const { spaces } = home;
  return (
    <section className="h-types" aria-labelledby="h-types-title">
      <div className="h-wrap h-types__grid">
        <h2 id="h-types-title" className="h-types__title" data-reveal>
          {spaces.title}
        </h2>
        <ul className="h-types__list">
          {spaces.items.map((item) => (
            <li key={item.label} className="h-types__item" data-reveal>
              <Link className="h-types__link" to={item.to}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// How it works: six stages in two rows of three, each with room to read.
export function Process() {
  const { process } = home;
  return (
    <section className="h-process" aria-labelledby="h-process-title">
      <div className="h-wrap">
        <h2 id="h-process-title" className="h-title h-process__title" data-reveal>
          {process.title}
        </h2>
        <ol className="h-process__list">
          {process.steps.map((step, index) => (
            <li key={step.title} className="h-process__step" data-reveal>
              <span className="h-process__num" aria-hidden="true">
                {pad(index + 1)}
              </span>
              <h3 className="h-process__name">{step.title}</h3>
              <p className="h-process__text">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// What it costs: starting prices, each with what it is for. Professional is set larger, not badged.
export function Fees() {
  const { pricing } = home;
  return (
    <section className="h-fees" aria-labelledby="h-fees-title">
      <div className="h-wrap h-fees__grid">
        <div className="h-fees__head" data-reveal>
          <p className="h-label h-fees__label">{pricing.label}</p>
          <h2 id="h-fees-title" className="h-subtitle">
            {pricing.title}
          </h2>
          <p className="h-fees__intro">{pricing.intro}</p>
        </div>
        <div className="h-fees__body">
          <ol className="h-fees__list">
            {plans.map((plan) => (
              <li key={plan.id} className={`h-fee${plan.featured ? ' h-fee--main' : ''}`} data-reveal>
                <div className="h-fee__about">
                  <h3 className="h-fee__name">{plan.name}</h3>
                  <p className="h-fee__summary">{plan.summary}</p>
                </div>
                <p className="h-fee__price">
                  <span className="h-fee__from">From</span> £{plan.price}
                </p>
              </li>
            ))}
          </ol>
          <div className="h-fees__foot" data-reveal>
            <p className="h-fees__property">{pricing.property}</p>
            <Link className="h-link" to="/pricing">
              {pricing.link}
              <Arrow />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// Who is behind it.
export function About() {
  const { about } = home;
  return (
    <section className="h-about" aria-labelledby="h-about-title">
      <div className="h-wrap h-about__grid">
        <h2 id="h-about-title" className="h-subtitle h-about__title" data-reveal>
          {about.title}
        </h2>
        <div className="h-about__body" data-reveal>
          <p className="h-statement">{about.lead}</p>
          <p className="h-about__text">{about.text}</p>
          <Link className="h-link" to="/about">
            {about.link}
            <Arrow />
          </Link>
        </div>
      </div>
    </section>
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
          <a className="h-close__mail" href={`mailto:${site.email}`}>
            {site.email}
          </a>
        </div>
        <p className="h-close__note" data-reveal>
          {closing.note}
        </p>
      </div>
    </section>
  );
}
