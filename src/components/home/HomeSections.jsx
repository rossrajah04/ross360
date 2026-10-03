import { Link } from 'react-router-dom';
import Photo from './Photo.jsx';
import TourStage from './TourStage.jsx';
import { home } from '../../content/home.js';
import { media } from '../../content/media.js';
import { site } from '../../content/site.js';
import { plans, pricingIntro, propertyPricingLine } from '../../content/pricing.js';

// Homepage: the space and one tour, then one continuous story below it: why it matters, what we create
// and for whom, how it works, what it costs, who is behind it, and the enquiry.
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

// A quiet heading that anchors each part of the story below.
function Kicker({ id, children }) {
  return (
    <h2 id={id} className="h-kicker" data-reveal>
      {children}
    </h2>
  );
}

// What we create, then who it is for: one light passage of large type.
export function Create() {
  const { create, spaces } = home;
  return (
    <section className="h-create" aria-labelledby="h-create-title">
      <div className="h-wrap">
        <Kicker id="h-create-title">{create.title}</Kicker>
        <ul className="h-create__list">
          {create.items.map((item) => (
            <li key={item.title} className="h-create__item" data-reveal>
              {item.title}
              {item.note ? <span className="h-create__note"> {item.note}</span> : null}
            </li>
          ))}
        </ul>

        <div className="h-for">
          <Kicker id="h-for-title">{spaces.title}</Kicker>
          <ul className="h-for__list" aria-labelledby="h-for-title" data-reveal>
            {spaces.items.map((item) => (
              <li key={item.label} className="h-for__item">
                <Link className="h-for__link" to={item.to}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// How it works: three stages, each given the width of the page.
export function Process() {
  const { process } = home;
  return (
    <section className="h-stages" aria-labelledby="h-stages-title">
      <div className="h-wrap">
        <Kicker id="h-stages-title">{process.title}</Kicker>
        <ol className="h-stages__list">
          {process.steps.map((step, index) => (
            <li key={step.title} className="h-stage" data-reveal>
              <span className="h-stage__num" aria-hidden="true">
                {pad(index + 1)}
              </span>
              <h3 className="h-stage__name">{step.title}</h3>
              <p className="h-stage__text">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// What it costs: three starting prices set as large numerals, then property.
export function Fees() {
  const { pricing } = home;
  return (
    <section className="h-price" aria-labelledby="h-price-title">
      <div className="h-wrap">
        <div className="h-price__head" data-reveal>
          <Kicker id="h-price-title">{pricing.title}</Kicker>
          <p className="h-price__intro">{pricingIntro}</p>
        </div>
        <ul className="h-price__list">
          {plans.map((plan) => (
            <li key={plan.id} className="h-price__item" data-reveal>
              <p className="h-price__amount">
                <span className="visually-hidden">From </span>£{plan.price}
              </p>
              <h3 className="h-price__name">{plan.name}</h3>
            </li>
          ))}
        </ul>
        <div className="h-price__foot" data-reveal>
          <p>{propertyPricingLine}</p>
          <Link className="h-link" to="/pricing">
            {pricing.link}
            <Arrow />
          </Link>
        </div>
      </div>
    </section>
  );
}

// Who is behind it, in a few lines.
export function About() {
  const { about } = home;
  return (
    <section className="h-intro" aria-labelledby="h-intro-title">
      <div className="h-wrap h-intro__inner">
        <Kicker id="h-intro-title">{about.title}</Kicker>
        <div className="h-intro__body" data-reveal>
          <p className="h-intro__lead">{about.lead}</p>
          <p className="h-intro__text">{about.text}</p>
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
        </div>
      </div>
    </section>
  );
}
