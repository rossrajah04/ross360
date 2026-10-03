import { useState } from 'react';
import { Link } from 'react-router-dom';
import Photo from './Photo.jsx';
import PanoViewer from './PanoViewer.jsx';
import TourEmbed from '../TourEmbed.jsx';
import { home } from '../../content/home.js';
import { media } from '../../content/media.js';
import { site } from '../../content/site.js';
import { plans } from '../../content/pricing.js';

// Homepage: space, 360° experience, understanding, work, services, enquiry.
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

// Step inside: the 360° experience, as wide as the page. The Panoee tour replaces the preview once
// site.exampleTour.embedUrl is set.
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
      <div className="h-tour__stage">
        {example.embedUrl ? (
          <TourEmbed className="tour-stage--home" />
        ) : (
          <>
            <PanoViewer image={media.pano} label={tour.hint} className="h-tour__pano" />
            {media.pano?.temporary ? <span className="h-tag h-tour__tag">{tour.illustrative}</span> : null}
          </>
        )}
      </div>
      {example.embedUrl && !example.isRealProject ? (
        <p className="h-wrap h-tour__note">{tour.demoNote}</p>
      ) : null}
    </section>
  );
}

// What ROSS 360 does, in two sentences set against two photographs.
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
        <Photo
          image={media.understandTall}
          className="h-understand__tall"
          sizes="(min-width: 1000px) 36vw, 72vw"
          reveal
        />
        <Photo
          image={media.understandWide}
          className="h-understand__wide"
          sizes="(min-width: 1000px) 44vw, 100vw"
          reveal
        />
      </div>
    </section>
  );
}

const WORK_LAYOUTS = ['full', 'pair', 'offset'];

// The collection of spaces. Each entry has its own composition.
export function Work() {
  const { work } = home;
  const temporary = work.items.some((item) => item.media.some((key) => media[key]?.temporary));
  return (
    <section className="h-work" aria-labelledby="h-work-title">
      <div className="h-wrap h-work__head">
        <h2 id="h-work-title" className="h-title" data-reveal>
          {work.title}
        </h2>
        {temporary ? (
          <p className="h-work__note" data-reveal>
            {work.note}
          </p>
        ) : null}
      </div>
      <ol className="h-work__list">
        {work.items.map((item, index) => {
          const layout = WORK_LAYOUTS[index % WORK_LAYOUTS.length];
          const [main, detail] = item.media.map((key) => media[key]);
          const caption = (
            <div className="h-space__caption" data-reveal>
              <p className="h-space__sector">
                {pad(index + 1)} — {item.sector}
              </p>
              <h3 className="h-space__title">{item.type}</h3>
              {item.tourUrl ? (
                <a className="h-link" href={item.tourUrl} target="_blank" rel="noopener noreferrer">
                  {work.link}
                  <Arrow />
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              ) : null}
            </div>
          );
          const tag = main?.temporary ? (
            <span className="h-tag h-space__tag" aria-hidden="true">
              {work.imageLabel}
            </span>
          ) : null;
          return (
            <li key={item.type} className={`h-space h-space--${layout}${layout === 'full' ? '' : ' h-wrap'}`}>
              {layout === 'full' ? (
                <>
                  <div className="h-space__frame">
                    <Photo image={main} className="h-space__main" reveal />
                    <div className="h-space__shade" aria-hidden="true" />
                    <div className="h-wrap h-space__overlay">{caption}</div>
                    {tag}
                  </div>
                </>
              ) : (
                <>
                  <div className="h-space__frame h-space__frame--main">
                    <Photo
                      image={main}
                      className="h-space__main"
                      sizes={layout === 'pair' ? '(min-width: 1000px) 62vw, 100vw' : '(min-width: 1000px) 70vw, 100vw'}
                      reveal
                    />
                    {tag}
                  </div>
                  {caption}
                  {layout === 'pair' && detail ? (
                    <Photo
                      image={detail}
                      className="h-space__detail"
                      sizes="(min-width: 1000px) 28vw, 56vw"
                      decorative
                      reveal
                    />
                  ) : null}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// One photograph against the same space in 360°.
export function Compare() {
  const { compare, tour } = home;
  return (
    <section className="h-compare" aria-labelledby="h-compare-title">
      <div className="h-wrap h-compare__head">
        <h2 id="h-compare-title" className="h-title" data-reveal>
          {compare.title}
        </h2>
      </div>
      <div className="h-wrap h-compare__grid">
        <figure className="h-compare__item h-compare__item--photo" data-reveal>
          <Photo image={media.panoView} className="h-compare__media" sizes="(min-width: 1000px) 30vw, 80vw" />
          <figcaption className="h-compare__caption">
            <span className="h-label">{compare.photo.label}</span>
            <span className="h-compare__text">{compare.photo.text}</span>
          </figcaption>
        </figure>
        <figure className="h-compare__item h-compare__item--tour" data-reveal>
          <PanoViewer image={media.pano} label={tour.hint} className="h-compare__media" initialYaw={0} />
          <figcaption className="h-compare__caption">
            <span className="h-label">{compare.tour.label}</span>
            <span className="h-compare__text">{compare.tour.text}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

// The kinds of space ROSS 360 photographs. On larger screens the photograph follows the list;
// on phones each space has its own image in a horizontal row.
export function SpaceTypes() {
  const { spaces } = home;
  const [active, setActive] = useState(0);
  return (
    <section className="h-types" aria-labelledby="h-types-title">
      <div className="h-wrap h-types__grid">
        <div className="h-types__head">
          <h2 id="h-types-title" className="h-types__title" data-reveal>
            {spaces.title}
          </h2>
        </div>
        <ul className="h-types__list">
          {spaces.items.map((item, index) => (
            <li key={item.label} className="h-types__item">
              <Link
                className={`h-types__link${index === active ? ' is-active' : ''}`}
                to={item.to}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
              >
                <Photo image={media[item.media]} className="h-types__thumb" sizes="72vw" decorative />
                <span className="h-types__num" aria-hidden="true">
                  {pad(index + 1)}
                </span>
                <span className="h-types__name">{item.label}</span>
                <Arrow />
              </Link>
            </li>
          ))}
        </ul>
        <div className="h-types__stage" aria-hidden="true">
          {spaces.items.map((item, index) => (
            <Photo
              key={item.label}
              image={media[item.media]}
              className={`h-types__photo${index === active ? ' is-active' : ''}`}
              sizes="(min-width: 1000px) 46vw, 1px"
              decorative
            />
          ))}
        </div>
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
