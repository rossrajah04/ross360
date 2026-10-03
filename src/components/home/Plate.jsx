// Image area for the homepage. Shows the photograph when one is set in src/content/home.js.
// Without one it renders a plain tonal panel labelled "Placeholder" with a short description of the
// photograph it is reserved for, so a temporary area is never mistaken for ROSS 360 work.
// `reveal` lets the image area open gently when it first scrolls into view (see src/lib/useReveal.js).
export default function Plate({ image, spec, className = '', eager = false, reveal = false }) {
  return (
    <div className={`plate ${className}`.trim()} data-reveal={reveal ? 'image' : undefined}>
      {image ? (
        <img
          className="plate__img"
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading={eager ? 'eager' : 'lazy'}
          fetchpriority={eager ? 'high' : undefined}
          decoding="async"
        />
      ) : (
        <div className="plate__placeholder" aria-hidden="true">
          <span className="plate__label">Placeholder</span>
          {spec ? <span className="plate__spec">{spec}</span> : null}
        </div>
      )}
    </div>
  );
}
