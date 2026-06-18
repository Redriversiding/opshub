const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;

// Upload a file buffer to R2
async function uploadFile(buffer, originalName, mimeType, folder = 'documents') {
  const ext = path.extname(originalName);
  const key = `${folder}/${uuidv4()}${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ContentDisposition: `inline; filename="${originalName}"`,
  }));

  return { key, name: originalName };
}

// Generate a signed URL for viewing a file (valid 1 hour)
async function getFileUrl(key) {
  if (!key) return null;
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

// Delete a file from R2
async function deleteFile(key) {
  if (!key) return;
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

module.exports = { uploadFile, getFileUrl, deleteFile };
