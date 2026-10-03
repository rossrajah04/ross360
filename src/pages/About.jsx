import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import Frame from '../components/Frame.jsx';
import CtaBand from '../components/CtaBand.jsx';
import { site } from '../content/site.js';

// Facts only: no history, qualifications, years of experience, awards or client numbers.
// The founder photograph becomes the lead image of the page once site.images.founder is set.
export default function About() {
  const founderPhoto = site.images.founder;

  return (
    <>
      <Seo page="about" />
      <PageHero title="About ROSS 360" lead="Professional 360° photography and virtual tours for businesses and property." />

      <section className="section" aria-label="About ROSS 360">
        <div className={`container ${founderPhoto ? 'founder' : 'statement'}`}>
          {founderPhoto ? <Frame image={founderPhoto} ratio="portrait" className="founder__photo" /> : null}
          <p className={founderPhoto ? 'statement__text statement__text--small' : 'statement__text'}>
            ROSS 360 was founded by {site.founder} to provide businesses and property professionals with a
            straightforward way to present their premises online.
          </p>
          <div className="statement__aside">
            <p>
              Each project is handled directly from initial enquiry through photography, tour production and delivery.
            </p>
            <p>
              The focus is simple: accurate photography, professionally produced tours and a clear service from start
              to finish.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="details-heading">
        <div className="container">
          <SectionHeading id="details-heading" title="Business details">
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
          </SectionHeading>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
