import multer from 'multer';
import fs from 'fs';
import { AppError } from './errors';

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10MB default

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = file.originalname.substring(file.originalname.lastIndexOf('.'));
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow images and common file types
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only images and documents are allowed.', 400));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
  },
  fileFilter,
});

export const uploadSingle: any = upload.single('file');
export const uploadMultiple: any = upload.array('files', 10);

