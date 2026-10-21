import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma, clearDatabase, createTestUser, createTestTeam } from './setup.js';

describe('Test A: Authorization and Cross-Team Isolation', () => {
  const app = createApp();

  beforeEach(async () => {
    await clearDatabase();
  });

  it('denies User A from reading or modifying work items belonging to Team B', async () => {
    // 1. Setup Team A and Team B
    const teamA = await createTestTeam('Team Alpha');
    const teamB = await createTestTeam('Team Beta');

    // User A belongs to Team A only
    const userA = await createTestUser('Alice A', 'alice.a@test.com', 'MEMBER', teamA);
    // User B belongs to Team B only
    const userB = await createTestUser('Bob B', 'bob.b@test.com', 'LEAD', teamB);

    // Create an item in Team B
    const seq = await prisma.$queryRaw`SELECT nextval(pg_get_serial_sequence('"WorkItem"', 'referenceNumber')) as next_ref;`;
    const refNum = Number(seq[0].next_ref);
    const itemB = await prisma.workItem.create({
      data: {
        referenceNumber: refNum,
        reference: `OPS-${refNum}`,
        title: 'Team B Secret Project',
        description: 'Classified operational details for Team B',
        priority: 'HIGH',
        status: 'OPEN',
        teamId: teamB.id,
        createdById: userB.user.id,
        version: 1,
      },
    });

    // 2. User A tries to read Team B item -> Must be 403 Forbidden
    const getRes = await request(app)
      .get(`/api/work-items/${itemB.id}`)
      .set('Authorization', `Bearer ${userA.token}`);

    expect(getRes.status).toBe(403);
    expect(getRes.body.error.code).toBe('FORBIDDEN');

    // 3. User A tries to edit Team B item -> Must be 403 Forbidden
    const patchRes = await request(app)
      .patch(`/api/work-items/${itemB.id}`)
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        title: 'Malicious title change by User A',
        version: 1,
      });

    expect(patchRes.status).toBe(403);
    expect(patchRes.body.error.code).toBe('FORBIDDEN');

    // 4. Verify the database state remains unchanged
    const unchanged = await prisma.workItem.findUnique({ where: { id: itemB.id } });
    expect(unchanged.title).toBe('Team B Secret Project');
    expect(unchanged.version).toBe(1);

    // 5. User A tries to list items with teamId filter for Team B -> 403 Forbidden
    const listRes = await request(app)
      .get(`/api/work-items?teamId=${teamB.id}`)
      .set('Authorization', `Bearer ${userA.token}`);

    expect(listRes.status).toBe(403);
  });

  it('enforces Viewer role: Viewer can view items but cannot create, claim, or edit', async () => {
    const team = await createTestTeam('Engineering Test');
    const viewer = await createTestUser('Vince Viewer', 'viewer@test.com', 'VIEWER', team);
    const lead = await createTestUser('Leo Lead', 'lead@test.com', 'LEAD', team);

    // Lead creates an item
    const seq = await prisma.$queryRaw`SELECT nextval(pg_get_serial_sequence('"WorkItem"', 'referenceNumber')) as next_ref;`;
    const refNum = Number(seq[0].next_ref);
    const item = await prisma.workItem.create({
      data: {
        referenceNumber: refNum,
        reference: `OPS-${refNum}`,
        title: 'Public Incident Report',
        description: 'Details of incident',
        priority: 'MEDIUM',
        status: 'OPEN',
        teamId: team.id,
        createdById: lead.user.id,
        version: 1,
      },
    });

    // Viewer CAN read the item
    const readRes = await request(app)
      .get(`/api/work-items/${item.id}`)
      .set('Authorization', `Bearer ${viewer.token}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data.id).toBe(item.id);

    // Viewer CANNOT create a new item
    const createRes = await request(app)
      .post('/api/work-items')
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({
        title: 'Viewer unauthorized creation',
        description: 'Should fail',
        teamId: team.id,
        priority: 'LOW',
      });
    expect(createRes.status).toBe(403);

    // Viewer CANNOT claim the item
    const claimRes = await request(app)
      .post(`/api/work-items/${item.id}/claim`)
      .set('Authorization', `Bearer ${viewer.token}`);
    expect(claimRes.status).toBe(403);

    // Viewer CANNOT edit the item
    const editRes = await request(app)
      .patch(`/api/work-items/${item.id}`)
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({
        title: 'Edited by viewer',
        version: 1,
      });
    expect(editRes.status).toBe(403);
  });
});
