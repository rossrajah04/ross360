
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
      text: 'Let potential customers look around your premises before they visit.',
    },
    {
      title: 'Showcase your business',
      text: 'Present your entrance, interior and customer-facing areas through professional 360° photography.',
    },
    {
      title: 'Improve your Google profile',
      text: 'Give people more visual information when they discover your business online.',
    },
  ];

  const steps = [
    {
      title: 'Tell me about your business',
      text: 'Share your business name, location and what you would like photographed.',
    },
    {
      title: 'I capture the images',
      text: 'We arrange a convenient time for your photography session.',
    },
    {
      title: 'I handle the technical work',
      text: 'I prepare the images and handle the agreed uploading process for you.',
    },
  ];

  const faqs = [
    {
      question: 'What does the £99 starting price cover?',
      answer:
        '£99 is the starting price for Google Street View 360° photography. The final price depends on your premises, location, the number of images and the work required.',
    },
    {
      question: 'Do I need to provide passwords or logins?',
      answer:
        'No passwords or logins are needed for the photography. I capture and prepare the images and handle the agreed uploading process. If Google requires account-owner approval for a publishing step, I will explain this beforehand.',
    },
    {
      question: 'Will my images definitely appear on Google?',
      answer:
        'I prepare the imagery for the agreed Google Street View service. Google controls acceptance, processing and publication, so publication cannot be guaranteed.',
    },
    {
      question: 'Which businesses can use this service?',
      answer:
        'The service can suit shops, cafés, restaurants, gyms, clinics, offices and other customer-facing premises.',
    },
    {
      question: 'Do you cover my area?',
      answer:
        'ROSS 360 offers a UK-wide service. Any travel costs will be confirmed in your quote before you book.',
    },
  ];

  const darkSection = {
    background: '#111111',
    color: '#f7f7f7',
  };

  const lightText = {
    color: '#f0f0f0',
  };

  const bodyText = {
    color: '#333333',
    lineHeight: 1.7,
  };

  return (
    <div className="home vt sp">
      <Seo page="businesses" />

      {/* INTRODUCTION */}
      <section
        className="vt-intro sp-intro"
        aria-labelledby="gsv-title"
        style={{ ...darkSection, padding: '64px 0 56px' }}
      >
        <div className="h-wrap">
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <p
              style={{
                ...lightText,
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '18px',
              }}
            >
              GOOGLE STREET VIEW PHOTOGRAPHY
            </p>

            <h1
              id="gsv-title"
              style={{
                color: '#ffffff',
                fontSize: 'clamp(36px, 7vw, 64px)',
                lineHeight: 1.08,
                letterSpacing: '-1.5px',
                margin: '0 0 24px',
                maxWidth: '700px',
              }}
            >
              Put Your Business on the Map
            </h1>

            <p
              style={{
                ...lightText,
                fontSize: 'clamp(17px, 3vw, 21px)',
                lineHeight: 1.7,
                maxWidth: '650px',
                margin: '0 0 28px',
              }}
            >
              Give customers a better look inside your premises with
              professional 360° photography for Google Street View
              and your Google Business Profile.
            </p>

            <p
              style={{
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: 600,
                margin: '0 0 28px',
              }}
            >
              Packages from £99
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '30px',
              }}
            >
              <Link className="h-close__cta" to="/get-a-quote">
                Get a Quote <Arrow />
              </Link>

              <a className="h-link" href={site.phone.whatsapp}>
                Ask Me on WhatsApp <Arrow />
              </a>
            </div>

            <ul
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px 24px',
                padding: 0,
                margin: 0,
                listStyle: 'none',
                color: '#e5e5e5',
                fontSize: '15px',
                lineHeight: 1.7,
              }}
            >
              <li>UK-wide service</li>
              <li>Professional 360° photography</li>
              <li>From £99</li>
            </ul>

            {/* NO PASSWORDS OR LOGINS */}
            <div
              style={{
                marginTop: '36px',
                padding: 'clamp(22px, 5vw, 36px)',
                background: '#ffffff',
                color: '#222222',
                borderRadius: '6px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              }}
            >
              <p
                style={{
                  color: '#555555',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '1.8px',
                  textTransform: 'uppercase',
                  margin: '0 0 12px',
                }}
              >
                A hands-off service
              </p>

              <h2
                style={{
                  color: '#111111',
                  fontSize: 'clamp(27px, 5vw, 38px)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.5px',
                  margin: '0 0 16px',
                }}
              >
                No passwords. No logins. No hassle.
              </h2>

              <p
                style={{
                  ...bodyText,
                  fontSize: '17px',
                  margin: 0,
                }}
              >
                You don't need to do anything technical. I'll capture
                the 360° photography, prepare the images and handle
                the agreed uploading process. You won't need to take
                photos, prepare files or upload anything yourself.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section
        className="sp-list-section"
        aria-labelledby="gsv-benefits"
        style={{ padding: '64px 0' }}
      >
        <div className="h-wrap">
          <h2
            id="gsv-benefits"
            className="h-h2"
            data-reveal
            style={{ color: '#171717', marginBottom: '18px' }}
          >
            Give customers a better view of your business
          </h2>

          <p
            style={{
              ...bodyText,
              fontSize: '17px',
              maxWidth: '680px',
              marginBottom: '36px',
            }}
          >
            Help people understand what to expect before they visit.
            Professional 360° imagery gives potential customers a
            closer look at your premises.
          </p>

          <ul className="sp-grid sp-grid--three">
            {benefits.map((item) => (
              <li className="sp-cell" key={item.title} data-reveal>
                <h3
                  className="sp-cell__title"
                  style={{ color: '#171717' }}
                >
                  {item.title}
                </h3>
                <p className="sp-cell__text" style={bodyText}>
                  {item.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SERVICE DETAILS */}
      <section
        className="vt-receive"
        aria-labelledby="gsv-included"
        style={{ padding: '64px 0' }}
      >
        <div className="h-wrap">
          <h2
            id="gsv-included"
            className="h-h2"
            data-reveal
            style={{ color: '#171717' }}
          >
            I take care of the technical side
          </h2>

          <p
            style={{
              ...bodyText,
              fontSize: '17px',
              maxWidth: '680px',
              marginBottom: '30px',
            }}
          >
            From capturing the photography to preparing the images,
            I'll handle the agreed work so you can focus on running
            your business.
          </p>

          <ul className="vt-receive__list">
            {[
              {
                title: 'Professional 360° photography',
                text: 'I capture selected areas of your premises in immersive 360° images.',
              },
              {
                title: 'Image preparation',
                text: 'Your images are prepared for the agreed Google Street View service.',
              },
              {
                title: 'Uploading handled for you',
                text: "I'll manage the agreed uploading process. You won't need to prepare or upload the images yourself.",
              },
            ].map((item) => (
              <li
                className="vt-deliverable"
                key={item.title}
                data-reveal
              >
                <h3
                  className="vt-deliverable__title"
                  style={{ color: '#171717' }}
                >
                  {item.title}
                </h3>
                <p className="vt-deliverable__text" style={bodyText}>
                  {item.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PROCESS */}
      <section
        className="vt-how"
        aria-labelledby="gsv-process"
        style={{ padding: '64px 0' }}
      >
        <div className="h-wrap">
          <h2
            id="gsv-process"
            className="h-h2"
            data-reveal
            style={{ color: '#171717' }}
          >
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
                <h3
                  className="vt-step__title"
                  style={{ color: '#171717' }}
                >
                  {step.title}
                </h3>
                <p className="vt-step__text" style={bodyText}>
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section
        className="sp-list-section"
        aria-labelledby="gsv-faqs"
        style={{ padding: '64px 0' }}
      >
        <div className="h-wrap">
          <h2
            id="gsv-faqs"
            className="h-h2"
            data-reveal
            style={{ color: '#171717' }}
          >
            Frequently asked questions
          </h2>

          <ul className="sp-grid">
            {faqs.map((faq) => (
              <li className="sp-cell" key={faq.question} data-reveal>
                <h3
                  className="sp-cell__title"
                  style={{ color: '#171717' }}
                >
                  {faq.question}
                </h3>
                <p className="sp-cell__text" style={bodyText}>
                  {faq.answer}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section
        className="vt-how"
        style={{ padding: '64px 0' }}
        aria-labelledby="gsv-final"
      >
        <div className="h-wrap">
          <h2
            id="gsv-final"
            className="h-h2"
            data-reveal
            style={{ color: '#171717' }}
          >
            Ready to put your business on the map?
          </h2>

          <p
            style={{
              ...bodyText,
              fontSize: '17px',
              maxWidth: '680px',
              marginBottom: '28px',
            }}
          >
            Get in touch for a quote. I'll explain what's included
            and confirm any travel costs before you book.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <Link className="h-close__cta" to="/get-a-quote">
              Get a Quote <Arrow />
            </Link>

            <a className="h-link" href={site.phone.whatsapp}>
              WhatsApp {site.phone.display} <Arrow />
            </a>
          </div>

          <p
            style={{
              ...bodyText,
              fontSize: '13px',
              marginTop: '30px',
            }}
          >
            {site.google.disclaimer}
          </p>
        </div>
      </section>
    </div>
  );
}
