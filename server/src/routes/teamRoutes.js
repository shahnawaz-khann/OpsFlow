import { Router } from 'express';
import { listTeams, listTeamMembers } from '../controllers/teamController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

router.get('/', listTeams);
router.get('/:id/members', listTeamMembers);

export default router;
