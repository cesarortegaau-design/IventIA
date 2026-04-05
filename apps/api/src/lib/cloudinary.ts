import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 * @param buffer  File buffer from multer memoryStorage
 * @param folder  Cloudinary folder (e.g. 'iventia/resources')
 * @param resourceType  'image' | 'raw' | 'auto'
 */
export function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'raw' | 'auto' = 'auto',
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'))
        resolve({ url: result.secure_url, publicId: result.public_id })
      },
    )
    stream.end(buffer)
  })
}

/**
 * Delete a file from Cloudinary by its public_id.
 * Extracts the public_id from a full Cloudinary URL if needed.
 */
export async function deleteFromCloudinary(urlOrPublicId: string, resourceType: 'image' | 'raw' | 'auto' = 'image') {
  try {
    // Extract public_id from URL like: https://res.cloudinary.com/cloud/image/upload/v123/folder/filename
    let publicId = urlOrPublicId
    if (urlOrPublicId.includes('cloudinary.com')) {
      const match = urlOrPublicId.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/)
      if (match) publicId = match[1]
    }
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
  } catch {
    // Non-fatal — file may already be gone
  }
}

export default cloudinary
