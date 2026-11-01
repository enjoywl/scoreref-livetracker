import { useEffect, useState } from 'react';
import { getImageUrl, initWasabi, type ImageType } from '~/lib/wasabi';

interface EntityImageProps {
  type: ImageType;
  id?: string | number;
  alt?: string;
  className?: string;
  fallbackColor?: string;
}

/**
 * League/team/player image from the Wasabi bucket with a letter fallback:
 * when the id or URL is missing, or the image fails to load, renders a
 * colored circle with the entity's initial instead of a broken <img>.
 * Triggers a re-render once the Wasabi config finishes initializing so
 * images appear even when events arrived before init completed.
 */
export default function EntityImage({ type, id, alt = '', className, fallbackColor }: EntityImageProps) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [prevKey, setPrevKey] = useState(`${type}:${id}`);

  useEffect(() => {
    let cancelled = false;
    initWasabi().then(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  // Reset error state when pointing at a different image.
  const key = `${type}:${id}`;
  if (key !== prevKey) {
    setPrevKey(key);
    setFailed(false);
  }

  const src = ready ? getImageUrl(type, id) : undefined;

  if (!src || failed) {
    return (
      <span
        className={`entity-img-fallback ${className ?? ''}`}
        aria-label={alt}
        style={
          fallbackColor
            ? {
                backgroundColor: fallbackColor,
                backgroundImage: 'linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35))',
              }
            : undefined
        }
      >
        {(alt.trim()[0] || '?').toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
