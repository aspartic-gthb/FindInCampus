import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const hasCloudinary =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

const storage = hasCloudinary
  ? new CloudinaryStorage({
      cloudinary,
      params: async () => ({
        folder: 'findincampus',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      }),
    })
  : multer.memoryStorage();

export const upload = multer({ storage });
export { cloudinary, hasCloudinary };
