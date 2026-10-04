import { Link } from 'react-router-dom';
import Photo from '../home/Photo.jsx';
import { media } from '../../content/media.js';

// Sections shared by the Virtual Tours, Businesses and Property pages, in the Virtual Tours page's
// styles (src/styles/virtual-tours.css). Each takes its wording as props.

export function Arrow() {
  return (
    <span className="h-arrow" aria-hidden="true">
      →
    </span>
  );
}

// The service standards, two by two.
export function Standards({ id, title, items, className = '' }) {
  return (
    <section className={`vt-why ${className}`.trim()} aria-labelledby={id}>
      <div className="h-wrap">
        <h2 id={id} className="h-h2 vt-why__title" data-reveal>
          {title}
        </h2>
        <ul className="vt-why__list">
          {items.map((item, index) => (
            <li key={item.title} className="vt-reason" data-reveal>
              <span className="vt-reason__num" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="vt-reason__title">{item.title}</h3>
              <p className="vt-reason__text">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// The deliverables side by side under one rule.
export function Deliverables({ id, title, items, className = '' }) {
  return (
    <section className={`vt-receive ${className}`.trim()} aria-labelledby={id}>
      <div className="h-wrap">
        <h2 id={id} className="h-h2" data-reveal>
          {title}
        </h2>
        <ul className="vt-receive__list">
          {items.map((item) => (
            <li key={item.title} className="vt-deliverable" data-reveal>
              <h3 className="vt-deliverable__title">{item.title}</h3>
              <p className="vt-deliverable__text">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// The stages along one line.
export function Stages({ id, title, intro, steps, className = '' }) {
  return (
    <section className={`vt-how ${className}`.trim()} aria-labelledby={id}>
      <div className="h-wrap">
        <h2 id={id} className="h-h2" data-reveal>
          {title}
        </h2>
        {intro && (
          <p className="vt-how__intro" data-reveal>
            {intro}
          </p>
        )}
        <ol className="vt-how__steps">
          {steps.map((step, index) => (
            <li key={step.title} className="vt-step" data-reveal>
              <span className="vt-step__num" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="vt-step__title">{step.title}</h3>
              <p className="vt-step__text">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// Heading beside short definitions, one per row.
export function Rows({ id, title, items, className = '' }) {
  return (
    <section className={`vt-differs ${className}`.trim()} aria-labelledby={id}>
      <div className="h-wrap vt-differs__inner">
        <h2 id={id} className="h-h2 vt-differs__title" data-reveal>
          {title}
        </h2>
        <dl className="vt-differs__list" data-reveal>
          {items.map((item) => (
            <div key={item.title} className={`vt-kind${item.ours ? ' vt-kind--ours' : ''}`}>
              <dt className="vt-kind__title">{item.title}</dt>
              <dd className="vt-kind__text">{item.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// The closing enquiry over the homepage's closing photograph, with this page's wording.
export function ClosingCta({ title, text, cta, to }) {
  return (
    <section className="h-close" aria-labelledby="sp-close-title">
      <Photo image={media.closing} className="h-close__photo" decorative />
      <div className="h-close__shade" aria-hidden="true" />
      <div className="h-wrap h-close__inner" data-reveal>
        <h2 id="sp-close-title" className="h-close__title">
          {title}
        </h2>
        <p className="h-close__text">{text}</p>
        <Link className="h-close__cta" to={to}>
          {cta}
          <Arrow />
        </Link>
      </div>
    </section>
  );
}
