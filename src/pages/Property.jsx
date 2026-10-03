import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import Checklist from '../components/Checklist.jsx';
import Frame from '../components/Frame.jsx';
import CtaBand from '../components/CtaBand.jsx';
import Button from '../components/Button.jsx';
import { propertyTourTypes } from '../content/services.js';
import { propertyPricingLine } from '../content/pricing.js';
import { site } from '../content/site.js';

export default function Property() {
  return (
    <>
      <Seo page="property" />
      <PageHero
        title="360° Property Tours"
        lead="Present a property in an interactive format that allows prospective buyers and tenants to explore it online."
      >
        <div className="btn-row">
          <Button to="/get-a-quote?type=property">{site.cta.property}</Button>
        </div>
      </PageHero>

      <div className="container container--wide page-media">
        <Frame image={site.images.property} ratio="wide" caption="Property" />
      </div>

      <section className="section" aria-label="Property tours">
        <div className="container statement">
          <p className="statement__text">
            ROSS 360 provides 360° photography and interactive virtual tours for residential and commercial property.
          </p>
          <div className="statement__aside">
            <p>
              A property tour can give prospective buyers or tenants a clearer understanding of the layout and space
              before arranging a physical viewing.
            </p>
            <p>{propertyPricingLine}</p>
            <p className="small">Google Street View is not automatically included for property tours.</p>
          </div>
        </div>
      </section>

      <section id="agencies" className="section section--soft" aria-labelledby="agencies-heading">
        <div className="container">
          <SectionHeading id="agencies-heading" title="For Estate Agents & Property Professionals">
            <p className="lead lead--ink">We can provide tours for:</p>
            <Checklist items={propertyTourTypes} columns />
            <p>If you regularly require property tours, tell us about your requirements when requesting a quotation.</p>
            <div className="btn-row">
              <Button to="/get-a-quote?type=agency">{site.cta.property}</Button>
            </div>
          </SectionHeading>
        </div>
      </section>

      <CtaBand to="/get-a-quote?type=property" label={site.cta.property} />
    </>
  );
}
