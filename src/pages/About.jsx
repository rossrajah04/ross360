import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import MediaFrame from '../components/MediaFrame.jsx';
import CtaBand from '../components/CtaBand.jsx';
import { site } from '../content/site.js';

// Facts only: no history, qualifications, years of experience, awards or client numbers.
// The founder photograph appears automatically once site.images.founder is set to a genuine photo.
export default function About() {
  const founderPhoto = site.images.founder;

  return (
    <>
      <Seo page="about" />
      <PageHero
        title="About ROSS 360"
        lead="Professional 360° photography and virtual tours for businesses and property."
      />

      <section className="section" aria-label="About ROSS 360">
        <div className={`container ${founderPhoto ? 'about-intro' : 'container--narrow'}`}>
          {founderPhoto ? <MediaFrame image={founderPhoto} tone="light" className="about-intro__photo" /> : null}
          <div className="prose-block">
            <p className="lead lead--ink">
              ROSS 360 was founded by {site.founder} to provide businesses and property professionals with a
              straightforward way to present their premises online.
            </p>
            <p>
              Each project is handled directly from initial enquiry through photography, tour production and
              delivery.
            </p>
            <p>
              The focus is simple: accurate photography, professionally produced tours and a clear service from
              start to finish.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="details-heading">
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
