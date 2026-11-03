import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import { Arrow } from '../components/service/ServiceSections.jsx';
import useReveal from '../lib/useReveal.js';
import { site } from '../content/site.js';
import { contact } from '../content/contact.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';
import '../styles/service-pages.css';
import '../styles/about.css';
import '../styles/contact-page.css';

// The site Contact page: the three ways to get in touch as ruled rows, what to include, the quote
// form for written quotations, and where we work. Set in type, in the About page's styles.
// The business card QR opens a separate page at /card.
const external = { target: '_blank', rel: 'noopener noreferrer' };

const methods = [
  { label: 'Phone', value: site.phone.display, action: 'Call', href: `tel:${site.phone.tel}` },
  { label: 'WhatsApp', value: site.phone.display, action: 'Send a message', href: site.phone.whatsapp, ...external },
  { label: 'Email', value: site.email, action: 'Email us', href: `mailto:${site.email}` },
];

export default function Contact() {
  useReveal();
  const { hero, methodsTitle, include, quote, location } = contact;

  return (
    <div className="home vt sp ab ct">
      <Seo page="contact" />

      <section className="vt-intro sp-intro" aria-labelledby="ct-title">
        <div className="h-wrap vt-intro__head">
          <h1 id="ct-title" className="vt-intro__title sp-intro__title">
            {hero.title}
          </h1>
          <div className="vt-intro__aside">
            <p>{hero.lead}</p>
          </div>
        </div>
      </section>

      <section className="ct-methods" aria-label={methodsTitle}>
        <div className="h-wrap">
          <ul className="ct-methods__list">
            {methods.map(({ label, value, action, ...link }) => (
              <li key={label}>
                <a className="ct-method" {...link}>
                  <span className="ct-method__label">{label}</span>
                  <span className="ct-method__value">{value}</span>
                  <span className="ct-method__action">
                    {action}
                    <Arrow />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ab-split" aria-labelledby="ct-include-title">
        <div className="h-wrap ab-split__grid">
          <h2 id="ct-include-title" className="h-h2 ab-split__title" data-reveal>
            {include.title}
          </h2>
          <div className="ab-split__body" data-reveal>
            <p className="ab-text">{include.intro}</p>
            <ul className="ct-list">
              {include.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="ab-split" aria-labelledby="ct-quote-title">
        <div className="h-wrap ab-split__grid ab-split__grid--ruled">
          <h2 id="ct-quote-title" className="h-h2 ab-split__title" data-reveal>
            {quote.title}
          </h2>
          <div className="ab-split__body" data-reveal>
            <p className="ab-text">{quote.text}</p>
            <Link className="h-link ct-link" to={quote.to}>
              {quote.cta}
              <Arrow />
            </Link>
          </div>
        </div>
      </section>

      <section className="ab-split sp-last ct-last" aria-labelledby="ct-where-title">
        <div className="h-wrap ab-split__grid ab-split__grid--ruled">
          <h2 id="ct-where-title" className="h-h2 ab-split__title" data-reveal>
            {location.title}
          </h2>
          <div className="ab-split__body" data-reveal>
            <p className="ab-text">{location.text}</p>
            <div className="ct-links">
              <a className="h-link ct-link" href={site.googleProfileUrl} {...external}>
                {location.google}
                <Arrow />
              </a>
              <a className="h-link ct-link" href="/ross360.vcf" download="ROSS-360.vcf">
                {location.save}
                <Arrow />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
