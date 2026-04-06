const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 1. Log in to your Cloudinary account using your .env keys
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Set up the "Storage Box" (where the files go and what they are named)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'omnipos_products', // This creates a neat folder in your Cloudinary account
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

// 3. Create the actual uploader middleware
const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };