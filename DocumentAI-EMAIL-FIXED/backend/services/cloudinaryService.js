/**
 * services/cloudinaryService.js
 * Streams uploaded file buffers (multer memoryStorage — nothing ever
 * touches local disk) straight to Cloudinary, and deletes them again
 * when a document is removed.
 */
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');

/**
 * Upload a file buffer to Cloudinary under documentai/documents/{userId}/.
 * Uses resource_type "raw" so arbitrary document types (pdf/docx/txt/csv)
 * are stored byte-for-byte and can be downloaded intact.
 */
function uploadBuffer(buffer, { userId, filename }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: `documentai/documents/${userId}`,
        public_id: filename.replace(/\.[^/.]+$/, ''),
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

function deleteFile(publicId, resourceType = 'raw') {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = { uploadBuffer, deleteFile };
