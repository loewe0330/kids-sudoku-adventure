import { useState, type CSSProperties, type ReactNode } from "react";

interface AssetImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  objectFit?: CSSProperties["objectFit"];
  fallback?: ReactNode;
}

export function AssetImage({
  src,
  alt,
  className = "",
  loading = "lazy",
  objectFit = "contain",
  fallback
}: AssetImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <span className={`asset-image ${loaded ? "is-loaded" : "is-loading"} ${failed ? "is-fallback" : ""} ${className}`.trim()}>
      {!failed && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          style={{ objectFit }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      {failed && (fallback ?? <span className="asset-image-fallback" role="img" aria-label={alt}>✦</span>)}
    </span>
  );
}
