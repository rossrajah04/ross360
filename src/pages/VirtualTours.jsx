import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import ProcessSteps from '../components/ProcessSteps.jsx';
import CtaBand from '../components/CtaBand.jsx';
import Button from '../components/Button.jsx';
import { tourIncludes } from '../content/services.js';
import { site, hostingIncludedLine } from '../content/site.js';

export default function VirtualTours() {
  return (
    <>
      <Seo page="virtualTours" />
      <PageHero
        eyebrow="360° Virtual Tours"
        title="Professional 360° virtual tours"
        lead="A virtual tour lets people explore a physical space online, moving through it at their own pace, before they visit."
      >
        <div className="btn-row">
          <Button to="/get-a-quote">{site.cta.primary}</Button>
        </div>
      </PageHero>

      <section className="section" aria-labelledby="includes-heading">
        <div className="container">
          <SectionHeading id="includes-heading" title="What a ROSS 360 tour includes" />
          <ul className="rule-grid">
            {tourIncludes.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="distinction-heading">
        <div className="container split">
          <SectionHeading
            id="distinction-heading"
            title="Your interactive tour and Google Street View"
            lead="These are two different things, and it helps to know the difference."
          />
          <div>
            <h3>ROSS 360 interactive tour</h3>
            <p>The interactive tour produced for you, which you can embed on your website or share with a link.</p>
            <h3>Google Street View</h3>
            <p>{site.google.summary}</p>
            <p className="small">{site.google.disclaimer}</p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="hosting-heading">
        <div className="container split">
          <SectionHeading id="hosting-heading" title="Hosting" />
          <div>
            <p>{hostingIncludedLine}</p>
            <p>{site.hosting.afterwards}</p>
          </div>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="process-heading">
        <div className="container">
          <SectionHeading id="process-heading" eyebrow="How it works" title="Enquire, plan, capture, build, publish, deliver" />
          <ProcessSteps />
        </div>
      </section>

      <CtaBand />
    </>
  );
}
