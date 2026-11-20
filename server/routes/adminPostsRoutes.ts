import { type NextFunction, type Request, type Response, Router } from 'express';
import { requireAdmin, requireAuth } from '../services/core/auth.ts';
import { isServiceError } from '../services/core/errors.ts';
import {
  createAdminPost,
  deleteAdminPost,
  getAdminPostByIdOrSlug,
  getCmsStatsAndContext,
  listAdminPosts,
  reorderAdminPosts,
  retranslateAdminPost,
  reviewAdminPost,
  saveCustomTranslation,
  submitAdminPost,
  updateAdminPost,
} from '../services/cms/postsService.ts';

export const adminPostsRouter = Router();
adminPostsRouter.use(requireAuth);

function handleRouteError(res: Response, next: NextFunction, err: unknown): void {
  if (isServiceError(err)) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  next(err);
}

adminPostsRouter.get('/context', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const section = typeof req.query.section === 'string' ? req.query.section : undefined;
    res.json(await getCmsStatsAndContext(section));
  } catch (err) {
    handleRouteError(res, next, err);
  }
});

adminPostsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const posts = await listAdminPosts(req.authUser!, {
      section: typeof req.query.section === 'string' ? req.query.section : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      slug: typeof req.query.slug === 'string' ? req.query.slug : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
    });
    res.json({ posts });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});

adminPostsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await getAdminPostByIdOrSlug(req.authUser!, String(req.params.id));
    res.json({ post });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});

adminPostsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await createAdminPost(req.authUser!, (req.body || {}) as Record<string, unknown>);
    res.status(201).json({ post });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});

adminPostsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await updateAdminPost(
      req.authUser!,
      Number(req.params.id),
      (req.body || {}) as Record<string, unknown>
    );
    res.json({ post });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});

adminPostsRouter.post('/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await submitAdminPost(req.authUser!, Number(req.params.id));
    res.json({ post });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});

adminPostsRouter.post(
  '/:id/review',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const post = await reviewAdminPost(
        req.authUser!,
        Number(req.params.id),
        String(req.body?.action || ''),
        String(req.body?.reviewNote || '')
      );
      res.json({ post });
    } catch (err) {
      handleRouteError(res, next, err);
    }
  }
);

adminPostsRouter.post(
  '/:id/retranslate',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const post = await retranslateAdminPost(req.authUser!, Number(req.params.id));
      res.json({ post });
    } catch (err) {
      handleRouteError(res, next, err);
    }
  }
);

adminPostsRouter.post(
  '/:id/translation',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const post = await saveCustomTranslation(
        req.authUser!,
        Number(req.params.id),
        (req.body || {}) as Record<string, unknown>
      );
      res.json({ post });
    } catch (err) {
      handleRouteError(res, next, err);
    }
  }
);

adminPostsRouter.patch(
  '/reorder',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await reorderAdminPosts(req.authUser!, req.body?.section, req.body?.orderedIds);
      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, next, err);
    }
  }
);

adminPostsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteAdminPost(req.authUser!, Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});
