import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import PortfolioGallery from '../components/PortfolioGallery.jsx';
import ExampleTourSection from '../components/ExampleTourSection.jsx';
import Button from '../components/Button.jsx';
import CtaBand from '../components/CtaBand.jsx';
import { projects } from '../content/portfolio.js';
import { site } from '../content/site.js';

export default function Portfolio() {
  const hasProjects = projects.length > 0;

  return (
    <>
      <Seo page="portfolio" />
      <PageHero title="Our Work" lead="Selected 360° virtual tours produced by ROSS 360." />

      {hasProjects ? (
        <section className="section" aria-label="Projects">
          <div className="container container--wide">
            <PortfolioGallery headingLevel="h2" />
          </div>
        </section>
      ) : (
        <section className="section section--dark portfolio-empty" aria-label="Portfolio">
          <div className="container statement">
            <p className="statement__text">
              Our portfolio is currently being developed. New business and property projects will be added here as
              they are completed.
            </p>
            <div className="statement__aside">
              <Button to="/get-a-quote" variant="inverse">
                {site.cta.quote}
              </Button>
            </div>
          </div>
        </section>
      )}

      <ExampleTourSection />

      {hasProjects ? <CtaBand /> : null}
    </>
  );
}
