import InteriorIllustration from './InteriorIllustration.jsx';

// Frame for a genuine photograph. With no image it shows the interior line illustration
// (when `fallback` is true) or renders nothing, so empty image slots never look broken.
export default function MediaFrame({ image, fallback = false, tone = 'dark', className = '' }) {
  if (!image && !fallback) return null;
  return (
    <figure className={`media-frame media-frame--${tone} ${className}`.trim()}>
      {image ? (
        <img
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="eager"
          decoding="async"
        />
      ) : (
        <InteriorIllustration />
      )}
    </figure>
  );
}
