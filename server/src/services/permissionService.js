export const ROLES = {
  ADMIN: 'ADMIN',
  LEAD: 'LEAD',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
};

/**
 * Get user's role for a specific team.
 * If user has no membership in the team, returns null.
 */
export function getUserTeamRole(user, teamId) {
  if (!user || !user.memberships) return null;
  const membership = user.memberships.find((m) => m.teamId === teamId);
  return membership ? membership.role : null;
}

/**
 * Get all team IDs the user is a member of.
 */
export function getUserTeamIds(user) {
  if (!user || !user.memberships) return [];
  return user.memberships.map((m) => m.teamId);
}

/**
 * Check if user can view items belonging to teamId.
 */
export function canViewTeam(user, teamId) {
  const role = getUserTeamRole(user, teamId);
  return role !== null;
}

/**
 * Check if user can create work items in teamId.
 * Viewer CANNOT create. Member, Lead, Admin CAN.
 */
export function canCreateInTeam(user, teamId) {
  const role = getUserTeamRole(user, teamId);
  return role === ROLES.ADMIN || role === ROLES.LEAD || role === ROLES.MEMBER;
}

/**
 * Check if user can edit fields on a work item.
 * Viewer CANNOT edit.
 */
export function canEditWorkItem(user, teamId) {
  const role = getUserTeamRole(user, teamId);
  return role === ROLES.ADMIN || role === ROLES.LEAD || role === ROLES.MEMBER;
}

/**
 * Check if user can claim unassigned item.
 * Must be Member, Lead, or Admin in the team.
 */
export function canClaimWorkItem(user, teamId) {
  const role = getUserTeamRole(user, teamId);
  return role === ROLES.ADMIN || role === ROLES.LEAD || role === ROLES.MEMBER;
}

/**
 * Check if user can assign / reassign an item.
 * Requires Lead or Admin role in the team.
 */
export function canAssignWorkItem(user, teamId) {
  const role = getUserTeamRole(user, teamId);
  return role === ROLES.ADMIN || role === ROLES.LEAD;
}

/**
 * Check if user can transition status.
 * Reopening (RESOLVED -> OPEN) requires Lead or Admin.
 * Moving to RESOLVED requires non-viewer and satisfied approval (if applicable).
 */
export function canTransitionWorkItem(user, teamId, fromStatus, toStatus) {
  const role = getUserTeamRole(user, teamId);
  if (!role || role === ROLES.VIEWER) {
    return false;
  }

  // Reopening a resolved item requires Team Lead or Admin
  if (fromStatus === 'RESOLVED' && toStatus === 'OPEN') {
    return role === ROLES.ADMIN || role === ROLES.LEAD;
  }

  return true;
}

/**
 * Check if user can decide (approve/reject) approval for a team.
 * Only Lead or Admin for the team can decide.
 */
export function canDecideApproval(user, teamId) {
  const role = getUserTeamRole(user, teamId);
  return role === ROLES.ADMIN || role === ROLES.LEAD;
}
