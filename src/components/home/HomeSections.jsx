import { Link } from 'react-router-dom';
import Plate from './Plate.jsx';
import TourEmbed from '../TourEmbed.jsx';
import { home } from '../../content/home.js';
import { site } from '../../content/site.js';
import { plans } from '../../content/pricing.js';

// Homepage, in the order: show the space, let people experience it, then explain.
// All wording comes from src/content/home.js.

const pad = (number) => String(number).padStart(2, '0');

function Index({ n }) {
  return (
    <span className="h-index" aria-hidden="true">
      {pad(n)}
    </span>
  );
}

function Arrow() {
  return (
    <span className="h-arrow" aria-hidden="true">
      →
    </span>
  );
}

// 01. Opening: the photograph fills the screen; the type sits quietly over it.
export function Opening() {
  const { hero } = home;
  return (
    <section className={`h-hero${hero.image ? ' h-hero--photo' : ''}`} aria-labelledby="h-hero-title">
      <Plate className="h-hero__media" image={hero.image} spec={hero.spec} eager />
      <div className="h-wrap h-hero__content">
        <p className="h-hero__label">{hero.label}</p>
        <h1 id="h-hero-title" className="h-hero__title">
          {hero.title}
        </h1>
        <p className="h-hero__lead">{hero.lead}</p>
      </div>
      <a className="h-hero__scroll" href="#step-inside">
        {hero.scroll}
        <span className="h-hero__scroll-line" aria-hidden="true" />
      </a>
    </section>
  );
}

// 360° panel: an equirectangular image pans slowly and loops, as if turning around in the room.
// Without an image, a compass scale stands in for it.
function Pano({ image }) {
  const strip = (hidden) =>
    image ? (
      <img
        className="h-pano__img"
        src={image.src}
        alt={hidden ? '' : image.alt}
        width={image.width}
        height={image.height}
        loading="lazy"
        decoding="async"
        aria-hidden={hidden || undefined}
      />
    ) : (
      <span className="h-pano__scale" aria-hidden="true">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((degrees) => (
          <span key={degrees} className="h-pano__tick">
            {degrees}°
          </span>
        ))}
      </span>
    );
  return (
    <div className={`h-pano${image ? '' : ' h-pano--empty'}`}>
      <div className="h-pano__track">
        {strip(false)}
        {strip(true)}
      </div>
    </div>
  );
}

// 02. Step inside: the example tour, at full width, as part of the page.
export function StepInside() {
  const { tour } = home;
  const example = site.exampleTour;
  return (
    <section id="step-inside" className="h-tour" aria-labelledby="h-tour-title">
      <div className="h-wrap h-tour__head">
        <Index n={2} />
        <h2 id="h-tour-title" className="h-display" data-reveal>
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
      <div className="h-tour__stage" data-reveal>
        {example.embedUrl ? (
          <TourEmbed className="tour-stage--home" />
        ) : (
          <div className="h-tour__placeholder" aria-hidden="true">
            <Pano />
            <span className="h-pano__note">
              <span className="plate__label">Placeholder</span>
              <span className="plate__spec">Example 360° tour · Panoee embed</span>
            </span>
          </div>
        )}
      </div>
      {example.embedUrl && !example.isRealProject ? (
        <p className="h-wrap h-tour__note">{tour.demoNote}</p>
      ) : null}
    </section>
  );
}

// 03. What ROSS 360 does: one statement, set large.
export function Statement() {
  const { statement } = home;
  return (
    <section className="h-statement" aria-labelledby="h-statement-title">
      <div className="h-wrap h-statement__grid">
        <Index n={3} />
        <h2 id="h-statement-title" className="h-statement__title" data-reveal>
          {statement.title}
        </h2>
        <p className="h-statement__text" data-reveal>
          {statement.text}
        </p>
      </div>
    </section>
  );
}

// 04. Selected work: an archive of large images with varied compositions.
export function SelectedWork() {
  const { work } = home;
  return (
    <section className="h-work" aria-labelledby="h-work-title">
      <div className="h-wrap h-head">
        <Index n={4} />
        <h2 id="h-work-title" className="h-display" data-reveal>
          {work.title}
        </h2>
        <p className="h-head__note" data-reveal>
          {work.note}
        </p>
      </div>
      <ol className="h-work__list">
        {work.items.map((item, index) => (
          <li
            key={item.type}
            className={`h-project h-project--${item.layout}${item.layout === 'full' ? '' : ' h-wrap'}`}
          >
            <div className={`h-project__meta${item.layout === 'full' ? ' h-wrap' : ''}`} data-reveal>
              <p className="h-project__sector">
                <span className="h-project__num">{pad(index + 1)}</span> / {item.sector}
              </p>
              <h3 className="h-project__title">{item.type}</h3>
              {item.tourUrl ? (
                <a className="h-link" href={item.tourUrl} target="_blank" rel="noopener noreferrer">
                  {work.link}
                  <Arrow />
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              ) : null}
            </div>
            <Plate className="h-project__media" image={item.image} spec={item.spec} reveal />
          </li>
        ))}
      </ol>
    </section>
  );
}

