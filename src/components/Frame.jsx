// Image frame for genuine photography. Every image area on the site uses it, so real project,
// premises and founder photographs can replace the placeholders by setting an image in
// src/content/site.js or src/content/portfolio.js.
//
// With no image it renders a plain tonal panel with photographic crop marks and a short caption.
// It is a reserved image area, not a photograph, an illustration or client work.
export default function Frame({ image, ratio = 'landscape', caption, className = '' }) {
  return (
    <figure className={`frame frame--${ratio} ${className}`.trim()}>
      {image ? (
        <img
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading={image.eager ? 'eager' : 'lazy'}
          decoding="async"
        />
      ) : (
        <div className="frame__placeholder" aria-hidden="true">
          <span className="frame__marks" />
          {caption ? <span className="frame__caption">{caption}</span> : null}
        </div>
      )}
    </figure>
  );
}
