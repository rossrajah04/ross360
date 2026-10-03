import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import TourStage from '../components/home/TourStage.jsx';
import { Closing } from '../components/home/HomeSections.jsx';
import useReveal from '../lib/useReveal.js';
import { virtualTours } from '../content/virtualTours.js';
import { outOfScopeNote, reasons } from '../content/services.js';
import { site } from '../content/site.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';

// Virtual Tours: what a tour is, shown with one live example, then the details set as plain rows
// (heading on the left, content on the right) in the homepage's type and spacing: how it works, how it
// compares, why ROSS 360, what is included, where it is used, the process and where to go next, then the
// homepage's closing enquiry. The `home` class gives the page the homepage's tokens and shared styles.
// The only tour shown is the external Avalon Hotel example, labelled and credited as someone else's work.

function Arrow() {
  return (
    <span className="h-arrow" aria-hidden="true">
      →
    </span>
  );
}

// `variants` adds modifiers: first, last, major (a new part of the page: more space and a darker rule)
// and wide (heading above its content rather than beside it).
function Row({ id, title, variants = [], children }) {
  return (
    <section className={['vt-row', ...variants.map((v) => `vt-row--${v}`)].join(' ')} aria-labelledby={id}>
      <div className="h-wrap vt-row__inner">
        <h2 id={id} className="h-h2 vt-row__title" data-reveal>
          {title}
        </h2>
        <div className="vt-row__body" data-reveal>
          {children}
        </div>
      </div>
    </section>
  );
}

export default function VirtualTours() {
  useReveal();
  const { intro, how, compare, why, included, uses, process, next } = virtualTours;
  const example = site.stepInsideTour;

  return (
    <div className="home vt">
      <Seo page="virtualTours" />

      <section className="vt-intro" aria-labelledby="vt-title">
        <div className="h-wrap vt-intro__head">
          <h1 id="vt-title" className="vt-intro__title">
            {intro.title}
          </h1>
          <div className="vt-intro__aside">
            <p>{intro.lead}</p>
            {example.openUrl ? (
              <a className="h-link" href={example.openUrl} target="_blank" rel="noopener noreferrer">
                {intro.open}
                <Arrow />
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            ) : null}
          </div>
        </div>
        {example.embedUrl ? (
          <div className="h-wrap">
            <TourStage tour={example} className="h-tour__stage" />
            {example.external ? (
              <p className="h-tour__note">
                <span className="h-tour__note-label">{example.label}</span>
                <span>{example.credit}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <Row id="vt-how" title={how.title} variants={['first']}>
        <p className="vt-text vt-text--lead">{how.text}</p>
      </Row>

      <Row id="vt-compare" title={compare.title}>
        <p className="vt-text">{compare.text}</p>
        <ul className="vt-list vt-pairs">
          {compare.items.map((item) => (
            <li key={item.title} className="vt-item vt-pair">
              <h3 className="vt-item__title">{item.title}</h3>
              <p className="vt-item__text">{item.text}</p>
            </li>
          ))}
        </ul>
        <p className="vt-small">
          {compare.note} {site.google.disclaimer}
        </p>
      </Row>

      <Row id="vt-why" title={why.title} variants={['major', 'wide']}>
        <ul className="vt-points">
          {why.items.map((item) => (
            <li key={item.title} className="vt-point">
              <h3 className="vt-point__title">{item.title}</h3>
              <p className="vt-point__text">{item.text}</p>
            </li>
          ))}
        </ul>
      </Row>

      <Row id="vt-included" title={included.title} variants={['major']}>
        <ul className="vt-list vt-list--two">
          {included.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="vt-small">{outOfScopeNote}</p>
      </Row>

      <Row id="vt-uses" title={uses.title}>
        <ul className="vt-list vt-pairs">
          {reasons.map((item) => (
            <li key={item.title} className="vt-item vt-pair">
              <h3 className="vt-item__title">{item.title}</h3>
              <p className="vt-item__text">{item.text}</p>
            </li>
          ))}
        </ul>
      </Row>

      <Row id="vt-process" title={process.title} variants={['major']}>
        <ol className="vt-list vt-pairs vt-steps">
          {process.steps.map((step, index) => (
            <li key={step.title} className="vt-item vt-pair">
              <h3 className="vt-item__title">
                <span className="vt-steps__num">{String(index + 1).padStart(2, '0')}</span>
                {step.title}
              </h3>
              <p className="vt-item__text">{step.text}</p>
            </li>
          ))}
        </ol>
      </Row>

      <Row id="vt-next" title={next.title} variants={['last']}>
        <ul className="vt-list vt-pairs">
          {next.links.map((link) => (
            <li key={link.to} className="vt-item">
              <Link className="vt-next vt-pair" to={link.to}>
                <span className="vt-next__title">
                  {link.title}
                  <Arrow />
                </span>
                <span className="vt-item__text">{link.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Row>

      <Closing />
    </div>
  );
}