// 05. Why 360: one fixed photograph against a view that turns.
export function CompleteView() {
  const { view } = home;
  return (
    <section className="h-view" aria-labelledby="h-view-title">
      <div className="h-wrap h-head">
        <Index n={5} />
        <h2 id="h-view-title" className="h-display" data-reveal>
          {view.title}
        </h2>
      </div>
      <div className="h-wrap h-view__grid">
        <figure className="h-view__item h-view__item--photo" data-reveal>
          <Plate className="h-view__media" image={view.photo.image} spec={view.photo.spec} reveal />
          <figcaption className="h-view__caption">
            <span className="h-label">{view.photo.label}</span>
            <span className="h-view__text">{view.photo.text}</span>
          </figcaption>
        </figure>
        <figure className="h-view__item h-view__item--tour" data-reveal>
          <div className="plate h-view__media">
            <Pano image={view.tour.image} />
            {view.tour.image ? null : (
              <span className="h-pano__note" aria-hidden="true">
                <span className="plate__label">Placeholder</span>
                <span className="plate__spec">{view.tour.spec}</span>
              </span>
            )}
          </div>
          <figcaption className="h-view__caption">
            <span className="h-label">{view.tour.label}</span>
            <span className="h-view__text">{view.tour.text}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

// 06. Who it is for: the list itself is the composition.
export function Audience() {
  const { audience } = home;
  return (
    <section className="h-who" aria-labelledby="h-who-title">
      <div className="h-wrap">
        <div className="h-who__head">
          <Index n={6} />
          <h2 id="h-who-title" className="h-who__title" data-reveal>
            {audience.title}
          </h2>
        </div>
        <ul className="h-who__list">
          {audience.items.map((item, index) => (
            <li key={item.label} className="h-who__item" data-reveal>
              <Link className="h-who__link" to={item.to}>
                <span className="h-who__num" aria-hidden="true">
                  {pad(index + 1)}
                </span>
                <span className="h-who__name">{item.label}</span>
                <Arrow />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// 07. Process: five steps on one line.
export function Process() {
  const { process } = home;
  return (
    <section className="h-process" aria-labelledby="h-process-title">
      <div className="h-wrap h-head">
        <Index n={7} />
        <h2 id="h-process-title" className="h-display" data-reveal>
          {process.title}
        </h2>
      </div>
      <ol className="h-wrap h-process__list">
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
    </section>
  );
}

// 08. Pricing: a fee schedule. Professional is set larger, not badged.
export function Fees() {
  const { pricing } = home;
  return (
    <section className="h-fees" aria-labelledby="h-fees-title">
      <div className="h-wrap h-fees__grid">
        <div className="h-fees__head">
          <Index n={8} />
          <h2 id="h-fees-title" className="h-display" data-reveal>
            {pricing.title}
          </h2>
        </div>
        <div className="h-fees__body">
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
          <p className="h-fees__property" data-reveal>
            {pricing.property}
          </p>
          <Link className="h-link" to="/pricing">
            {pricing.link}
            <Arrow />
          </Link>
        </div>
      </div>
    </section>
  );
}

// 09. About: the company, briefly.
export function About() {
  const { about } = home;
  return (
    <section className="h-about" aria-labelledby="h-about-title">
      <div className="h-wrap h-about__grid">
        <Plate className="h-about__media" image={about.image} spec={about.spec} reveal />
        <div className="h-about__body">
          <Index n={9} />
          <h2 id="h-about-title" className="h-display" data-reveal>
            {about.title}
          </h2>
          <p className="h-about__text" data-reveal>
            {about.text}
          </p>
          <Link className="h-link" to="/about">
            {about.link}
            <Arrow />
          </Link>
        </div>
      </div>
    </section>
  );
}

// 10. Closing screen.
export function Closing() {
  const { closing } = home;
  return (
    <section className="h-close" aria-labelledby="h-close-title">
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
