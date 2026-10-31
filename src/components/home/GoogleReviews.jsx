import { useState } from 'react';

// Reviews from the ROSS 360 Google Business Profile, shown as they appear on Google.
// Add new reviews here as you receive them, copied word for word.
const googleProfileUrl = 'https://maps.app.goo.gl/1FuHte5Mw8ZvijBU9?g_st=ic';

const reviews = [
  {
    id: 1,
    name: 'Kinetic Sports & Health',
    rating: 5,
    title: 'Reasonable price',
    text: 'The finished 360 tour looks fantastic! Rosser was professional and timely. Communication was great and everything was done well with no mess left after. Would recommend to anyone looking to enhance their website / premises!',
  },
];

// Google-style initial-letter avatars: one of six colours, chosen from the name (see home.css).
function avatarTone(name) {
  let total = 0;
  for (const char of name) total += char.charCodeAt(0);
  return total % 6;
}

export function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function Stars({ rating }) {
  return (
    <span className="g-review__stars" role="img" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          className={n <= rating ? 'is-on' : undefined}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </span>
  );
}

export default function GoogleReviews() {
  const [active, setActive] = useState(0);
  const review = reviews[active];
  const step = (by) => setActive((i) => (i + by + reviews.length) % reviews.length);

  return (
    <section className="h-reviews" aria-labelledby="google-reviews-heading">
      <div className="h-wrap h-reviews__grid">
        <div className="h-reviews__intro" data-reveal>
          <h2 id="google-reviews-heading" className="h-h2">
            Reviews
          </h2>
          <p className="h-offer__text">From the ROSS 360 Google Business Profile.</p>
          <a className="h-link" href={googleProfileUrl} target="_blank" rel="noopener noreferrer">
            See reviews on Google
            <span className="h-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
        </div>

        <div className="h-reviews__body" data-reveal>
          <figure className="g-review" aria-live="polite">
            <figcaption className="g-review__head">
              <span
                className={`g-review__avatar g-review__avatar--${avatarTone(review.name)}`}
                aria-hidden="true"
              >
                {review.name.charAt(0)}
              </span>
              <span className="g-review__who">
                <span className="g-review__name">{review.name}</span>
                <Stars rating={review.rating} />
              </span>
              <span className="g-review__source" title="Google review">
                <GoogleMark size={20} />
              </span>
            </figcaption>

            <blockquote className="g-review__text">
              <p>{review.text}</p>
            </blockquote>

            {review.title && <p className="g-review__tag">{review.title}</p>}

            <p className="g-review__foot">
              <GoogleMark size={14} />
              <span>Posted on Google</span>
            </p>
          </figure>

          {reviews.length > 1 && (
            <div className="g-review__controls">
              <button type="button" onClick={() => step(-1)} aria-label="Previous review">
                ‹
              </button>
              <span className="g-review__count">
                {active + 1} of {reviews.length}
              </span>
              <button type="button" onClick={() => step(1)} aria-label="Next review">
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
