import Seo from '../components/Seo.jsx';
import TourStage from '../components/home/TourStage.jsx';
import TourEmbed from '../components/TourEmbed.jsx';
import { Closing } from '../components/home/HomeSections.jsx';
import useReveal from '../lib/useReveal.js';
import { virtualTours } from '../content/virtualTours.js';
import { site } from '../content/site.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';

// Virtual Tours: the product first, then a few short parts, each composed differently.
//  - The live tour, then what a tour is beside the same tour on a phone, both on the dark ground.
//  - Why ROSS 360, what you receive, how it works (from the enquiry to delivery) and how a tour differs,
//    on the light page.
//  - The homepage's closing enquiry.
// The `home` class gives the page the homepage's tokens and shared styles. The only tour shown is the
// external Avalon Hotel example, labelled and credited as someone else's work; no imagery is copied from it.

function Arrow() {
  return (
    <span className="h-arrow" aria-hidden="true">
      →
    </span>
  );
}

export default function VirtualTours() {
  useReveal();
  const { intro, what, why, receive, how, differs } = virtualTours;
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

      {/* What a tour is, beside the same tour on a phone. The phone is shown only where the two sit
          side by side; on a phone the tour above is already the phone view. */}
      <section className="vt-what" aria-labelledby="vt-what-title">
        <div className="h-wrap vt-what__inner">
          <div className="vt-what__copy" data-reveal>
            <h2 id="vt-what-title" className="vt-what__title">
              {what.title}
            </h2>
            <p className="vt-what__lead">{what.lead}</p>
            <p className="vt-what__text">{what.text}</p>
          </div>
          {example.embedUrl ? (
            <figure className="h-phone vt-what__phone" data-reveal>
              <div className="h-phone__frame">
                <TourEmbed tour={{ ...example, title: `${example.title} (phone view)` }} className="h-phone__screen" />
              </div>
              {example.external ? <figcaption className="h-phone__caption">{example.credit}</figcaption> : null}
            </figure>
          ) : null}
        </div>
      </section>

      <section className="vt-why" aria-labelledby="vt-why-title">
        <div className="h-wrap">
          <h2 id="vt-why-title" className="h-h2 vt-why__title" data-reveal>
            {why.title}
          </h2>
          <ul className="vt-why__list">
            {why.items.map((item) => (
              <li key={item.title} className="vt-reason" data-reveal>
                <h3 className="vt-reason__title">{item.title}</h3>
                <p className="vt-reason__text">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="vt-receive" aria-labelledby="vt-receive-title">
        <div className="h-wrap">
          <h2 id="vt-receive-title" className="h-h2" data-reveal>
            {receive.title}
          </h2>
          <ul className="vt-receive__list">
            {receive.items.map((item) => (
              <li key={item.title} className="vt-deliverable" data-reveal>
                <h3 className="vt-deliverable__title">{item.title}</h3>
                <p className="vt-deliverable__text">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="vt-how" aria-labelledby="vt-how-title">
        <div className="h-wrap">
          <h2 id="vt-how-title" className="h-h2" data-reveal>
            {how.title}
          </h2>
          <ol className="vt-how__steps">
            {how.steps.map((step, index) => (
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

      <section className="vt-differs" aria-labelledby="vt-differs-title">
        <div className="h-wrap vt-differs__inner">
          <h2 id="vt-differs-title" className="h-h2 vt-differs__title" data-reveal>
            {differs.title}
          </h2>
          <dl className="vt-differs__list" data-reveal>
            {differs.items.map((item) => (
              <div key={item.title} className={`vt-kind${item.ours ? ' vt-kind--ours' : ''}`}>
                <dt className="vt-kind__title">{item.title}</dt>
                <dd className="vt-kind__text">{item.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Closing />
    </div>
  );
}
