import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { UPLOADS_DIR } from '../config.ts';
import { requireAuth } from '../services/core/auth.ts';

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const allowedMimeToExt: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = allowedMimeToExt[file.mimetype] || '.jpg';
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (allowedMimeToExt[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ định dạng ảnh JPG, PNG, WebP hoặc GIF (tối đa 5MB).'));
    }
  },
});

export const uploadRouter = Router();

uploadRouter.post('/', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Upload thất bại.' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'Không có tệp ảnh nào được tải lên.' });
      return;
    }
    res.json({
      url: `/uploads/${path.basename(req.file.filename)}`,
      filename: req.file.filename,
    });
  });
});
