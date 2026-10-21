import { Router } from 'express';
import {
  listWorkItems,
  getWorkItem,
  createWorkItem,
  updateWorkItem,
  claimWorkItem,
  assignWorkItem,
  transitionWorkItem,
  decideApproval,
  getActivityTimeline,
  addComment,
  deleteWorkItem,
} from '../controllers/workItemController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createWorkItemSchema,
  updateWorkItemSchema,
  assignWorkItemSchema,
  transitionWorkItemSchema,
  approvalDecisionSchema,
  listWorkItemsQuerySchema,
  commentSchema,
} from '../validators/workItemSchemas.js';

const router = Router();

// All work item routes require authentication
router.use(requireAuth);

router.get('/', validateQuery(listWorkItemsQuerySchema), listWorkItems);
router.post('/', validateBody(createWorkItemSchema), createWorkItem);
router.get('/:id', getWorkItem);
router.patch('/:id', validateBody(updateWorkItemSchema), updateWorkItem);
router.delete('/:id', deleteWorkItem);
router.post('/:id/claim', claimWorkItem);
router.post('/:id/assign', validateBody(assignWorkItemSchema), assignWorkItem);
router.post('/:id/transition', validateBody(transitionWorkItemSchema), transitionWorkItem);
router.post('/:id/approval', validateBody(approvalDecisionSchema), decideApproval);
router.get('/:id/activity', getActivityTimeline);
router.post('/:id/comments', validateBody(commentSchema), addComment);

export default router;

