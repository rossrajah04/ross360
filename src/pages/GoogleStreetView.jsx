
import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import { Arrow } from '../components/service/ServiceSections.jsx';
import { site } from '../content/site.js';
import useReveal from '../lib/useReveal.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';
import '../styles/service-pages.css';

export default function GoogleStreetView() {
  useReveal();

  const benefits = [
    {
      title: 'Help customers see inside',
      text: 'Give potential customers a better feel for your premises before they visit in person.',
    },
    {
      title: 'Showcase your business',
      text: 'Present your entrance, interior and customer-facing areas through professional 360° photography.',
    },
    {
      title: 'Make your Google profile more useful',
      text: 'Add interior imagery to your Google Business Profile, subject to Google’s publishing requirements.',
    },
  ];

  const steps = [
    {
      title: 'Tell us about your business',
      text: 'Send us your business name, location and the areas you would like photographed.',
    },
    {
      title: 'We arrange your shoot',
      text: 'We agree a suitable time to photograph your premises with minimal disruption.',
    },
    {
      title: 'Your imagery is prepared',
      text: 'We prepare the 360° photographs for the agreed Google Street View service.',
    },
  ];

  const faqs = [
    {
      question: 'What does the £99 starting price cover?',
      answer:
        '£99 is the starting price for Google Street View 360° photography. The final quote depends on your location, the size of your premises, the number of images required and any additional work.',
    },
    {
      question: 'Will my photos appear on Google Maps?',
      answer:
        'We prepare imagery for Google Street View publication. Google controls acceptance, processing, placement and availability, so publication cannot be guaranteed.',
    },
    {
      question: 'Which businesses can use this service?',
      answer:
        'The service may suit shops, cafés, restaurants, gyms, clinics, offices, salons and other customer-facing premises.',
    },
    {
      question: 'Do you cover my area?',
      answer:
        'ROSS 360 serves businesses UK-wide. Travel and any associated costs will be confirmed in your quote.',
    },
    {
      question: 'How do I get a quote?',
      answer:
        'Use the request-a-quote button and tell us about your premises. We will review your requirements and respond within one business day.',
    },
  ];

  return (
    <div className="home vt sp">
      <Seo page="businesses" />

      <section className="vt-intro sp-intro" aria-labelledby="gsv-title">
        <div className="h-wrap vt-intro__head">
          <h1 id="gsv-title" className="vt-intro__title sp-intro__title">
            Put Your Business on the Map
          </h1>

          <div className="vt-intro__aside">
            <p>
              Professional Google Street View 360° photography for businesses.
              Give customers a better look inside your premises, with packages
              starting from £99.
            </p>

            <div className="sp-actions">
              <Link className="h-close__cta" to="/get-a-quote">
                Get Your £99 Quote <Arrow />
              </Link>
              <a className="h-link" href={site.phone.whatsapp}>
                Ask us on WhatsApp <Arrow />
              </a>
            </div>

            <ul className="sp-facts">
              <li>UK-wide service</li>
              <li>Professional 360° photography</li>
              <li>From £99</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="sp-list-section" aria-labelledby="gsv-benefits">
        <div className="h-wrap">
          <h2 id="gsv-benefits" className="h-h2" data-reveal>
            Give customers a better view of your business
          </h2>

          <p className="sp-view__text">
            Photos help people understand what to expect when they visit.
            Google Street View imagery can give potential customers a closer
            look at your premises before they arrive.
          </p>

          <ul className="sp-grid sp-grid--three">
            {benefits.map((item) => (
              <li className="sp-cell" key={item.title} data-reveal>
                <h3 className="sp-cell__title">{item.title}</h3>
                <p className="sp-cell__text">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="vt-receive" aria-labelledby="gsv-included">
        <div className="h-wrap">
          <h2 id="gsv-included" className="h-h2" data-reveal>
            Google Street View photography from £99
          </h2>

          <p className="vt-deliverable__text">
            Every business is different. Tell us about your premises and we’ll
            confirm what is suitable and what your quote includes before
            anything is booked.
          </p>

          <ul className="vt-receive__list">
            {[
              {
                title: '360° photography',
                text: 'Capture selected areas of your business in immersive 360° images.',
              },
              {
                title: 'Google Street View preparation',
                text: 'Imagery prepared for the agreed Google Street View service, subject to Google’s requirements.',
              },
              {
                title: 'A clear, tailored quote',
                text: 'Your quote will explain the proposed work and any travel costs before you commit.',
              },
            ].map((item) => (
              <li className="vt-deliverable" key={item.title} data-reveal>
                <h3 className="vt-deliverable__title">{item.title}</h3>
                <p className="vt-deliverable__text">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="vt-how" aria-labelledby="gsv-process">
        <div className="h-wrap">
          <h2 id="gsv-process" className="h-h2" data-reveal>
            How it works
          </h2>

          <ol className="vt-how__steps">
            {steps.map((step, index) => (
              <li className="vt-step" key={step.title} data-reveal>
                <span className="vt-step__num" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="vt-step__title">{step.title}</h3>
                <p className="vt-step__text">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sp-list-section" aria-labelledby="gsv-faqs">
        <div className="h-wrap">
          <h2 id="gsv-faqs" className="h-h2" data-reveal>
            Frequently asked questions
          </h2>

          <ul className="sp-grid">
            {faqs.map((faq) => (
              <li className="sp-cell" key={faq.question} data-reveal>
                <h3 className="sp-cell__title">{faq.question}</h3>
                <p className="sp-cell__text">{faq.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="vt-how">
        <div className="h-wrap">
          <h2 className="h-h2" data-reveal>
            Give customers a closer look
          </h2>
          <p className="vt-deliverable__text">
            Tell us about your business and we’ll help you work out the right
            option.
          </p>
          <div className="sp-actions">
            <Link className="h-close__cta" to="/get-a-quote">
              Request Your Quote <Arrow />
            </Link>
            <a className="h-link" href={site.phone.whatsapp}>
              WhatsApp {site.phone.display} <Arrow />
            </a>
          </div>
          <p className="vt-deliverable__text">
            {site.google.disclaimer}
          </p>
        </div>
      </section>
    </div>
  );
}
