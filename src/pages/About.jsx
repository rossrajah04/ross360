import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import MediaFrame from '../components/MediaFrame.jsx';
import CtaBand from '../components/CtaBand.jsx';
import { site } from '../content/site.js';

// Facts only: no years of experience, qualifications, previous employers or client history.
// The founder photograph appears automatically once site.images.founder is set to a genuine photo.
export default function About() {
  const founderPhoto = site.images.founder;

  return (
    <>
      <Seo page="about" />
      <PageHero
        eyebrow="About"
        title="About ROSS 360"
        lead={`ROSS 360 is a specialist 360° virtual tour service for businesses and property, founded and run by ${site.founder}.`}
      />

      <section className="section" aria-labelledby="why-heading">
        <div className={`container ${founderPhoto ? 'about-intro' : 'split'}`}>
          {founderPhoto ? (
            <MediaFrame image={founderPhoto} tone="light" className="about-intro__photo" />
          ) : (
            <SectionHeading id="why-heading" title="Why ROSS 360 exists" />
          )}
          <div className="prose-block">
            {founderPhoto ? <h2 id="why-heading">Why ROSS 360 exists</h2> : null}
            <p className="lead lead--ink">
              People want to understand a space before they give it their time: before they book a table, join a
              gym, choose a venue or arrange a viewing.
            </p>
            <p>
              Photographs show parts of a space. A well-made tour shows how it fits together. ROSS 360 does one thing:
              it produces that kind of tour properly, for businesses and for property, anywhere in the UK.
            </p>
            <p>
              That means planning each capture around the space and what it needs to show, photographing it
              carefully, and delivering a finished tour that is ready to use, not a set of files to work out.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="direct-heading">
        <div className="container split">
          <SectionHeading id="direct-heading" title="You deal directly with the person doing the work" />
          <div className="prose-block">
            <p>
              Every ROSS 360 project is handled by {site.founder} personally. The person who answers your enquiry is
              the person who plans the capture, photographs the space, builds the tour, checks it and delivers it.
            </p>
            <p>
              Nothing is passed between departments, so the details you agree at the start are the
              details carried through to the finished tour.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="handled-heading">
        <div className="container">
          <SectionHeading id="handled-heading" title="How projects are handled" />
          <dl className="spec-list">
            <div className="spec-list__row">
              <dt>Communication</dt>
              <dd>One point of contact from the first enquiry to delivery.</dd>
            </div>
            <div className="spec-list__row">
              <dt>Planning</dt>
              <dd>The location, layout and areas to capture are reviewed before you receive a quote.</dd>
            </div>
            <div className="spec-list__row">
              <dt>Capture</dt>
              <dd>The agreed areas are photographed on site in 360°.</dd>
            </div>
            <div className="spec-list__row">
              <dt>Tour production</dt>
              <dd>Panoramas are processed and connected into a tour that follows the real route through the space.</dd>
            </div>
            <div className="spec-list__row">
              <dt>Google publishing</dt>
              <dd>Where appropriate and separately authorised, agreed imagery is submitted to Google Street View.</dd>
            </div>
            <div className="spec-list__row">
              <dt>Quality control</dt>
              <dd>Every viewpoint and connection is checked before the tour is delivered.</dd>
            </div>
            <div className="spec-list__row">
              <dt>Delivery</dt>
              <dd>You receive the tour link and embed code, ready to use.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="expect-heading">
        <div className="container split">
          <SectionHeading id="expect-heading" title="What you can expect" />
          <ul className="rule-list">
            <li>
              <strong>A clear price first</strong>
              <span>Your exact price, including any travel, is confirmed in writing before you book.</span>
            </li>
            <li>
              <strong>An agreed scope</strong>
              <span>What will be captured is agreed in advance, so the finished tour matches what you expected.</span>
            </li>
            <li>
              <strong>Straightforward terms</strong>
              <span>Plain, published terms on payment, cancellation, corrections and reshoots.</span>
            </li>
            <li>
              <strong>A prompt reply</strong>
              <span>Enquiries are answered {site.responseTime}.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="details-heading">
        <div className="container split">
          <SectionHeading id="details-heading" title="Business details" />
          <dl className="details">
            <div>
              <dt>Trading name</dt>
              <dd>{site.brand}</dd>
            </div>
            <div>
              <dt>Operated by</dt>
              <dd>{site.founder}, sole trader</dd>
            </div>
            <div>
              <dt>Service area</dt>
              <dd>{site.serviceArea}</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
