
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
        aria-labelledby="home-google-street-view"
        style={{
          background: '#f3f1ec',
          color: '#171717',
          padding: 'clamp(48px, 8vw, 88px) 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: '36px',
            alignItems: 'center',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: '#555555',
                marginBottom: '16px',
              }}
            >
              GOOGLE STREET VIEW PHOTOGRAPHY
            </p>

            <h2
              id="home-google-street-view"
              style={{
                color: '#171717',
                fontSize: 'clamp(32px, 5vw, 48px)',
                lineHeight: 1.12,
                letterSpacing: '-1px',
                margin: '0 0 20px',
              }}
            >
              Get Your Business on Google Street View
            </h2>

            <p
              style={{
                color: '#333333',
                fontSize: '17px',
                lineHeight: 1.75,
                marginBottom: '24px',
              }}
            >
              Give customers a better look inside your premises with
              professional 360° photography for Google Street View
              and your Google Business Profile.
            </p>

            <p
              style={{
                color: '#171717',
                fontSize: '24px',
                fontWeight: 600,
                marginBottom: '24px',
              }}
            >
              Packages from £99
            </p>

            <Link
              to="/google-street-view"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '17px 24px',
                background: '#111111',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                minHeight: '54px',
              }}
            >
              Explore Google Street View <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #dedbd5',
              borderRadius: '5px',
              padding: 'clamp(24px, 5vw, 38px)',
            }}
          >
            <h3
              style={{
                color: '#171717',
                fontSize: 'clamp(25px, 4vw, 32px)',
                lineHeight: 1.2,
                margin: '0 0 16px',
              }}
            >
              No passwords. No logins. No hassle.
            </h3>

            <p
              style={{
                color: '#333333',
                fontSize: '16px',
                lineHeight: 1.75,
                margin: '0 0 20px',
              }}
            >
              I'll capture the 360° photography, prepare the images
              and handle the agreed uploading process. You won't need
              to take photos, prepare files or upload anything yourself.
            </p>

            <Link
              to="/google-street-view"
              style={{
                color: '#171717',
                fontWeight: 600,
                textUnderlineOffset: '5px',
              }}
            >
              Find out how it works →
            </Link>
          </div>
        </div>
      </section>

      <Closing />
    </div>
  );
}
