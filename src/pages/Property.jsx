import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import Checklist from '../components/Checklist.jsx';
import MediaFrame from '../components/MediaFrame.jsx';
import CtaBand from '../components/CtaBand.jsx';
import Button from '../components/Button.jsx';
import { propertyAudiences, propertyDeliverables, propertyUseCases } from '../content/services.js';
import { site } from '../content/site.js';

export default function Property() {
  return (
    <>
      <Seo page="property" />
      <PageHero
        eyebrow="Property and estate agents"
        title="360° property tours"
        lead="A complete 360° tour of the property, so buyers, tenants and clients understand the layout before they arrange a viewing."
      >
        <div className="btn-row">
          <Button to="/get-a-quote?type=property">{site.cta.primary}</Button>
          <Button href="#agencies" variant="secondary">
            For estate agencies
          </Button>
        </div>
      </PageHero>

      <MediaFrame image={site.images.property} tone="light" className="page-media container" />

      <section className="section" aria-labelledby="property-product-heading">
        <div className="container split">
          <SectionHeading
            id="property-product-heading"
            eyebrow="The product"
            title="360° Property Tour"
            lead="One tour of the whole property, delivered as a link you can add to listings, emails and your website."
          />
          <div>
            <Checklist items={propertyDeliverables} />
            <p className="small">
              Google Street View is not part of the property service by default. Where it is appropriate, it is
              arranged separately and only with the owner’s authorisation.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="property-use-heading">
        <div className="container">
          <SectionHeading id="property-use-heading" title="Where a property tour earns its place" />
          <ul className="rule-grid">
            {propertyUseCases.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="property-who-heading">
        <div className="container split">
          <SectionHeading
            id="property-who-heading"
            title="Who we work with"
            lead="From a single instruction to an agency’s wider portfolio."
          />
          <Checklist items={propertyAudiences} />
        </div>
      </section>

      <section className="section section--soft" aria-labelledby="property-pricing-heading">
        <div className="container split">
          <SectionHeading id="property-pricing-heading" title="Pricing" />
          <div className="prose-block">
            <p className="lead lead--ink">{site.propertyPricingNote}</p>
            <p>
              Tell us the address, approximate size or number of rooms, and which areas need to be shown. We confirm
              the price in writing before anything is booked. ROSS 360 works UK-wide, and any travel charge is
              included in the quote.
            </p>
          </div>
        </div>
      </section>

      <section id="agencies" className="section" aria-labelledby="agencies-heading">
        <div className="container split">
          <SectionHeading
            id="agencies-heading"
            eyebrow="Estate agencies"
            title="Working with agencies"
            lead="For agencies, ROSS 360 can work on a single property, a batch of instructions or an ongoing basis."
          />
          <div>
            <Checklist
              items={['Individual properties', 'Multiple properties', 'Ongoing agency requirements', 'Volume work']}
            />
            <p>
              Tell us how many properties you expect, where they are and how quickly tours are needed. We will
              agree an arrangement that suits the way your agency works.
            </p>
            <Button to="/get-a-quote?type=agency">{site.cta.agency}</Button>
          </div>
        </div>
      </section>

      <CtaBand to="/get-a-quote?type=property" />
    </>
  );
}
