import { AwsClient } from 'aws4fetch';

// Presigned R2 uploads. The admin's browser converts PDF pages to images
// and PUTs them straight to the bucket with short-lived signed URLs, so
// image bytes never flow through (or get billed to) the Next.js server.
//
// Required env vars (server-only, never NEXT_PUBLIC):
//   R2_ACCOUNT_ID         Cloudflare account id
//   R2_ACCESS_KEY_ID      R2 API token key id
//   R2_SECRET_ACCESS_KEY  R2 API token secret
//   R2_BUCKET_NAME        bucket the site serves images from
//
// The bucket also needs a CORS rule allowing PUT from the site's origin -
// see ADMIN_BOOKS.md.

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

/**
 * Presign a PUT for an object key, valid for 15 minutes.
 *
 * Test escape hatch: with R2 unconfigured and TEST_UPLOAD_BASE_URL set
 * (e2e builds only), returns a plain URL against the local test server.
 */
export async function presignPutUrl(key: string): Promise<string> {
  if (!isR2Configured() && process.env.TEST_UPLOAD_BASE_URL) {
    return `${process.env.TEST_UPLOAD_BASE_URL}/${key}`;
  }

  const client = new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    service: 's3',
    region: 'auto',
  });

  const url =
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` +
    `/${process.env.R2_BUCKET_NAME}/${key}?X-Amz-Expires=900`;

  const signed = await client.sign(new Request(url, { method: 'PUT' }), {
    aws: { signQuery: true },
  });
  return signed.url;
}
