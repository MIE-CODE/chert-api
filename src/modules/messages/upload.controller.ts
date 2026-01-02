import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { AppError } from '../../utils/errors';
import { uploadSingle } from '../../utils/upload';
import path from 'path';

export const uploadFile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  uploadSingle(req, res, (err) => {
    if (err) {
      return next(err);
    }

    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    // Determine file type
    const imageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const fileType = imageMimes.includes(req.file.mimetype) ? 'image' : 'file';

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileUrl: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType,
        mimeType: req.file.mimetype,
      },
    });
  });
};

