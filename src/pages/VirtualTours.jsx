import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import TourStage from '../components/home/TourStage.jsx';
import { Closing } from '../components/home/HomeSections.jsx';
import useReveal from '../lib/useReveal.js';
import { virtualTours } from '../content/virtualTours.js';
import { processSteps, projectIncludes, outOfScopeNote, reasons, tourVsStreetView } from '../content/services.js';
import { site } from '../content/site.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';

// Virtual Tours: what a tour is, shown with one live example, then the details set as plain rows
// (heading on the left, content on the right) in the homepage's type and spacing, and the homepage's
// closing enquiry. The `home` class gives the page the homepage's tokens and shared styles.
// The only tour shown is the external Avalon Hotel example, labelled and credited as someone else's work.

function Arrow() {
  return (
    <span className="h-arrow" aria-hidden="true">
      →
    </span>
  );
}

function Row({ id, title, position = '', children }) {
  return (
    <section className={`vt-row${position ? ` vt-row--${position}` : ''}`} aria-labelledby={id}>
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
  const { intro, how, included, uses, compare, process, next } = virtualTours;
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

      <Row id="vt-how" title={how.title} position="first">
        <p className="vt-text vt-text--lead">{how.text}</p>
      </Row>

      <Row id="vt-included" title={included.title}>
        <ul className="vt-list vt-list--two">
          {projectIncludes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="vt-small">{outOfScopeNote}</p>
      </Row>

      <Row id="vt-uses" title={uses.title}>
        <ul className="vt-list">
          {reasons.map((item) => (
            <li key={item.title} className="vt-item">
              <h3 className="vt-item__title">{item.title}</h3>
              <p className="vt-item__text">{item.text}</p>
            </li>
          ))}
        </ul>
      </Row>

      <Row id="vt-compare" title={compare.title}>
        {compare.photos.map((text) => (
          <p key={text} className="vt-text">
            {text}
          </p>
        ))}
        <div className="vt-compare">
          <div>
            <h3 className="vt-compare__title">{compare.tourTitle}</h3>
            <ul className="vt-list">
              {tourVsStreetView.tour.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="vt-compare__title">{compare.streetViewTitle}</h3>
            <ul className="vt-list">
              {tourVsStreetView.streetView.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="vt-text">{tourVsStreetView.note}</p>
        <p className="vt-small">{site.google.disclaimer}</p>
      </Row>

      <Row id="vt-process" title={process.title}>
        <ol className="vt-list vt-list--two vt-steps">
          {processSteps.map((step, index) => (
            <li key={step.title} className="vt-item">
              <h3 className="vt-item__title">
                <span className="vt-steps__num">{index + 1}</span>
                {step.title}
              </h3>
              <p className="vt-item__text">{step.text}</p>
            </li>
          ))}
        </ol>
      </Row>

      <Row id="vt-next" title={next.title} position="last">
        <ul className="vt-list">
          {next.links.map((link) => (
            <li key={link.to} className="vt-item">
              <Link className="vt-next" to={link.to}>
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
