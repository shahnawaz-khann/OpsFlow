import { Router } from 'express';
import {
  listTeams,
  listTeamMembers,
  createTeam,
  updateTeam,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
} from '../controllers/teamController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validate.js';
import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
  updateTeamMemberSchema,
} from '../validators/workItemSchemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', listTeams);
router.post('/', validateBody(createTeamSchema), createTeam);
router.patch('/:id', validateBody(updateTeamSchema), updateTeam);
router.get('/:id/members', listTeamMembers);
router.post('/:id/members', validateBody(addTeamMemberSchema), addTeamMember);
router.patch('/:id/members/:userId', validateBody(updateTeamMemberSchema), updateTeamMemberRole);
router.delete('/:id/members/:userId', removeTeamMember);

export default router;

