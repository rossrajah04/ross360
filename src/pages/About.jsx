import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import Checklist from '../components/Checklist.jsx';
import CtaBand from '../components/CtaBand.jsx';
import { site } from '../content/site.js';

// No qualifications, experience, years in business or location claims are made here.
// A founder photograph can be added later (see the comment below).
export default function About() {
  return (
    <>
      <Seo page="about" />
      <PageHero
        eyebrow="About"
        title={`${site.brand} was founded by ${site.founder}.`}
        lead="Every ROSS 360 project is handled personally, from your first enquiry to the finished tour."
      />

      <section className="section" aria-labelledby="handles-heading">
        <div className="container split">
          <SectionHeading id="handles-heading" title={`What ${site.founder} handles`} />
          <div>
            <Checklist
              items={[
                'Communication',
                'Planning',
                'Capture',
                'Tour production',
                'Google publishing where appropriate',
                'Quality control',
                'Delivery',
              ]}
            />
            {/* Founder photograph: add an <img> here once a professional photo is available. */}
            <p className="small">{site.legalName}.</p>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
