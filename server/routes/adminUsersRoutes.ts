import { Router } from 'express';
import { requireAdmin, requireAuth } from '../services/core/auth.ts';
import { isServiceError } from '../services/core/errors.ts';
import { createUser, listUsers, updateUser } from '../services/cms/usersService.ts';

export const adminUsersRouter = Router();
adminUsersRouter.use(requireAuth, requireAdmin);

adminUsersRouter.get('/', (req, res) => {
  try {
    res.json({ users: listUsers(req.authUser!) });
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

adminUsersRouter.post('/', (req, res) => {
  try {
    const user = createUser(req.authUser!, req.body || {});
    res.status(201).json({ user });
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

adminUsersRouter.patch('/:id', (req, res) => {
  try {
    const user = updateUser(req.authUser!, Number(req.params.id), req.body || {});
    res.json({ user });
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});
