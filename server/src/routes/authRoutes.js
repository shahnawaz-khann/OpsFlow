import { Router } from 'express';
import { login, devLogin, getMe, listDemoUsers } from '../controllers/authController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema, devLoginSchema } from '../validators/workItemSchemas.js';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.post('/dev-login', validateBody(devLoginSchema), devLogin);
router.get('/demo-users', listDemoUsers);
router.get('/me', requireAuth, getMe);

export default router;
