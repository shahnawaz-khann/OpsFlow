import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma, clearDatabase, createTestUser, createTestTeam } from './setup.js';

describe('Test B: Competing Claims Concurrency', () => {
  const app = createApp();

  beforeEach(async () => {
    await clearDatabase();
  });

  it('guarantees atomic claiming under concurrent requests: exactly one succeeds and one conflict', async () => {
    const team = await createTestTeam('Operations Team');
    const user1 = await createTestUser('Worker One', 'worker1@test.com', 'MEMBER', team);
    const user2 = await createTestUser('Worker Two', 'worker2@test.com', 'MEMBER', team);

    // Create unassigned work item
    const seq = await prisma.$queryRaw`SELECT nextval(pg_get_serial_sequence('"WorkItem"', 'referenceNumber')) as next_ref;`;
    const refNum = Number(seq[0].next_ref);
    const item = await prisma.workItem.create({
      data: {
        referenceNumber: refNum,
        reference: `OPS-${refNum}`,
        title: 'High priority incident triage',
        description: 'Triage ticket requiring immediate owner',
        priority: 'URGENT',
        status: 'OPEN',
        teamId: team.id,
        createdById: user1.user.id,
        assigneeId: null,
        version: 1,
      },
    });

    // Fire two claim requests simultaneously
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/work-items/${item.id}/claim`)
        .set('Authorization', `Bearer ${user1.token}`),
      request(app)
        .post(`/api/work-items/${item.id}/claim`)
        .set('Authorization', `Bearer ${user2.token}`),
    ]);

    // Exactly one must succeed (200) and one must conflict (409)
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);

    const conflictRes = res1.status === 409 ? res1 : res2;
    expect(conflictRes.body.error.code).toBe('CONFLICT');

    // Assert final database state
    const finalItem = await prisma.workItem.findUnique({
      where: { id: item.id },
    });

    // Exactly one assignee
    expect(finalItem.assigneeId).not.toBeNull();
    const winningUserId = res1.status === 200 ? user1.user.id : user2.user.id;
    expect(finalItem.assigneeId).toBe(winningUserId);

    // Version incremented by 1
    expect(finalItem.version).toBe(2);

    // Assert only one CLAIMED activity was created in database
    const claimActivities = await prisma.activity.findMany({
      where: {
        workItemId: item.id,
        action: 'CLAIMED',
      },
    });
    expect(claimActivities).toHaveLength(1);
    expect(claimActivities[0].actorId).toBe(winningUserId);
  });

  it('idempotent claim: repeated claim by the same winning user returns 200 without duplicate activity', async () => {
    const team = await createTestTeam('Platform Team');
    const user = await createTestUser('Worker Solo', 'solo@test.com', 'MEMBER', team);

    const seq = await prisma.$queryRaw`SELECT nextval(pg_get_serial_sequence('"WorkItem"', 'referenceNumber')) as next_ref;`;
    const refNum = Number(seq[0].next_ref);
    const item = await prisma.workItem.create({
      data: {
        referenceNumber: refNum,
        reference: `OPS-${refNum}`,
        title: 'Solo claim test',
        description: 'Testing idempotency',
        priority: 'MEDIUM',
        status: 'OPEN',
        teamId: team.id,
        createdById: user.user.id,
        assigneeId: null,
        version: 1,
      },
    });

    // Claim 1: succeeds
    const firstClaim = await request(app)
      .post(`/api/work-items/${item.id}/claim`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(firstClaim.status).toBe(200);

    // Claim 2 by the SAME user: idempotent 200
    const secondClaim = await request(app)
      .post(`/api/work-items/${item.id}/claim`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(secondClaim.status).toBe(200);

    // Verify only ONE CLAIMED activity entry exists
    const activities = await prisma.activity.findMany({
      where: { workItemId: item.id, action: 'CLAIMED' },
    });
    expect(activities).toHaveLength(1);
  });
});
