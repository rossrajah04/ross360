
import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import { Arrow } from '../components/service/ServiceSections.jsx';
import useReveal from '../lib/useReveal.js';
import { site } from '../content/site.js';
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
      title: 'Improve your Google Business Profile',
      text: 'Give customers more visual information when they discover your business online.',
    },
  ];

  const steps = [
    {
      title: 'Tell us about your business',
      text: 'Let us know your business name, location and what you would like photographed.',
    },
    {
      title: 'We arrange your shoot',
      text: 'We agree a convenient time to photograph your premises with minimal disruption.',
    },
    {
      title: 'We handle the technical side',
      text: 'We prepare the images and handle the agreed uploading process for you.',
    },
  ];

  const faqs = [
    {
      question: 'What does the £99 starting price cover?',
      answer:
        '£99 is the starting price for Google Street View 360° photography. Your final quote depends on your location, premises, number of images and the work required.',
    },
    {
      question: 'Do I need to provide passwords or logins?',
      answer:
        'No passwords or account logins are needed for the photography itself. You do not need to capture, prepare or upload the images. We handle the photography and agreed technical work. If Google requires account-owner approval or access for a particular publishing step, we will explain this before proceeding.',
    },
    {
      question: 'Will my images definitely appear on Google Maps?',
      answer:
        'We prepare the imagery for the agreed Google Street View service. Google controls acceptance, processing, placement and availability, so publication cannot be guaranteed.',
    },
    {
      question: 'Which businesses can use this service?',
      answer:
        'The service may suit shops, cafés, restaurants, gyms, clinics, offices and other customer-facing premises.',
    },
    {
      question: 'Do you cover my area?',
      answer:
        'ROSS 360 offers a UK-wide service. Any travel costs will be confirmed in your quote before you book.',
    },
  ];

  return (
    <div className="home vt sp">
      <Seo page="businesses" />

      <section
        className="vt-intro sp-intro sp-intro--joined"
        aria-labelledby="gsv-title"
      >
        <div className="h-wrap vt-intro__head">
          <h1
            id="gsv-title"
            className="vt-intro__title sp-intro__title"
          >
            Put Your Business on Google Street View
          </h1>

          <div className="vt-intro__aside">
            <p style={{ color: '#333333' }}>
              Give customers a better look inside your premises with
              professional 360° photography for Google Street View and
              your Google Business Profile. Packages start from £99.
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

            <div
              style={{
                marginTop: '28px',
                padding: '24px',
                background: '#ffffff',
                color: '#222222',
                border: '1px solid #dddddd',
                borderRadius: '4px',
              }}
            >
              <h2
                style={{
                  color: '#111111',
                  marginTop: 0,
                  marginBottom: '12px',
                }}
              >
                No passwords. No logins. No hassle.
              </h2>

              <p style={{ color: '#333333', marginBottom: 0 }}>
                You don't need to do anything technical. I'll capture
                the 360° photography, prepare the images and handle the
                agreed uploading process for you. No need for you to
                take photos, prepare files or upload anything yourself.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="sp-list-section"
        aria-labelledby="gsv-benefits"
      >
        <div className="h-wrap">
          <h2 id="gsv-benefits" className="h-h2" data-reveal>
            Give customers a better view of your business
          </h2>

          <p
            className="sp-view__text"
            style={{ color: '#333333' }}
          >
            Photos help people understand what to expect when they
            visit. Professional 360° imagery lets potential customers
            look around your premises before they arrive.
          </p>

          <ul className="sp-grid sp-grid--three">
            {benefits.map((item) => (
              <li className="sp-cell" key={item.title} data-reveal>
                <h3 className="sp-cell__title">{item.title}</h3>
                <p
                  className="sp-cell__text"
                  style={{ color: '#333333' }}
                >
                  {item.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="vt-receive"
        aria-labelledby="gsv-included"
      >
        <div className="h-wrap">
          <h2 id="gsv-included" className="h-h2" data-reveal>
            A simple service from start to finish
          </h2>

          <p
            className="vt-deliverable__text"
            style={{ color: '#333333' }}
          >
            From the photography to preparing the images, I'll handle
            the agreed work so you can concentrate on running your
            business.
          </p>

          <ul className="vt-receive__list">
            {[
              {
                title: 'Professional 360° photography',
                text: 'Capture selected areas of your premises in immersive 360° images.',
              },
              {
                title: 'Image preparation',
                text: 'Your images are prepared for the agreed Google Street View service.',
              },
              {
                title: 'Uploading handled for you',
                text: "I'll handle the agreed uploading process. You won't need to prepare or upload the images yourself.",
              },
            ].map((item) => (
              <li
                className="vt-deliverable"
                key={item.title}
                data-reveal
              >
                <h3 className="vt-deliverable__title">
                  {item.title}
                </h3>
                <p
                  className="vt-deliverable__text"
                  style={{ color: '#333333' }}
                >
                  {item.text}
                </p>
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
              <li
                className="vt-step"
                key={step.title}
                data-reveal
              >
                <span className="vt-step__num" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="vt-step__title">{step.title}</h3>
                <p
                  className="vt-step__text"
                  style={{ color: '#333333' }}
                >
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        className="sp-list-section"
        aria-labelledby="gsv-faqs"
      >
        <div className="h-wrap">
          <h2 id="gsv-faqs" className="h-h2" data-reveal>
            Frequently asked questions
          </h2>

          <ul className="sp-grid">
            {faqs.map((faq) => (
              <li className="sp-cell" key={faq.question} data-reveal>
                <h3 className="sp-cell__title">{faq.question}</h3>
                <p
                  className="sp-cell__text"
                  style={{ color: '#333333' }}
                >
                  {faq.answer}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="vt-how">
        <div className="h-wrap">
          <h2 className="h-h2" data-reveal>
            Ready to put your business on the map?
          </h2>

          <p
            className="vt-deliverable__text"
            style={{ color: '#333333' }}
          >
            Get in touch for a quote. I'll explain what's included
            and confirm any travel costs before you book.
          </p>

          <div className="sp-actions">
            <Link className="h-close__cta" to="/get-a-quote">
              Request Your Quote <Arrow />
            </Link>

            <a className="h-link" href={site.phone.whatsapp}>
              WhatsApp {site.phone.display} <Arrow />
            </a>
          </div>

          <p
            className="vt-deliverable__text"
            style={{ color: '#333333', marginTop: '24px' }}
          >
            {site.google.disclaimer}
          </p>
        </div>
      </section>
    </div>
  );
}
