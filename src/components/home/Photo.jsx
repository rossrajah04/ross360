// Responsive photograph for a homepage image slot (see src/content/media.js).
// Serves AVIF, then WebP, then JPEG at the generated widths, and fills its container (object-fit: cover).
// A slot with no generated image renders a plain dark surface so the composition holds.
const srcset = (data, file, ext) => data.widths.map((w) => `/images/home/${file}-${w}.${ext} ${w}w`).join(', ');

// `reveal` lets the photograph open gently the first time it scrolls into view (src/lib/useReveal.js).
export default function Photo({ image, sizes = '100vw', className = '', eager = false, decorative = false, reveal = false }) {
  const revealAttr = reveal ? 'image' : undefined;
  if (!image) return <div className={`photo photo--empty ${className}`.trim()} aria-hidden="true" data-reveal={revealAttr} />;
  const { data, file, alt, position } = image;
  const largest = data.widths[data.widths.length - 1];
  return (
    <picture className={`photo ${className}`.trim()} style={{ backgroundColor: data.color }} data-reveal={revealAttr}>
      <source type="image/avif" srcSet={srcset(data, file, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcset(data, file, 'webp')} sizes={sizes} />
      <img
        className="photo__img"
        src={`/images/home/${file}-${largest}.jpg`}
        srcSet={srcset(data, file, 'jpg')}
        sizes={sizes}
        alt={decorative ? '' : alt}
        width={data.width}
        height={data.height}
        loading={eager ? 'eager' : 'lazy'}
        fetchpriority={eager ? 'high' : undefined}
        decoding="async"
        style={position ? { objectPosition: position } : undefined}
      />
    </picture>
  );
}
