
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

// Add new Google reviews to this list as you receive them.
const reviews = [
  {
    id: 1,
    name: 'Kinetic Sports & Health',
    rating: 5,
    title: 'Reasonable price',
    text: 'The finished 360 tour looks fantastic! Rosser was professional and timely. Communication was great and everything was done well with no mess left after. Would recommend to anyone looking to enhance their website / premises!',
    date: '4 days ago',
  },
];

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
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
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
              Explore Google Street View <span aria-hidden="true">↗</span>
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

      {/* Google Reviews carousel */}
      <section
        aria-labelledby="google-reviews-heading"
        style={{
          background: '#f5f4f1',
          color: '#171717',
          padding: '76px 24px',
        }}
      >
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p
              style={{
                color: '#777777',
                fontSize: '12px',
                letterSpacing: '2px',
                fontWeight: 600,
                margin: '0 0 12px',
              }}
            >
              CLIENT FEEDBACK
            </p>

            <h2
              id="google-reviews-heading"
              style={{
                color: '#171717',
                fontSize: 'clamp(28px, 5vw, 40px)',
                lineHeight: 1.2,
                margin: '0 0 12px',
              }}
            >
              What our clients say
            </h2>

            <p
              style={{
                color: '#666666',
                fontSize: '15px',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Real feedback from businesses we've worked with.
            </p>
          </div>

          <div
            aria-live="polite"
            style={{
              background: '#ffffff',
              border: '1px solid #e4e1db',
              borderRadius: '5px',
              padding: 'clamp(24px, 5vw, 44px)',
              boxShadow: '0 10px 35px rgba(0, 0, 0, 0.045)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '22px',
              }}
            >
              <div>
                <div
                  aria-label={`${review.rating} out of 5 stars`}
                  style={{
                    color: '#e5a323',
                    fontSize: '25px',
                    letterSpacing: '3px',
                    marginBottom: '8px',
                  }}
                >
                  {'★'.repeat(review.rating)}
                  {'☆'.repeat(5 - review.rating)}
                </div>

                <p
                  style={{
                    color: '#777777',
                    fontSize: '13px',
                    margin: 0,
                  }}
                >
                  Google review
                </p>
              </div>

              <span
                aria-label="Google"
                style={{
                  color: '#555555',
                  fontSize: '15px',
                  fontWeight: 600,
                  letterSpacing: '-0.3px',
                }}
              >
                Google
              </span>
            </div>

            {review.title && (
              <h3
                style={{
                  color: '#252525',
                  fontSize: '18px',
                  margin: '0 0 12px',
                }}
              >
                {review.title}
              </h3>
            )}

            <blockquote
              style={{
                color: '#333333',
                fontSize: 'clamp(16px, 2.5vw, 19px)',
                lineHeight: 1.85,
                margin: '0 0 28px',
              }}
            >
              “{review.text}”
            </blockquote>

            <div
              style={{
                borderTop: '1px solid #eeeeee',
                paddingTop: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '18px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <p
                  style={{
                    color: '#222222',
                    fontWeight: 600,
                    fontSize: '15px',
                    margin: '0 0 5px',
                  }}
                >
                  {review.name}
                </p>

                <p
                  style={{
                    color: '#888888',
                    fontSize: '13px',
                    margin: 0,
                  }}
                >
                  {review.date}
                </p>
              </div>

              <a
                href={googleProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#171717',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderBottom: '1px solid #c6a76a',
                  paddingBottom: '5px',
                }}
              >
                View on Google ↗
              </a>
            </div>
          </div>

          {/* Carousel controls appear when there is more than one review */}
          {reviews.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '20px',
                marginTop: '26px',
              }}
            >
              <button
                type="button"
                onClick={previousReview}
                aria-label="Previous review"
                style={carouselButtonStyle}
              >
                ←
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
                    aria-current={index === activeReview ? 'true' : undefined}
                    style={{
                      width: index === activeReview ? '22px' : '8px',
                      height: '8px',
                      padding: 0,
                      border: 0,
                      borderRadius: '10px',
                      background:
                        index === activeReview ? '#171717' : '#c8c5bf',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={nextReview}
                aria-label="Next review"
                style={carouselButtonStyle}
              >
                →
              </button>
            </div>
          )}

          <p
            style={{
              color: '#888888',
              textAlign: 'center',
              fontSize: '12px',
              lineHeight: 1.6,
              margin: '24px 0 0',
            }}
          >
            Reviews are displayed as provided by customers on Google.
          </p>
        </div>
      </section>

      <Closing />
    </div>
  );
}

const carouselButtonStyle = {
  width: '42px',
  height: '42px',
  border: '1px solid #d8d5cf',
  borderRadius: '50%',
  background: '#ffffff',
  color: '#171717',
  fontSize: '21px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};
