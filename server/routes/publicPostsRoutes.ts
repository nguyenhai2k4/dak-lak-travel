import { Router } from 'express';
import { attachOptionalAuth } from '../services/core/auth.ts';
import { isServiceError } from '../services/core/errors.ts';
import { getPublicPostBySlug, listPublicPosts } from '../services/cms/postsService.ts';
import { type Language } from '../../src/types/index.ts';

export const publicPostsRouter = Router();

publicPostsRouter.get('/', async (req, res, next) => {
  try {
    const lang: Language = req.query.lang === 'en' ? 'en' : 'vi';
    const section = typeof req.query.section === 'string' ? req.query.section : undefined;
    res.json({
      posts: await listPublicPosts(lang, section),
    });
  } catch (err) {
    next(err);
  }
});

publicPostsRouter.get('/:slug', attachOptionalAuth, async (req, res, next) => {
  try {
    const slug = String(req.params.slug || '').trim();
    const lang: Language = req.query.lang === 'en' ? 'en' : 'vi';
    const isPreview = req.query.preview === '1';
    const result = await getPublicPostBySlug(slug, lang, isPreview, req.authUser);
    res.json(result);
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  }
});
