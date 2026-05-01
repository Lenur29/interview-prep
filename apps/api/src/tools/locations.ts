import {
  CustomFileLocation,
  FileLocation,
  FileLocationType,
  S3FileLocation,
} from '@/types/locations.js';

/**
 * Build a publicly-addressable URL for an S3 file location.
 *
 * Supports three URL shapes:
 *  - virtual-hosted style: `https://{bucket}.s3.{region}.amazonaws.com/{path}`
 *  - path-hosted style:    `{endpoint}/{bucket}/{path}` (when the location
 *    carries an `endpoint`, e.g. for MinIO / custom S3-compatible providers)
 *  - CDN style:            `{cdnUrl}/{path}` (when the location carries a
 *    `cdnUrl`)
 */
export function getS3FileUrl(location: S3FileLocation): string {
  const { bucket, path, region } = location;
  const extras = location as S3FileLocation & {
    endpoint?: string;
    cdnUrl?: string;
  };

  const cleanPath = path.replace(/^\/+/, '');

  if (extras.cdnUrl) {
    return `${extras.cdnUrl.replace(/\/+$/, '')}/${cleanPath}`;
  }

  if (extras.endpoint) {
    return `${extras.endpoint.replace(/\/+$/, '')}/${bucket}/${cleanPath}`;
  }

  const regionPart = region ? `.${region}` : '';
  return `https://${bucket}.s3${regionPart}.amazonaws.com/${cleanPath}`;
}

/**
 * Detect a file location from a URL string.
 *
 * Returns an `S3FileLocation` if the URL looks like an S3 (or S3-compatible)
 * URL with a parseable bucket+path. Otherwise, returns a `CustomFileLocation`
 * that just stores the raw URL.
 */
export function getLocation(url: string): FileLocation {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const path = parsed.pathname.replace(/^\/+/, '');

    // Virtual-hosted: <bucket>.s3.<region>.amazonaws.com or <bucket>.s3.amazonaws.com
    const virtualHostedMatch = host.match(/^([^.]+)\.s3(?:\.([^.]+))?\.amazonaws\.com$/);
    if (virtualHostedMatch) {
      const [, bucket, region] = virtualHostedMatch;
      return {
        type: FileLocationType.S3,
        bucket: bucket!,
        path,
        region,
      } as S3FileLocation;
    }
  } catch {
    // Not a parseable URL — fall through to custom.
  }

  return {
    type: FileLocationType.CUSTOM,
    url,
  } as CustomFileLocation;
}
