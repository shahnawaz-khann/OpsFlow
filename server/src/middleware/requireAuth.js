import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { UnauthenticatedError } from './errorHandler.js';

export function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new UnauthenticatedError('Missing or malformed Authorization header'));
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      return next(new UnauthenticatedError('Invalid or expired authentication token'));
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        memberships: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!user) {
      return next(new UnauthenticatedError('User no longer exists'));
    }

    // Attach verified user and team memberships to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      memberships: user.memberships.map((m) => ({
        teamId: m.teamId,
        teamName: m.team.name,
        role: m.role,
      })),
    };

    next();
  } catch (err) {
    next(err);
  }
}
