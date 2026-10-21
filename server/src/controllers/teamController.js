import { prisma } from '../config/prisma.js';
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../middleware/errorHandler.js';
import { canViewTeam, getUserTeamRole } from '../services/permissionService.js';

export async function listTeams(req, res, next) {
  try {
    const teams = await prisma.team.findMany({
      where: {
        memberships: {
          some: {
            userId: req.user.id,
          },
        },
      },
      include: {
        _count: {
          select: {
            workItems: true,
            memberships: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const enriched = teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      myRole: getUserTeamRole(req.user, team.id),
      workItemsCount: team._count.workItems,
      membersCount: team._count.memberships,
    }));

    return res.json({ teams: enriched });
  } catch (err) {
    next(err);
  }
}

export async function listTeamMembers(req, res, next) {
  try {
    const { id } = req.params;

    if (!canViewTeam(req.user, id)) {
      throw new ForbiddenError('You do not have access to view members of this team');
    }

    const memberships = await prisma.teamMembership.findMany({
      where: { teamId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    const members = memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    }));

    return res.json({ members });
  } catch (err) {
    next(err);
  }
}

export async function createTeam(req, res, next) {
  try {
    const { name, description } = req.body;
    const trimmedName = name.trim();

    const existing = await prisma.team.findUnique({
      where: { name: trimmedName },
    });
    if (existing) {
      throw new ConflictError(`A team named "${trimmedName}" already exists`);
    }

    const newTeam = await prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: {
          name: trimmedName,
          description: description ? description.trim() : null,
        },
      });

      await tx.teamMembership.create({
        data: {
          userId: req.user.id,
          teamId: created.id,
          role: 'ADMIN',
        },
      });

      return created;
    });

    return res.status(201).json({
      team: {
        id: newTeam.id,
        name: newTeam.name,
        description: newTeam.description,
        myRole: 'ADMIN',
        workItemsCount: 0,
        membersCount: 1,
      },
      message: 'Team successfully created',
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTeam(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const role = getUserTeamRole(req.user, id);
    if (role !== 'ADMIN') {
      throw new ForbiddenError('Only Team Admins can update team details');
    }

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    if (name && name.trim() !== team.name) {
      const conflict = await prisma.team.findUnique({ where: { name: name.trim() } });
      if (conflict) {
        throw new ConflictError(`A team named "${name.trim()}" already exists`);
      }
    }

    const updated = await prisma.team.update({
      where: { id },
      data: {
        name: name ? name.trim() : team.name,
        description: description !== undefined ? (description ? description.trim() : null) : team.description,
      },
      include: {
        _count: {
          select: {
            workItems: true,
            memberships: true,
          },
        },
      },
    });

    return res.json({
      team: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        myRole: role,
        workItemsCount: updated._count.workItems,
        membersCount: updated._count.memberships,
      },
      message: 'Team updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function addTeamMember(req, res, next) {
  try {
    const { id: teamId } = req.params;
    const { userId, role } = req.body;

    const myRole = getUserTeamRole(req.user, teamId);
    if (myRole !== 'ADMIN' && myRole !== 'LEAD') {
      throw new ForbiddenError('Only Team Leads or Admins can add members');
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const userToAdd = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToAdd) {
      throw new NotFoundError('User not found');
    }

    const existing = await prisma.teamMembership.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });
    if (existing) {
      throw new ConflictError('User is already a member of this team');
    }

    const membership = await prisma.teamMembership.create({
      data: {
        teamId,
        userId,
        role: role || 'MEMBER',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      member: {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
      },
      message: `${membership.user.name} added to ${team.name}`,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTeamMemberRole(req, res, next) {
  try {
    const { id: teamId, userId } = req.params;
    const { role } = req.body;

    const myRole = getUserTeamRole(req.user, teamId);
    if (myRole !== 'ADMIN') {
      throw new ForbiddenError('Only Team Admins can modify member roles');
    }

    const membership = await prisma.teamMembership.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });
    if (!membership) {
      throw new NotFoundError('Membership not found');
    }

    if (membership.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await prisma.teamMembership.count({
        where: { teamId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new ValidationError('Cannot demote the last ADMIN of the team');
      }
    }

    const updated = await prisma.teamMembership.update({
      where: { id: membership.id },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.json({
      member: {
        id: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        role: updated.role,
      },
      message: `Role updated to ${role}`,
    });
  } catch (err) {
    next(err);
  }
}

export async function removeTeamMember(req, res, next) {
  try {
    const { id: teamId, userId } = req.params;

    const myRole = getUserTeamRole(req.user, teamId);
    if (myRole !== 'ADMIN') {
      throw new ForbiddenError('Only Team Admins can remove members');
    }

    const membership = await prisma.teamMembership.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });
    if (!membership) {
      throw new NotFoundError('Membership not found');
    }

    if (membership.role === 'ADMIN') {
      const adminCount = await prisma.teamMembership.count({
        where: { teamId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new ValidationError('Cannot remove the last ADMIN of the team');
      }
    }

    await prisma.teamMembership.delete({
      where: { id: membership.id },
    });

    return res.json({ message: 'Member successfully removed from team' });
  } catch (err) {
    next(err);
  }
}

