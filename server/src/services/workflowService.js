import { InvalidTransitionError, ForbiddenError } from '../middleware/errorHandler.js';
import { canTransitionWorkItem } from './permissionService.js';

export const STATUSES = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  RESOLVED: 'RESOLVED',
};

export const ALLOWED_TRANSITIONS = {
  [STATUSES.OPEN]: [STATUSES.IN_PROGRESS, STATUSES.RESOLVED],
  [STATUSES.IN_PROGRESS]: [STATUSES.BLOCKED, STATUSES.RESOLVED],
  [STATUSES.BLOCKED]: [STATUSES.IN_PROGRESS],
  [STATUSES.RESOLVED]: [STATUSES.OPEN],
};

/**
 * Validates whether a status transition is permitted by workflow rules and user roles.
 */
export function validateStatusTransition({
  fromStatus,
  toStatus,
  user,
  teamId,
  requiresApproval = false,
  hasApprovedDecision = false,
}) {
  if (fromStatus === toStatus) {
    throw new InvalidTransitionError(`Work item is already in ${toStatus} status`);
  }

  const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw new InvalidTransitionError(
      `Cannot transition from ${fromStatus} to ${toStatus}. Allowed transitions: ${allowed.join(', ') || 'none'}`
    );
  }

  // Check role authorization for this specific transition (e.g., RESOLVED -> OPEN requires Lead/Admin)
  if (!canTransitionWorkItem(user, teamId, fromStatus, toStatus)) {
    throw new ForbiddenError(
      `Role does not have permission to transition item from ${fromStatus} to ${toStatus}`
    );
  }

  // Enforce approval requirement before resolving
  if (toStatus === STATUSES.RESOLVED && requiresApproval && !hasApprovedDecision) {
    throw new InvalidTransitionError(
      'Work item requires an approved decision before it can be resolved'
    );
  }

  return true;
}
