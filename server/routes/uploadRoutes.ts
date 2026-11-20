import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { SUPABASE_STORAGE_BUCKET, UPLOADS_DIR } from '../config.ts';
import { getSupabaseAdmin, isUsingSupabase } from '../db/supabaseClient.ts';
import { requireAuth } from '../services/core/auth.ts';

const allowedMimeToExt: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB (safe within Vercel 4.5MB body limit)
  fileFilter: (_req, file, cb) => {
    if (allowedMimeToExt[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ định dạng ảnh JPG, PNG, WebP hoặc GIF (tối đa 4MB).'));
    }
  },
});

export const uploadRouter = Router();

uploadRouter.post('/', requireAuth, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Upload thất bại.' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'Không có tệp ảnh nào được tải lên.' });
      return;
    }

    const ext = allowedMimeToExt[req.file.mimetype] || '.jpg';
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

    try {
      if (isUsingSupabase()) {
        const supabase = getSupabaseAdmin();
        const storagePath = `cms/${filename}`;
        const { error: uploadErr } = await supabase.storage
          .from(SUPABASE_STORAGE_BUCKET)
          .upload(storagePath, req.file.buffer, {
            contentType: req.file.mimetype,
            cacheControl: '31536000',
            upsert: false,
          });

        if (uploadErr) {
          res.status(500).json({ error: `Không thể tải ảnh lên Supabase Storage: ${uploadErr.message}` });
          return;
        }

        const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(storagePath);
        res.json({
          url: data.publicUrl,
          filename,
        });
        return;
      }

      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), req.file.buffer);
      res.json({
        url: `/uploads/${path.basename(filename)}`,
        filename,
      });
    } catch (uploadError) {
      res.status(500).json({
        error: uploadError instanceof Error ? uploadError.message : 'Upload ảnh thất bại.',
      });
    }
  });
});
