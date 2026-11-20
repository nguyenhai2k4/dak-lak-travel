import { Router } from 'express';
import { attachOptionalAuth } from '../services/core/auth.ts';
import { isServiceError } from '../services/core/errors.ts';
import { getPublicPostBySlug, listPublicPosts } from '../services/cms/postsService.ts';
import { Language } from '../../src/types/index.ts';

export const publicPostsRouter = Router();

publicPostsRouter.get('/', (req, res) => {
  const lang: Language = req.query.lang === 'en' ? 'en' : 'vi';
  const section = typeof req.query.section === 'string' ? req.query.section : undefined;
  res.json({
    posts: listPublicPosts(lang, section),
  });
});

publicPostsRouter.get('/:slug', attachOptionalAuth, (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim();
    const lang: Language = req.query.lang === 'en' ? 'en' : 'vi';
    const isPreview = req.query.preview === '1';
    const result = getPublicPostBySlug(slug, lang, isPreview, req.authUser);
    res.json(result);
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});
