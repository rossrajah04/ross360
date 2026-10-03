import { Link } from 'react-router-dom';
import Photo from './Photo.jsx';
import TourStage from './TourStage.jsx';
import { home } from '../../content/home.js';
import { media } from '../../content/media.js';
import { site } from '../../content/site.js';
import { plans, propertyPricingLine } from '../../content/pricing.js';

// Homepage: the space and one tour, then the story below it: why it matters, what you get, a statement,
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

// Why it matters. It continues on the tour's dark ground: the heading, then the reason set as a
// large statement, offset to the right.
export function Explore() {
  const { explore } = home;
  return (
    <section className="h-explore" aria-labelledby="h-explore-title">
      <div className="h-wrap">
        <h2 id="h-explore-title" className="h-explore__title" data-reveal>
          {explore.title}
        </h2>
        <p className="h-explore__statement" data-reveal>
          {explore.text}
        </p>
      </div>
    </section>
  );
}

// Every section below shares one form: a heading, then its content on the same left edge.
function Part({ id, title, end = false, children }) {
  return (
    <section className={`h-part${end ? ' h-part--end' : ''}`} aria-labelledby={id}>
      <div className="h-wrap">
        <h2 id={id} className="h-part__title" data-reveal>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

// What you get.
export function Included() {
  const { included } = home;
  return (
    <Part id="h-included-title" title={included.title}>
      <ul className="h-list" data-reveal>
        {included.items.map((item) => (
          <li key={item} className="h-list__item">
            {item}
          </li>
        ))}
      </ul>
    </Part>
  );
}

// One statement, set by type and space alone.
export function Statement() {
  const { statement } = home;
  return (
    <section className="h-statement-band" aria-labelledby="h-statement-title">
      <div className="h-wrap">
        <h2 id="h-statement-title" className="h-statement-band__title" data-reveal>
          {statement.title}
        </h2>
        <p className="h-statement-band__text" data-reveal>
          {statement.text}
        </p>
      </div>
    </section>
  );
}

// Who it is for.
export function SpaceTypes() {
  const { spaces } = home;
  return (
    <Part id="h-for-title" title={spaces.title}>
      <ul className="h-names" data-reveal>
        {spaces.items.map((item) => (
          <li key={item.label}>
            <Link className="h-names__link" to={item.to}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </Part>
  );
}

// How it works: three stages on the same three columns as the prices.
export function Process() {
  const { process } = home;
  return (
    <Part id="h-process-title" title={process.title}>
      <ol className="h-three">
        {process.steps.map((step, index) => (
          <li key={step.title} className="h-three__item" data-reveal>
            <span className="h-three__num" aria-hidden="true">
              {pad(index + 1)}
            </span>
            <h3 className="h-three__name">{step.title}</h3>
            <p className="h-three__text">{step.text}</p>
          </li>
        ))}
      </ol>
    </Part>
  );
}

// What it costs.
export function Fees() {
  const { pricing } = home;
  return (
    <Part id="h-price-title" title={pricing.title}>
      <ul className="h-three">
        {plans.map((plan) => (
          <li key={plan.id} className="h-three__item" data-reveal>
            <p className="h-three__price">
              <span className="visually-hidden">From </span>£{plan.price}
            </p>
            <h3 className="h-three__name">{plan.name}</h3>
          </li>
        ))}
      </ul>
      <div className="h-part__foot" data-reveal>
        <p>{propertyPricingLine}</p>
        <Link className="h-link" to="/pricing">
          {pricing.link}
          <Arrow />
        </Link>
      </div>
    </Part>
  );
}

// Who is behind it.
export function About() {
  const { about } = home;
  return (
    <Part id="h-about-title" title={about.title} end>
      <div data-reveal>
        <p className="h-part__lead">{about.text}</p>
        <Link className="h-link" to="/about">
          {about.link}
          <Arrow />
        </Link>
      </div>
    </Part>
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
