import { Link } from 'react-router-dom';
import Photo from './Photo.jsx';
import TourStage from './TourStage.jsx';
import TourEmbed from '../TourEmbed.jsx';
import { home } from '../../content/home.js';
import { media } from '../../content/media.js';
import { site } from '../../content/site.js';

// Homepage: the opening photograph and one tour, then why a tour matters, its two uses, what you
// receive and what it costs, and the enquiry.
// The Step inside tour is the only example of a space on the page.
// Wording comes from src/content/home.js and photographs from src/content/media.js.

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

// Below the tour. One grid and one type scale throughout; the ground changes only where it helps:
// the point about the tour stays on the tour's dark ground, the service details sit on the light page,
// and the enquiry closes on the photograph.

// Why a 360° tour: set directly under the tour it describes, beside the same tour running live in a
// phone-sized frame, so the product stays in view. The phone frame loads only as it nears the screen.
export function Why() {
  const { why } = home;
  const tour = site.stepInsideTour;
  return (
    <section className="h-why" aria-labelledby="h-why-title">
      <div className="h-wrap h-why__inner">
        <div className="h-why__copy" data-reveal>
          <h2 id="h-why-title" className="h-h2 h-why__title">
            {why.title}
          </h2>
          <p className="h-why__text">{why.text}</p>
        </div>
        {tour.embedUrl ? (
          <figure className="h-phone" data-reveal>
            <div className="h-phone__frame">
              <TourEmbed tour={{ ...tour, title: `${tour.title} (phone view)` }} className="h-phone__screen" />
            </div>
            <figcaption className="h-phone__caption">
              {why.phoneCaption} {tour.credit}
            </figcaption>
          </figure>
        ) : null}
      </div>
    </section>
  );
}

// Business and property: two pathways through the service, side by side.
export function Uses() {
  return (
    <section className="h-uses" aria-label="Business and property">
      <div className="h-wrap h-uses__grid">
        {home.uses.map((use) => (
          <div key={use.label} className="h-use" data-reveal>
            <p className="h-use__label">{use.label}</p>
            <h2 className="h-h2 h-use__title">{use.title}</h2>
            <p className="h-use__text">{use.text}</p>
            <Link className="h-link" to={use.to}>
              {use.link}
              <Arrow />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// What you receive, and what it costs, in one band.
export function Offer() {
  const { receive, pricing } = home;
  return (
    <section className="h-offer" aria-labelledby="h-receive-title">
      <div className="h-wrap h-offer__grid">
        <div className="h-receive" data-reveal>
          <h2 id="h-receive-title" className="h-h2">
            {receive.title}
          </h2>
          <p className="h-offer__text">{receive.text}</p>
          <ul className="h-receive__list">
            {receive.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <a className="h-link" href="#step-inside">
            {receive.example}
            <span className="h-arrow" aria-hidden="true">
              ↑
            </span>
          </a>
        </div>
        <div className="h-from" data-reveal>
          <h2 className="h-h2">{pricing.title}</h2>
          <p className="h-offer__text">{pricing.text}</p>
          <div className="h-from__actions">
            <Link className="h-button" to={site.quoteLink.to}>
              {pricing.quote}
            </Link>
            <Link className="h-button h-button--quiet" to="/pricing">
              {pricing.view}
            </Link>
          </div>
        </div>
      </div>
    </section>
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
