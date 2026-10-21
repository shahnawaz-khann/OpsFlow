import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { signToken } from '../middleware/requireAuth.js';
import { UnauthenticatedError, NotFoundError } from '../middleware/errorHandler.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { team: true },
        },
      },
    });

    if (!user) {
      throw new UnauthenticatedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthenticatedError('Invalid email or password');
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        memberships: user.memberships.map((m) => ({
          teamId: m.teamId,
          teamName: m.team.name,
          role: m.role,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Dev quick login: Switch seamlessly between seeded personas (Admin, Lead, Member, Viewer).
 */
export async function devLogin(req, res, next) {
  try {
    const { userId } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { team: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('Demo user not found');
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        memberships: user.memberships.map((m) => ({
          teamId: m.teamId,
          teamName: m.team.name,
          role: m.role,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res) {
  return res.json({ user: req.user });
}

export async function listDemoUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      include: {
        memberships: {
          include: { team: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const sanitized = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      memberships: u.memberships.map((m) => ({
        teamId: m.teamId,
        teamName: m.team.name,
        role: m.role,
      })),
    }));

    return res.json({ users: sanitized });
  } catch (err) {
    next(err);
  }
}

export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ users });
  } catch (err) {
    next(err);
  }
}


