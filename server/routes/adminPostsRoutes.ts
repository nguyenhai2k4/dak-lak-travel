import { Request, Response, Router } from 'express';
import { requireAdmin, requireAuth } from '../services/auth.ts';
import { isServiceError } from '../services/errors.ts';
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
} from '../services/postsService.ts';

export const adminPostsRouter = Router();
adminPostsRouter.use(requireAuth);

function handleRouteError(res: Response, err: unknown): void {
  if (isServiceError(err)) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  throw err;
}

adminPostsRouter.get('/context', (req: Request, res: Response) => {
  try {
    const section = typeof req.query.section === 'string' ? req.query.section : undefined;
    res.json(getCmsStatsAndContext(section));
  } catch (err) {
    handleRouteError(res, err);
  }
});

adminPostsRouter.get('/', (req: Request, res: Response) => {
  try {
    const posts = listAdminPosts(req.authUser!, {
      section: typeof req.query.section === 'string' ? req.query.section : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      slug: typeof req.query.slug === 'string' ? req.query.slug : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
    });
    res.json({ posts });
  } catch (err) {
    handleRouteError(res, err);
  }
});

adminPostsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const post = getAdminPostByIdOrSlug(req.authUser!, String(req.params.id));
    res.json({ post });
  } catch (err) {
    handleRouteError(res, err);
  }
});

adminPostsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const post = await createAdminPost(req.authUser!, (req.body || {}) as Record<string, unknown>);
    res.status(201).json({ post });
  } catch (err) {
    handleRouteError(res, err);
  }
});

adminPostsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const post = await updateAdminPost(
      req.authUser!,
      Number(req.params.id),
      (req.body || {}) as Record<string, unknown>
    );
    res.json({ post });
  } catch (err) {
    handleRouteError(res, err);
  }
});

adminPostsRouter.post('/:id/submit', (req: Request, res: Response) => {
  try {
    const post = submitAdminPost(req.authUser!, Number(req.params.id));
    res.json({ post });
  } catch (err) {
    handleRouteError(res, err);
  }
});

adminPostsRouter.post('/:id/review', requireAdmin, async (req: Request, res: Response) => {
  try {
    const post = await reviewAdminPost(
      req.authUser!,
      Number(req.params.id),
      String(req.body?.action || ''),
      String(req.body?.reviewNote || '')
    );
    res.json({ post });
  } catch (err) {
    handleRouteError(res, err);
  }
});

adminPostsRouter.post('/:id/retranslate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const post = await retranslateAdminPost(req.authUser!, Number(req.params.id));
    res.json({ post });
  } catch (err) {
    handleRouteError(res, err);
  }
});

adminPostsRouter.post('/:id/translation', async (req: Request, res: Response) => {
  try {
    const post = await saveCustomTranslation(
      req.authUser!,
      Number(req.params.id),
      (req.body || {}) as Record<string, unknown>
    );
    res.json({ post });
  } catch (err) {
    handleRouteError(res, err);
  }
});

adminPostsRouter.patch('/reorder', requireAdmin, (req: Request, res: Response) => {
  try {
    reorderAdminPosts(req.authUser!, req.body?.section, req.body?.orderedIds);
    res.json({ ok: true });
  } catch (err) {
    handleRouteError(res, err);
  }
});

adminPostsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    deleteAdminPost(req.authUser!, Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    handleRouteError(res, err);
  }
});
