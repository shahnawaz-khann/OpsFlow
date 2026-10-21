import { prisma } from '../config/prisma.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  InvalidTransitionError,
} from '../middleware/errorHandler.js';
import {
  canViewTeam,
  canCreateInTeam,
  canEditWorkItem,
  canClaimWorkItem,
  canAssignWorkItem,
  canDecideApproval,
  getUserTeamIds,
  getUserTeamRole,
  ROLES,
} from './permissionService.js';
import { validateStatusTransition, STATUSES } from './workflowService.js';

export class WorkItemService {
  /**
   * List work items accessible to the user with search, filter, and pagination.
   */
  async listWorkItems(query, user) {
    const permittedTeamIds = getUserTeamIds(user);
    if (!permittedTeamIds.length) {
      return {
        data: [],
        pagination: { page: 1, limit: query.limit, total: 0, totalPages: 0 },
      };
    }

    // Restrict teamId to user's permitted teams
    let targetTeamIds = permittedTeamIds;
    if (query.teamId) {
      if (!permittedTeamIds.includes(query.teamId)) {
        throw new ForbiddenError('You do not have permission to view work items for this team');
      }
      targetTeamIds = [query.teamId];
    }

    const where = {
      teamId: { in: targetTeamIds },
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.assigneeId) {
      if (query.assigneeId === 'unassigned') {
        where.assigneeId = null;
      } else {
        where.assigneeId = query.assigneeId;
      }
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { reference: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.workItem.count({ where }),
      prisma.workItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
        include: {
          team: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          approvals: {
            where: { status: 'PENDING' },
            select: { id: true, status: true },
          },
        },
      }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single work item by ID with access control.
   */
  async getWorkItemById(id, user) {
    const item = await prisma.workItem.findUnique({
      where: { id },
      include: {
        team: true,
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvals: {
          include: {
            requestedBy: { select: { id: true, name: true, email: true } },
            decidedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!item) {
      throw new NotFoundError('Work item not found');
    }

    if (!canViewTeam(user, item.teamId)) {
      throw new ForbiddenError('You do not have access to this team’s work items');
    }

    const userRole = getUserTeamRole(user, item.teamId);

    // Compute user capabilities for UI convenience
    const permissions = {
      role: userRole,
      canEdit: canEditWorkItem(user, item.teamId),
      canClaim: canClaimWorkItem(user, item.teamId) && !item.assigneeId && item.status !== 'RESOLVED',
      canAssign: canAssignWorkItem(user, item.teamId),
      canApprove: canDecideApproval(user, item.teamId) && item.approvals.some((a) => a.status === 'PENDING'),
      canReopen: (userRole === ROLES.ADMIN || userRole === ROLES.LEAD) && item.status === 'RESOLVED',
    };

    return { ...item, permissions };
  }

  /**
   * Create a new work item and record CREATED activity inside a transaction.
   */
  async createWorkItem(data, user) {
    if (!canCreateInTeam(user, data.teamId)) {
      throw new ForbiddenError('You do not have permission to create work items in this team');
    }

    // If assignee provided, verify assignee belongs to the team
    if (data.assigneeId) {
      const membership = await prisma.teamMembership.findUnique({
        where: {
          userId_teamId: {
            userId: data.assigneeId,
            teamId: data.teamId,
          },
        },
      });
      if (!membership) {
        throw new ValidationError('Assignee must be a member of the selected team');
      }
    }

    return await prisma.$transaction(async (tx) => {
      // Safely generate sequential reference using database sequence
      const seqResult = await tx.$queryRaw`SELECT nextval(pg_get_serial_sequence('"WorkItem"', 'referenceNumber')) as next_ref;`;
      const refNum = Number(seqResult[0].next_ref);
      const reference = `OPS-${refNum}`;

      const item = await tx.workItem.create({
        data: {
          referenceNumber: refNum,
          reference,
          title: data.title,
          description: data.description,
          priority: data.priority || 'MEDIUM',
          status: 'OPEN',
          teamId: data.teamId,
          assigneeId: data.assigneeId || null,
          createdById: user.id,
          requiresApproval: !!data.requiresApproval,
          version: 1,
        },
        include: {
          team: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      // Record CREATED activity in same transaction
      await tx.activity.create({
        data: {
          workItemId: item.id,
          actorId: user.id,
          action: 'CREATED',
          note: `Work item ${reference} created by ${user.name}`,
        },
      });

      // If approval requested at creation, create pending approval record
      if (item.requiresApproval) {
        await tx.approval.create({
          data: {
            workItemId: item.id,
            requestedById: user.id,
            status: 'PENDING',
          },
        });
      }

      return item;
    });
  }

  /**
   * Atomic claim of an unassigned work item.
   */
  async claimWorkItem(id, user) {
    // 1. Fetch item to verify existence and team access
    const existing = await prisma.workItem.findUnique({
      where: { id },
      include: { team: true },
    });

    if (!existing) {
      throw new NotFoundError('Work item not found');
    }

    if (!canClaimWorkItem(user, existing.teamId)) {
      throw new ForbiddenError('You do not have permission to claim items in this team');
    }

    // Idempotency: if already claimed by this user, return current state safely
    if (existing.assigneeId === user.id) {
      return existing;
    }

    if (existing.status === 'RESOLVED') {
      throw new ConflictError('Cannot claim an item that is already resolved.');
    }

    if (existing.assigneeId !== null) {
      throw new ConflictError('This item has already been assigned to another team member.');
    }

    // 2. Atomic conditional update inside transaction
    return await prisma.$transaction(async (tx) => {
      const rowsUpdated = await tx.$executeRaw`
        UPDATE "WorkItem"
        SET "assigneeId" = ${user.id},
            "version" = "version" + 1,
            "updatedAt" = NOW()
        WHERE "id" = ${id}
          AND "assigneeId" IS NULL
          AND "status" <> 'RESOLVED'::"Status";
      `;

      if (rowsUpdated === 0) {
        throw new ConflictError(
          'Failed to claim item. It may have been claimed by another user or resolved concurrently.'
        );
      }

      // Record CLAIMED activity
      await tx.activity.create({
        data: {
          workItemId: id,
          actorId: user.id,
          action: 'CLAIMED',
          note: `Self-claimed by ${user.name}`,
        },
      });

      return await tx.workItem.findUnique({
        where: { id },
        include: {
          team: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      });
    });
  }

  /**
   * Assign or reassign a work item (Lead/Admin only).
   */
  async assignWorkItem(id, data, user) {
    const existing = await prisma.workItem.findUnique({
      where: { id },
      include: { assignee: true },
    });

    if (!existing) {
      throw new NotFoundError('Work item not found');
    }

    if (!canAssignWorkItem(user, existing.teamId)) {
      throw new ForbiddenError('Only Team Leads and Admins can assign or reassign items');
    }

    let newAssignee = null;
    if (data.assigneeId) {
      // Validate assignee belongs to the team
      const membership = await prisma.teamMembership.findUnique({
        where: {
          userId_teamId: {
            userId: data.assigneeId,
            teamId: existing.teamId,
          },
        },
        include: { user: true },
      });

      if (!membership) {
        throw new ValidationError('Assignee must be a member of this team');
      }
      newAssignee = membership.user;
    }

    return await prisma.$transaction(async (tx) => {
      // If version provided, enforce optimistic concurrency
      const whereClause = { id };
      if (data.version) {
        whereClause.version = data.version;
      }

      const updateResult = await tx.workItem.updateMany({
        where: whereClause,
        data: {
          assigneeId: data.assigneeId || null,
          version: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictError('This item was updated by someone else. Please refresh before reassigning.');
      }

      const oldAssigneeName = existing.assignee?.name || 'Unassigned';
      const newAssigneeName = newAssignee?.name || 'Unassigned';

      await tx.activity.create({
        data: {
          workItemId: id,
          actorId: user.id,
          action: 'ASSIGNED',
          field: 'assigneeId',
          oldValue: oldAssigneeName,
          newValue: newAssigneeName,
          note: data.note || `Assigned to ${newAssigneeName} by ${user.name}`,
        },
      });

      return await tx.workItem.findUnique({
        where: { id },
        include: {
          team: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      });
    });
  }

  /**
   * Update editable fields on a work item with optimistic concurrency (version check).
   */
  async updateWorkItem(id, data, user, options = {}) {
    const existing = await prisma.workItem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Work item not found');
    }

    if (!canEditWorkItem(user, existing.teamId)) {
      throw new ForbiddenError('You do not have permission to edit this work item');
    }

    const { version, ...fields } = data;

    return await prisma.$transaction(async (tx) => {
      // Optimistic concurrency check
      const updateResult = await tx.workItem.updateMany({
        where: {
          id,
          version,
        },
        data: {
          ...fields,
          version: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictError(
          'This item was updated by someone else. Refresh it to see the latest version before saving again.'
        );
      }

      // Controlled test strategy for transactional rollback testing
      if (options.simulateFailure) {
        throw new Error('Simulated transaction failure after work item update');
      }

      // Record activity for modifications
      if (fields.priority && fields.priority !== existing.priority) {
        await tx.activity.create({
          data: {
            workItemId: id,
            actorId: user.id,
            action: 'PRIORITY_CHANGED',
            field: 'priority',
            oldValue: existing.priority,
            newValue: fields.priority,
            note: `Priority changed from ${existing.priority} to ${fields.priority}`,
          },
        });
      }

      if (
        (fields.title && fields.title !== existing.title) ||
        (fields.description && fields.description !== existing.description)
      ) {
        await tx.activity.create({
          data: {
            workItemId: id,
            actorId: user.id,
            action: 'UPDATED',
            note: `Work item content updated by ${user.name}`,
          },
        });
      }

      return await tx.workItem.findUnique({
        where: { id },
        include: {
          team: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      });
    });
  }

  /**
   * Transition work item status with workflow validation and optimistic concurrency.
   */
  async transitionWorkItem(id, data, user) {
    const existing = await prisma.workItem.findUnique({
      where: { id },
      include: {
        approvals: true,
      },
    });

    if (!existing) {
      throw new NotFoundError('Work item not found');
    }

    const hasApprovedDecision = existing.approvals.some((a) => a.status === 'APPROVED');

    // Validate workflow rules and role authorization
    validateStatusTransition({
      fromStatus: existing.status,
      toStatus: data.status,
      user,
      teamId: existing.teamId,
      requiresApproval: existing.requiresApproval,
      hasApprovedDecision,
    });

    return await prisma.$transaction(async (tx) => {
      const updateData = {
        status: data.status,
        version: { increment: 1 },
      };

      if (data.status === STATUSES.RESOLVED) {
        updateData.resolvedAt = new Date();
      } else if (existing.status === STATUSES.RESOLVED) {
        // Reopening cleared resolvedAt
        updateData.resolvedAt = null;
      }

      const updateResult = await tx.workItem.updateMany({
        where: {
          id,
          version: data.version,
        },
        data: updateData,
      });

      if (updateResult.count === 0) {
        throw new ConflictError(
          'This item was updated by someone else. Refresh it to see the latest version before saving again.'
        );
      }

      const isReopening = existing.status === STATUSES.RESOLVED && data.status === STATUSES.OPEN;

      await tx.activity.create({
        data: {
          workItemId: id,
          actorId: user.id,
          action: isReopening ? 'REOPENED' : 'STATUS_CHANGED',
          field: 'status',
          oldValue: existing.status,
          newValue: data.status,
          note: data.note || (isReopening ? `Work item reopened by ${user.name}` : `Status changed to ${data.status}`),
        },
      });

      return await tx.workItem.findUnique({
        where: { id },
        include: {
          team: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      });
    });
  }

  /**
   * Decide on a pending approval (Lead/Admin only).
   */
  async decideApproval(id, data, user) {
    const item = await prisma.workItem.findUnique({
      where: { id },
      include: {
        approvals: {
          where: { status: 'PENDING' },
        },
      },
    });

    if (!item) {
      throw new NotFoundError('Work item not found');
    }

    if (!canDecideApproval(user, item.teamId)) {
      throw new ForbiddenError('Only Team Leads and Admins can decide approvals');
    }

    const pendingApproval = item.approvals[0];
    if (!pendingApproval) {
      throw new ConflictError('No pending approval request found for this work item');
    }

    return await prisma.$transaction(async (tx) => {
      await tx.approval.update({
        where: { id: pendingApproval.id },
        data: {
          status: data.decision,
          decidedById: user.id,
          decisionNote: data.note || null,
          decidedAt: new Date(),
        },
      });

      // Increment item version
      await tx.workItem.update({
        where: { id },
        data: { version: { increment: 1 } },
      });

      await tx.activity.create({
        data: {
          workItemId: id,
          actorId: user.id,
          action: 'APPROVAL_DECIDED',
          oldValue: 'PENDING',
          newValue: data.decision,
          note: data.note || `Approval request ${data.decision.toLowerCase()} by ${user.name}`,
        },
      });

      return await tx.workItem.findUnique({
        where: { id },
        include: {
          approvals: {
            include: {
              requestedBy: { select: { id: true, name: true } },
              decidedBy: { select: { id: true, name: true } },
            },
          },
        },
      });
    });
  }

  /**
   * Get paginated activity timeline for a work item.
   */
  async getActivityTimeline(id, query, user) {
    const item = await prisma.workItem.findUnique({
      where: { id },
      select: { teamId: true },
    });

    if (!item) {
      throw new NotFoundError('Work item not found');
    }

    if (!canViewTeam(user, item.teamId)) {
      throw new ForbiddenError('You do not have access to view this item’s activity');
    }

    const page = parseInt(query.page || '1', 10) || 1;
    const limit = Math.min(parseInt(query.limit || '20', 10) || 20, 100);
    const skip = (page - 1) * limit;

    const [total, activities] = await Promise.all([
      prisma.activity.count({ where: { workItemId: id } }),
      prisma.activity.findMany({
        where: { workItemId: id },
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return {
      data: activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Add operational note or collaborative comment to a work item.
   */
  async addComment(id, commentText, user) {
    const item = await prisma.workItem.findUnique({
      where: { id },
      select: { id: true, teamId: true },
    });

    if (!item) {
      throw new NotFoundError('Work item not found');
    }

    if (!canViewTeam(user, item.teamId)) {
      throw new ForbiddenError('You do not have permission to post comments on this team’s items');
    }

    const activity = await prisma.activity.create({
      data: {
        workItemId: id,
        actorId: user.id,
        action: 'UPDATED',
        field: 'comment',
        note: commentText.trim(),
      },
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
    });

    return activity;
  }

  /**
   * Delete or cancel work item (Team Leads or Admins only).
   */
  async deleteWorkItem(id, user) {
    const item = await prisma.workItem.findUnique({
      where: { id },
      select: { id: true, teamId: true, reference: true },
    });

    if (!item) {
      throw new NotFoundError('Work item not found');
    }

    const role = getUserTeamRole(user, item.teamId);
    if (role !== ROLES.ADMIN && role !== ROLES.LEAD) {
      throw new ForbiddenError('Only Team Leads or Admins can cancel or delete a work item');
    }

    await prisma.workItem.delete({
      where: { id },
    });

    return { reference: item.reference };
  }
}

export const workItemService = new WorkItemService();

