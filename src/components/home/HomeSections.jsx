import { Link } from 'react-router-dom';
import Photo from './Photo.jsx';
import TourStage from './TourStage.jsx';
import { home } from '../../content/home.js';
import { media } from '../../content/media.js';
import { site } from '../../content/site.js';
import { plans } from '../../content/pricing.js';

// Homepage: the space, one tour, what ROSS 360 provides, why 360°, who it is for, how it works, fees,
// about, enquiry. The Step inside tour is the only example of a space on the page.
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

// What ROSS 360 does and provides.
export function Understanding() {
  const { understanding } = home;
  return (
    <section className="h-understand" aria-labelledby="h-understand-title">
      <div className="h-wrap h-understand__grid">
        <div className="h-understand__text" data-reveal>
          <h2 id="h-understand-title" className="h-statement">
            {understanding.title}
          </h2>
          <p className="h-understand__body">{understanding.text}</p>
        </div>
        <ul className="h-understand__list">
          {understanding.provides.map((item) => (
            <li key={item} data-reveal>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Why 360°: a photograph shows selected views; a tour lets visitors explore. Set as text, side by side.
export function Compare() {
  const { compare } = home;
  return (
    <section className="h-compare" aria-labelledby="h-compare-title">
      <div className="h-wrap h-compare__grid">
        <h2 id="h-compare-title" className="h-title" data-reveal>
          {compare.title}
        </h2>
        <dl className="h-compare__pair">
          {[compare.photo, compare.tour].map((side) => (
            <div key={side.label} className="h-compare__side" data-reveal>
              <dt className="h-label">{side.label}</dt>
              <dd className="h-compare__text">{side.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// Who ROSS 360 works with, set as type.
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
                <span className="h-types__name">{item.label}</span>
                <Arrow />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Five steps, kept small.
export function Process() {
  const { process } = home;
  return (
    <section className="h-process" aria-labelledby="h-process-title">
      <div className="h-wrap h-process__grid">
        <h2 id="h-process-title" className="h-subtitle" data-reveal>
          {process.title}
        </h2>
        <ol className="h-process__list">
          {process.steps.map((step, index) => (
            <li key={step.title} className="h-process__step" data-reveal>
              <span className="h-process__num" aria-hidden="true">
                {pad(index + 1)}
              </span>
              <h3 className="h-process__title">{step.title}</h3>
              <p className="h-process__text">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// Fee schedule. Professional is set larger rather than badged.
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
          <p className="h-fees__property">{pricing.property}</p>
          <Link className="h-link" to="/pricing">
            {pricing.link}
            <Arrow />
          </Link>
        </div>
        <ol className="h-fees__list">
          {plans.map((plan) => (
            <li key={plan.id} className={`h-fee${plan.featured ? ' h-fee--main' : ''}`} data-reveal>
              <h3 className="h-fee__name">{plan.name}</h3>
              <p className="h-fee__price">
                <span className="h-fee__from">From</span> £{plan.price}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// About, briefly.
export function About() {
  const { about } = home;
  return (
    <section className="h-about" aria-labelledby="h-about-title">
      <div className="h-wrap h-about__grid" data-reveal>
        <h2 id="h-about-title" className="h-subtitle">
          {about.title}
        </h2>
        <div className="h-about__body">
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

// Closing screen, over a photograph.
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
          <p className="h-close__note">{closing.note}</p>
        </div>
      </div>
    </section>
  );
}
