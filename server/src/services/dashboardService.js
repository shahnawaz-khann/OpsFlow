import { prisma } from '../config/prisma.js';
import { getUserTeamIds } from './permissionService.js';

export class DashboardService {
  /**
   * Calculate dashboard summary figures from real database records.
   * All figures strictly scoped to teams the user is permitted to see.
   */
  async getSummary(user) {
    const permittedTeamIds = getUserTeamIds(user);

    if (!permittedTeamIds.length) {
      return {
        metrics: {
          openWork: 0,
          assignedToMe: 0,
          highPriority: 0,
          pendingApprovals: 0,
        },
        needsAttention: [],
        recentlyUpdated: [],
      };
    }

    const teamFilter = { teamId: { in: permittedTeamIds } };
    const unresolvedFilter = {
      ...teamFilter,
      status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] },
    };

    const [openWork, assignedToMe, highPriority, pendingApprovals, needsAttention, recentlyUpdated] =
      await Promise.all([
        // 1. Open work in permitted teams
        prisma.workItem.count({
          where: unresolvedFilter,
        }),

        // 2. Unresolved work assigned to current user
        prisma.workItem.count({
          where: {
            ...unresolvedFilter,
            assigneeId: user.id,
          },
        }),

        // 3. Urgent / High priority unresolved work
        prisma.workItem.count({
          where: {
            ...unresolvedFilter,
            priority: { in: ['HIGH', 'URGENT'] },
          },
        }),

        // 4. Pending approvals in user's teams
        prisma.approval.count({
          where: {
            status: 'PENDING',
            workItem: { teamId: { in: permittedTeamIds } },
          },
        }),

        // 5. Items needing immediate attention (Urgent/High unresolved items)
        prisma.workItem.findMany({
          where: {
            ...unresolvedFilter,
            priority: { in: ['HIGH', 'URGENT'] },
          },
          take: 5,
          orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
          include: {
            team: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
          },
        }),

        // 6. Recently updated items across permitted teams
        prisma.workItem.findMany({
          where: teamFilter,
          take: 5,
          orderBy: { updatedAt: 'desc' },
          include: {
            team: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
          },
        }),
      ]);

    return {
      metrics: {
        openWork,
        assignedToMe,
        highPriority,
        pendingApprovals,
      },
      needsAttention,
      recentlyUpdated,
    };
  }
}

export const dashboardService = new DashboardService();
