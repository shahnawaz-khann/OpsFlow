import dotenv from 'dotenv';
dotenv.config();

// Ensure test database is targeted
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:shahnawaz@localhost:5432/opsflow_test?schema=public';

import { prisma } from '../src/config/prisma.js';
import { signToken } from '../src/middleware/requireAuth.js';
import bcrypt from 'bcryptjs';

export { prisma, signToken };

export async function clearDatabase() {
  await prisma.activity.deleteMany({});
  await prisma.approval.deleteMany({});
  await prisma.workItem.deleteMany({});
  await prisma.teamMembership.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.user.deleteMany({});
}

export async function createTestUser(name, email, role = 'MEMBER', team = null) {
  const hashedPassword = await bcrypt.hash('password123', 8);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  if (team) {
    await prisma.teamMembership.create({
      data: {
        userId: user.id,
        teamId: team.id,
        role,
      },
    });
  }

  const token = signToken(user);
  return { user, token };
}

export async function createTestTeam(name) {
  return await prisma.team.create({
    data: {
      name,
      description: `Test Team ${name}`,
    },
  });
}
