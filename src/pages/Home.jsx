
import { useState } from 'react';
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

const googleProfileUrl =
  'https://maps.app.goo.gl/1FuHte5Mw8ZvijBU9?g_st=ic';

// Add new reviews here as you receive them.
const reviews = [
  {
    id: 1,
    name: 'Kinetic Sports & Health',
    rating: 5,
    title: 'Reasonable price',
    text: 'The finished 360 tour looks fantastic! Rosser was professional and timely. Communication was great and everything was done well with no mess left after. Would recommend to anyone looking to enhance their website / premises!',
  },
];

const arrowButtonStyle = {
  width: '42px',
  height: '42px',
  border: '1px solid #dadce0',
  borderRadius: '50%',
  background: '#ffffff',
  color: '#5f6368',
  fontSize: '26px',
  lineHeight: 1,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function Home() {
  useReveal();

  const [activeReview, setActiveReview] = useState(0);
  const review = reviews[activeReview];

  const previousReview = () => {
    setActiveReview((current) =>
      current === 0 ? reviews.length - 1 : current - 1
    );
  };

  const nextReview = () => {
    setActiveReview((current) =>
      current === reviews.length - 1 ? 0 : current + 1
    );
  };

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

      {/* Google-style reviews carousel */}
      <section
        aria-labelledby="google-reviews-heading"
        style={{
          background: '#f8f9fa',
          color: '#202124',
          padding: '64px 20px',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2
              id="google-reviews-heading"
              style={{
                color: '#202124',
                fontSize: 'clamp(26px, 5vw, 36px)',
                fontWeight: 400,
                margin: '0 0 12px',
              }}
            >
              Reviews
            </h2>

            <p
              style={{
                color: '#5f6368',
                fontSize: '15px',
                margin: 0,
              }}
            >
              What customers say about ROSS 360
            </p>
          </div>

          <div
            aria-live="polite"
            style={{
              background: '#ffffff',
              border: '1px solid #dadce0',
              borderRadius: '12px',
              padding: 'clamp(22px, 5vw, 32px)',
              boxShadow: '0 1px 2px rgba(60,64,67,0.08)',
            }}
          >
            {/* Google branding and reviewer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '20px',
              }}
            >
              <span
                aria-label="Google"
                style={{
                  fontSize: '36px',
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-2px',
                  flexShrink: 0,
                  background:
                    'conic-gradient(from -45deg, #4285F4 0deg 90deg, #34A853 90deg 180deg, #FBBC05 180deg 270deg, #EA4335 270deg 360deg)',
                  color: 'transparent',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                }}
              >
                G
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: '#202124',
                    fontSize: '16px',
                    fontWeight: 600,
                    marginBottom: '5px',
                  }}
                >
                  {review.name}
                </div>

                <div style={{ color: '#5f6368', fontSize: '13px' }}>
                  Google reviewer
                </div>
              </div>

              <a
                href={googleProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View ROSS 360 Google Business Profile"
                style={{
                  color: '#5f6368',
                  textDecoration: 'none',
                  fontSize: '24px',
                  padding: '4px',
                }}
              >
                ⋮
              </a>
            </div>

            {/* Star rating */}
            <div
              aria-label={`${review.rating} out of 5 stars`}
              style={{
                color: '#fbbc04',
                fontSize: '21px',
                letterSpacing: '1px',
                marginBottom: '14px',
              }}
            >
              {'★'.repeat(review.rating)}
              {'☆'.repeat(5 - review.rating)}
            </div>

            {review.title && (
              <h3
                style={{
                  color: '#202124',
                  fontSize: '16px',
                  fontWeight: 600,
                  margin: '0 0 10px',
                }}
              >
                {review.title}
              </h3>
            )}

            <blockquote
              style={{
                color: '#3c4043',
                fontSize: '15px',
                lineHeight: 1.75,
                margin: '0 0 24px',
              }}
            >
              “{review.text}”
            </blockquote>

            <div
              style={{
                borderTop: '1px solid #dadce0',
                paddingTop: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ color: '#5f6368', fontSize: '13px' }}>
                <span style={{ color: '#4285F4', fontWeight: 600 }}>
                  Google
                </span>{' '}
                review
              </div>

              <a
                href={googleProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minHeight: '42px',
                  padding: '0 18px',
                  border: '1px solid #dadce0',
                  borderRadius: '22px',
                  background: '#ffffff',
                  color: '#1a73e8',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Read on Google ↗
              </a>
            </div>
          </div>

          {/* Carousel controls appear when more reviews are added */}
          {reviews.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '20px',
                marginTop: '22px',
              }}
            >
              <button
                type="button"
                onClick={previousReview}
                aria-label="Previous review"
                style={arrowButtonStyle}
              >
                ‹
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {reviews.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveReview(index)}
                    aria-label={`Show review ${index + 1}`}
                    aria-current={
                      index === activeReview ? 'true' : undefined
                    }
                    style={{
                      width: index === activeReview ? '20px' : '8px',
                      height: '8px',
                      padding: 0,
                      border: 0,
                      borderRadius: '10px',
                      background:
                        index === activeReview ? '#1a73e8' : '#dadce0',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={nextReview}
                aria-label="Next review"
                style={arrowButtonStyle}
              >
                ›
              </button>
            </div>
          )}

          <p
            style={{
              color: '#70757a',
              textAlign: 'center',
              fontSize: '12px',
              lineHeight: 1.6,
              margin: '20px 0 0',
            }}
          >
            Customer feedback displayed from Google reviews.
          </p>
        </div>
      </section>

      <Closing />
    </div>
  );
}
