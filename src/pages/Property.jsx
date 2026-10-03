import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import Checklist from '../components/Checklist.jsx';
import MediaFrame from '../components/MediaFrame.jsx';
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

      <MediaFrame image={site.images.property} tone="light" className="page-media container" />

      <section className="section" aria-label="Property tours">
        <div className="container container--narrow">
          <div className="prose-block">
            <p className="lead lead--ink">
              ROSS 360 provides 360° photography and interactive virtual tours for residential and commercial
              property.
            </p>
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
        <div className="container split">
          <SectionHeading id="agencies-heading" title="For Estate Agents & Property Professionals" />
          <div>
            <p>We can provide tours for:</p>
            <Checklist items={propertyTourTypes} />
            <p>If you regularly require property tours, tell us about your requirements when requesting a quotation.</p>
            <div className="btn-row btn-row--tight">
              <Button to="/get-a-quote?type=agency">{site.cta.property}</Button>
            </div>
          </div>
        </div>
      </section>

      <CtaBand to="/get-a-quote?type=property" label={site.cta.property} />
    </>
  );
}
