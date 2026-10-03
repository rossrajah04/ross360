import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import PortfolioGallery from '../components/PortfolioGallery.jsx';
import CtaBand from '../components/CtaBand.jsx';

export default function Portfolio() {
  return (
    <>
      <Seo page="portfolio" />
      <PageHero
        title="Our Work"
        lead="Explore ROSS 360 virtual tours for businesses and property."
      />
      <section className="section" aria-label="Projects">
        <div className="container">
          <PortfolioGallery />
        </div>
      </section>
      <CtaBand />
    </>
  );
}
