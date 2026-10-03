import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import ProcessSteps from '../components/ProcessSteps.jsx';
import CtaBand from '../components/CtaBand.jsx';
import Button from '../components/Button.jsx';
import { reasons, tourVsStreetView } from '../content/services.js';
import { site } from '../content/site.js';

export default function VirtualTours() {
  return (
    <>
      <Seo page="virtualTours" />
      <PageHero title="360° Virtual Tours" lead="Interactive photography that allows visitors to explore a space online.">
        <div className="btn-row">
          <Button to="/get-a-quote">{site.cta.primary}</Button>
        </div>
      </PageHero>

      <section className="section" aria-label="About ROSS 360 virtual tours">
        <div className="container statement">
          <p className="statement__text">
            A ROSS 360 virtual tour combines high-resolution 360° photography with an interactive interface, allowing
            visitors to move between viewpoints and examine the premises from different positions.
          </p>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="why-heading">
        <div className="container">
          <SectionHeading id="why-heading" title="Give people a more complete view of your space">
            <p className="lead lead--ink">
              Traditional photographs show selected views. A 360° tour allows a visitor to look around the space
              themselves.
            </p>
            <p>
              This can be particularly useful for businesses and property where the layout, size and condition of the
              premises are important to the decision being made.
            </p>
          </SectionHeading>
          <ul className="index-list index-list--three">
            {reasons.map((item) => (
              <li key={item.title} className="index-list__item">
                <h3 className="index-list__title">{item.title}</h3>
                <p className="index-list__text">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="distinction-heading">
        <div className="container">
          <SectionHeading id="distinction-heading" title="Virtual Tour vs Google Street View" />
          <div className="compare">
            <div className="compare__col">
              <h3>ROSS 360 Virtual Tour</h3>
              <ul className="ruled-list">
                {tourVsStreetView.tour.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="compare__col">
              <h3>Google Street View</h3>
              <ul className="ruled-list">
                {tourVsStreetView.streetView.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="section-note">{tourVsStreetView.note}</p>
          <p className="small">{site.google.disclaimer}</p>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="process-heading">
        <div className="container">
          <SectionHeading id="process-heading" title="A straightforward process from photography to delivery" />
          <ProcessSteps />
        </div>
      </section>

      <CtaBand />
    </>
  );
}
