const sharp = require('sharp');
const { Upload } = require('@aws-sdk/lib-storage');
const s3Client = require('../config/s3');
const env = require('../config/env');

async function optimizeImage(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

async function uploadImage(buffer, filename) {
  const optimizedBuffer = await optimizeImage(buffer);
  const key = `${Date.now()}-${filename || 'image.jpg'}`;

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: env.aws.s3Bucket,
      Key: key,
      Body: optimizedBuffer,
      ContentType: 'image/jpeg'
    }
  });

  const result = await upload.done();

  // Return object that mimics Cloudinary response structure to minimize controller changes
  return {
    secure_url: result.Location,
    public_id: key
  };
}

module.exports = {
  uploadImage
};
