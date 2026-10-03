import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import PortfolioGallery from '../components/PortfolioGallery.jsx';
import TourEmbed from '../components/TourEmbed.jsx';
import Button from '../components/Button.jsx';
import CtaBand from '../components/CtaBand.jsx';
import { projects } from '../content/portfolio.js';
import { site } from '../content/site.js';

export default function Portfolio() {
  const hasProjects = projects.length > 0;
  const hasExampleTour = Boolean(site.exampleTour.embedUrl);

  return (
    <>
      <Seo page="portfolio" />
      <PageHero
        title="Our Work"
        lead="Completed ROSS 360 projects, published with each client’s permission."
      />

      {hasProjects ? (
        <section className="section" aria-label="Projects">
          <div className="container">
            <PortfolioGallery headingLevel="h2" />
          </div>
        </section>
      ) : (
        <section className="section" aria-labelledby="portfolio-status-heading">
          <div className="container split">
            <SectionHeading id="portfolio-status-heading" title="New projects are added as they are completed" />
            <div className="prose-block">
              <p>
                Each project appears here once the tour has been delivered and the client has agreed to it being
                shown. Business and property work will both be featured.
              </p>
              <p>
                If you would like to discuss a project in the meantime, request a quote and describe the space.
                You will receive a clear price before anything is booked.
              </p>
              <div className="btn-row btn-row--tight">
                <Button to="/get-a-quote">{site.cta.primary}</Button>
                <Button to="/virtual-tours" variant="secondary">
                  What a tour includes
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {hasExampleTour ? (
        <section id="example-tour" className="section section--soft" aria-labelledby="example-heading">
          <div className="container">
            <SectionHeading
              id="example-heading"
              eyebrow="Example tour"
              title="Try the experience"
              lead="A demonstration tour, shown so you can see how a tour works. It is not a client project."
            />
            <TourEmbed className="tour-stage--large" />
          </div>
        </section>
      ) : null}

      <CtaBand />
    </>
  );
}
