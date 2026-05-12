import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../config/env'

// Initialize R2 client if credentials are configured
const r2 = env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    })
  : null

/**
 * Upload a buffer to R2 and return the public URL.
 * @param buffer  File buffer from multer memoryStorage
 * @param key     S3 object key (e.g. 'folder-plans/tenant-id/event-id/filename')
 * @param contentType  MIME type
 * @returns Public URL to the uploaded file
 */
export async function uploadToStorage(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<{ url: string; publicId: string }> {
  if (!r2 || !env.R2_BUCKET_NAME || !env.R2_PUBLIC_URL) {
    throw new Error('R2 is not configured. Check R2_* environment variables.')
  }

  try {
    await r2.send(new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }))

    const url = `${env.R2_PUBLIC_URL}/${key}`
    return { url, publicId: key }
  } catch (error: any) {
    console.error('[uploadToStorage] R2 upload error:', error?.message)
    throw new Error(`Failed to upload to R2: ${error?.message ?? 'unknown error'}`)
  }
}

/**
 * Delete a file from R2 by its key or full URL.
 * @param urlOrKey Full R2 URL or S3 object key
 */
export async function deleteFromStorage(urlOrKey: string): Promise<void> {
  if (!r2 || !env.R2_BUCKET_NAME || !env.R2_PUBLIC_URL) {
    console.warn('[deleteFromStorage] R2 not configured, skipping delete')
    return
  }

  try {
    // Extract key from URL if needed
    let key = urlOrKey
    if (urlOrKey.startsWith('http')) {
      key = urlOrKey.replace(`${env.R2_PUBLIC_URL}/`, '')
    }

    await r2.send(new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }))
  } catch (error: any) {
    console.warn('[deleteFromStorage] R2 delete error:', error?.message)
    // Non-fatal — file may already be gone
  }
}

/**
 * Generate a presigned PUT URL for browser-direct upload.
 * @param key       S3 object key
 * @param contentType  MIME type
 * @param expiresIn Seconds until URL expires (default: 5 min)
 * @returns Presigned URL that allows PUT to upload the file
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300,
): Promise<string> {
  if (!r2 || !env.R2_BUCKET_NAME) {
    throw new Error('R2 is not configured')
  }

  try {
    const url = await getSignedUrl(
      r2,
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn },
    )
    return url
  } catch (error: any) {
    console.error('[getPresignedUploadUrl] R2 signing error:', error?.message)
    throw new Error(`Failed to generate presigned upload URL: ${error?.message ?? 'unknown error'}`)
  }
}

/**
 * Generate a presigned GET URL for browser-direct download.
 * @param key       S3 object key
 * @param expiresIn Seconds until URL expires (default: 1 hour)
 * @returns Presigned URL that allows GET to download the file
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  if (!r2 || !env.R2_BUCKET_NAME) {
    throw new Error('R2 is not configured')
  }

  try {
    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
      }),
      { expiresIn },
    )
    return url
  } catch (error: any) {
    console.error('[getPresignedDownloadUrl] R2 signing error:', error?.message)
    throw new Error(`Failed to generate presigned download URL: ${error?.message ?? 'unknown error'}`)
  }
}

// Backwards-compatibility aliases for existing code that imports from cloudinary.ts
export const uploadToCloudinary = uploadToStorage
export const deleteFromCloudinary = deleteFromStorage
