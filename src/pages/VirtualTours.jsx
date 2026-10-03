import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import ProcessSteps from '../components/ProcessSteps.jsx';
import CtaBand from '../components/CtaBand.jsx';
import Button from '../components/Button.jsx';
import { tourComponents } from '../content/services.js';
import { site, hostingIncludedLine } from '../content/site.js';

export default function VirtualTours() {
  return (
    <>
      <Seo page="virtualTours" />
      <PageHero
        eyebrow="360° virtual tours"
        title="Professional 360° virtual tours"
        lead="Every tour is planned around the space, photographed on site and built into a tour you can put straight to use."
      >
        <div className="btn-row">
          <Button to="/get-a-quote">{site.cta.primary}</Button>
          <Button to="/pricing" variant="secondary">
            {site.cta.pricing}
          </Button>
        </div>
      </PageHero>

      <section className="section" aria-labelledby="components-heading">
        <div className="container">
          <SectionHeading
            id="components-heading"
            title="What goes into a ROSS 360 tour"
            lead="The parts of the service, and what each one means for the finished tour."
          />
          <dl className="spec-list">
            {tourComponents.map((item) => (
              <div key={item.title} className="spec-list__row">
                <dt>{item.title}</dt>
                <dd>{item.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="distinction-heading">
        <div className="container">
          <SectionHeading
            id="distinction-heading"
            title="Your tour and Google Street View are different things"
            lead="Both can show your premises online, but they are separate products on separate platforms."
          />
          <div className="compare">
            <div className="compare__col compare__col--primary">
              <h3>ROSS 360 interactive tour</h3>
              <ul>
                <li>Produced for you by ROSS 360</li>
                <li>Hosted by ROSS 360, with {site.hosting.includedMonths} months included</li>
                <li>Embedded on your website or shared as a link</li>
                <li>Included in every tour</li>
              </ul>
            </div>
            <div className="compare__col">
              <h3>Google Street View</h3>
              <ul>
                <li>A Google platform, seen on Google Maps</li>
                <li>Published only where appropriate and with your separate authorisation</li>
                <li>Acceptance, timing and placement decided by Google</li>
                <li>No ROSS 360 hosting fee</li>
              </ul>
            </div>
          </div>
          <p className="small compare__note">{site.google.disclaimer}</p>
        </div>
      </section>

      <section className="section" aria-labelledby="hosting-heading">
        <div className="container split">
          <SectionHeading id="hosting-heading" title="Hosting" />
          <div className="prose-block">
            <p>
              {hostingIncludedLine} During that time the tour stays online at its link and wherever you have
              embedded it.
            </p>
            <p>{site.hosting.afterwards}</p>
          </div>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="process-heading">
        <div className="container">
          <SectionHeading id="process-heading" eyebrow="How it works" title="Six steps, one point of contact" />
          <ProcessSteps />
        </div>
      </section>

      <CtaBand />
    </>
  );
}
