/**
 * config/cloudinary.js
 * Cloudinary SDK configuration — used by services/cloudinaryService.js
 * to store and delete uploaded documents. Files are streamed straight
 * from memory (multer memoryStorage) to Cloudinary; nothing is ever
 * written to local disk, so uploads survive restarts/redeploys.
 */
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

module.exports = cloudinary;
