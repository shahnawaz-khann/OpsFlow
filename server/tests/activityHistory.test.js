import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma, clearDatabase, createTestUser, createTestTeam } from './setup.js';

describe('Test D: Transactional Audit History Integrity', () => {
  const app = createApp();

  beforeEach(async () => {
    await clearDatabase();
  });

  it('guarantees that a successful update creates exactly one appropriate activity record atomically', async () => {
    const team = await createTestTeam('Security Team');
    const user = await createTestUser('Sec Lead', 'sec@test.com', 'LEAD', team);

    const seq = await prisma.$queryRaw`SELECT nextval(pg_get_serial_sequence('"WorkItem"', 'referenceNumber')) as next_ref;`;
    const refNum = Number(seq[0].next_ref);
    const item = await prisma.workItem.create({
      data: {
        referenceNumber: refNum,
        reference: `OPS-${refNum}`,
        title: 'Audit logging baseline check',
        description: 'Verify activity history',
        priority: 'MEDIUM',
        status: 'OPEN',
        teamId: team.id,
        createdById: user.user.id,
        version: 1,
      },
    });

    // Initial activity count: 0 (created directly above)
    const initialActivities = await prisma.activity.findMany({ where: { workItemId: item.id } });
    expect(initialActivities).toHaveLength(0);

    // Perform a status change
    const res = await request(app)
      .post(`/api/work-items/${item.id}/transition`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        status: 'IN_PROGRESS',
        version: 1,
        note: 'Starting triage work',
      });

    expect(res.status).toBe(200);

    // Exactly one activity recorded
    const activitiesAfter = await prisma.activity.findMany({
      where: { workItemId: item.id },
    });
    expect(activitiesAfter).toHaveLength(1);
    expect(activitiesAfter[0].action).toBe('STATUS_CHANGED');
    expect(activitiesAfter[0].oldValue).toBe('OPEN');
    expect(activitiesAfter[0].newValue).toBe('IN_PROGRESS');
    expect(activitiesAfter[0].actorId).toBe(user.user.id);
  });

  it('rolls back both work item change and activity record when a transaction fails mid-flight', async () => {
    const team = await createTestTeam('Finance Audit Team');
    const user = await createTestUser('Auditor', 'auditor@test.com', 'MEMBER', team);

    const seq = await prisma.$queryRaw`SELECT nextval(pg_get_serial_sequence('"WorkItem"', 'referenceNumber')) as next_ref;`;
    const refNum = Number(seq[0].next_ref);
    const item = await prisma.workItem.create({
      data: {
        referenceNumber: refNum,
        reference: `OPS-${refNum}`,
        title: 'Transaction rollback verification',
        description: 'Testing atomicity',
        priority: 'LOW',
        status: 'OPEN',
        teamId: team.id,
        createdById: user.user.id,
        version: 1,
      },
    });

    // Trigger update with simulated failure header
    const failRes = await request(app)
      .patch(`/api/work-items/${item.id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .set('x-simulate-tx-failure', 'true')
      .send({
        priority: 'URGENT',
        version: 1,
      });

    expect(failRes.status).toBe(500);

    // Verify database state: NO partial commit!
    // Item priority must remain 'LOW', version must remain 1
    const itemInDb = await prisma.workItem.findUnique({ where: { id: item.id } });
    expect(itemInDb.priority).toBe('LOW');
    expect(itemInDb.version).toBe(1);

    // No activity recorded
    const activities = await prisma.activity.findMany({ where: { workItemId: item.id } });
    expect(activities).toHaveLength(0);
  });
});
