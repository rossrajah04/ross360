import { useParams } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import { Block } from '../components/legal/LegalPage.jsx';
import { ClosingCta } from '../components/service/ServiceSections.jsx';
import useReveal from '../lib/useReveal.js';
import { guideBySlug } from '../content/guides.js';
import NotFound from './NotFound.jsx';
import '../styles/home.css';
import '../styles/virtual-tours.css';
import '../styles/service-pages.css';
import '../styles/legal.css';

// One guide (/guides/<slug>): the service pages' hero, then the text set like the legal pages, then the
// enquiry. Wording: src/content/guides.js.

const closing = {
  title: 'Ask about your premises',
  text: 'Tell me about your business and I will send you a fixed quote.',
  cta: 'Get a Quote',
  to: '/get-a-quote',
};

export default function Guide() {
  useReveal();
  const guide = guideBySlug(useParams().slug);
  if (!guide) return <NotFound />;

  return (
    <div className="home vt sp lg">
      <Seo page={`guide:${guide.slug}`} />

      <section className="vt-intro sp-intro" aria-labelledby="gd-title">
        <div className="h-wrap vt-intro__head">
          <h1 id="gd-title" className="vt-intro__title sp-intro__title">
            {guide.title}
          </h1>
          <div className="vt-intro__aside">
            <p>{guide.lead}</p>
            <ul className="sp-facts">
              <li>Updated {guide.updated}</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="lg-body">
        <div className="h-wrap lg-layout">
          <article className="lg-text gd-text">
            {guide.sections.map((section) => (
              <section key={section.id} id={section.id} className="lg-section" aria-labelledby={`${section.id}-title`}>
                <h2 id={`${section.id}-title`} className="lg-h2">
                  {section.title}
                </h2>
                {section.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </section>
            ))}
          </article>
        </div>
      </div>

      <ClosingCta {...closing} />
    </div>
  );
}
