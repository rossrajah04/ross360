
import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import useReveal from '../lib/useReveal.js';
import {
  Opening,
  StepInside,
  Why,
  Uses,
  Offer,
  Closing,
} from '../components/home/HomeSections.jsx';
import GoogleReviews from '../components/home/GoogleReviews.jsx';
import '../styles/home.css';

export default function Home() {
  useReveal();

  return (
    <div className="home">
      <Seo page="home" />

      <Opening />
      <StepInside />
      <Why />
      <Uses />
      <Offer />

      {/* Google Street View promotion */}
      <section
        aria-labelledby="street-view-promo"
        style={{
          background: '#171717',
          color: '#ffffff',
          padding: '72px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            alignItems: 'center',
            gap: '36px',
          }}
        >
          <div>
            <p
              style={{
                color: '#c6a76a',
                fontSize: '12px',
                letterSpacing: '2px',
                fontWeight: 600,
                margin: '0 0 14px',
              }}
            >
              GOOGLE STREET VIEW
            </p>

            <h2
              id="street-view-promo"
              style={{
                fontSize: 'clamp(28px, 5vw, 42px)',
                lineHeight: 1.15,
                margin: '0 0 18px',
                color: '#ffffff',
              }}
            >
              Let customers explore your business before they arrive.
            </h2>

            <p
              style={{
                color: '#d0d0d0',
                fontSize: '16px',
                lineHeight: 1.8,
                margin: '0 0 26px',
              }}
            >
              Showcase your premises with professional 360° photography
              and an immersive virtual tour that helps customers see
              what makes your business special.
            </p>

            <Link
              to="/google-street-view"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '15px 22px',
                background: '#ffffff',
                color: '#171717',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '2px',
              }}
            >
              Explore Google Street View{' '}
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div
            style={{
              border: '1px solid #444444',
              padding: '28px',
              borderRadius: '4px',
              background: '#222222',
            }}
          >
            <p
              style={{
                color: '#c6a76a',
                fontSize: '12px',
                letterSpacing: '1.5px',
                margin: '0 0 14px',
              }}
            >
              A BETTER FIRST IMPRESSION
            </p>

            <p
              style={{
                color: '#ffffff',
                fontSize: '22px',
                lineHeight: 1.5,
                margin: '0 0 16px',
              }}
            >
              Give potential customers a closer look at your space,
              whenever and wherever they find you.
            </p>

            <p
              style={{
                color: '#c8c8c8',
                fontSize: '14px',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Suitable for shops, gyms, clinics, hospitality venues
              and other customer-facing businesses.
            </p>
          </div>
        </div>
      </section>

      <GoogleReviews />

      <Closing />
    </div>
  );
}
