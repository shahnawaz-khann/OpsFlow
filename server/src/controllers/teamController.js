import { prisma } from '../config/prisma.js';
import { ForbiddenError, NotFoundError } from '../middleware/errorHandler.js';
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
