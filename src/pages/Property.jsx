import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import Checklist from '../components/Checklist.jsx';
import CtaBand from '../components/CtaBand.jsx';
import Button from '../components/Button.jsx';
import { propertyAudiences, propertyDeliverables, propertyUseCases } from '../content/services.js';
import { site } from '../content/site.js';

export default function Property() {
  return (
    <>
      <Seo page="property" />
      <PageHero
        eyebrow="Property & estate agents"
        title="360° property tours"
        lead="Give buyers, tenants and clients a clear understanding of a property’s layout and feel before they visit."
      >
        <div className="btn-row">
          <Button to="/get-a-quote?type=property">{site.cta.primary}</Button>
          <Button href="#agencies" variant="secondary">
            For estate agencies
          </Button>
        </div>
      </PageHero>

      <section className="section" aria-labelledby="property-who-heading">
        <div className="container split">
          <SectionHeading
            id="property-who-heading"
            title="Who it’s for"
            lead="ROSS 360 can work with a single property or with an agency’s wider portfolio."
          />
          <div>
            <Checklist items={propertyAudiences} />
          </div>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="property-use-heading">
        <div className="container split">
          <SectionHeading id="property-use-heading" title="Where a property tour helps" />
          <div>
            <Checklist items={propertyUseCases} />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="property-product-heading">
        <div className="container split">
          <SectionHeading
            id="property-product-heading"
            eyebrow="Core product"
            title="360° Property Tour"
            lead="The focus is the interactive tour and its use for the property or listing."
          />
          <div>
            <Checklist items={propertyDeliverables} />
            <p>
              Google Street View is not automatically part of the property service. Google publishing is separate
              and only offered where appropriate.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="property-pricing-heading">
        <div className="container split">
          <SectionHeading id="property-pricing-heading" title="Pricing" />
          <div>
            <p>{site.propertyPricingNote}</p>
            <p>Tell us about the property in the quote form and we will confirm a price before you book.</p>
          </div>
        </div>
      </section>

      <section id="agencies" className="section" aria-labelledby="agencies-heading">
        <div className="container split">
          <SectionHeading
            id="agencies-heading"
            eyebrow="Estate agencies"
            title="One property, or many"
            lead="Work with an agency can be a one-off or ongoing."
          />
          <div>
            <Checklist
              items={[
                'Individual properties',
                'Multiple properties',
                'Ongoing agency requirements',
                'Volume work',
              ]}
            />
            <p>
              Tell us what your agency needs and we will discuss how best to work together. Arrangements are
              agreed individually.
            </p>
            <Button to="/get-a-quote?type=agency">{site.cta.agency}</Button>
          </div>
        </div>
      </section>

      <CtaBand to="/get-a-quote?type=property" />
    </>
  );
}
