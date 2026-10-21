import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma, clearDatabase, createTestUser, createTestTeam } from './setup.js';

describe('Test C: Optimistic Concurrency Protection (Version Checks)', () => {
  const app = createApp();

  beforeEach(async () => {
    await clearDatabase();
  });

  it('rejects stale version update with 409 Conflict and preserves first update', async () => {
    const team = await createTestTeam('Engineering Team');
    const user1 = await createTestUser('Dev One', 'dev1@test.com', 'MEMBER', team);
    const user2 = await createTestUser('Dev Two', 'dev2@test.com', 'MEMBER', team);

    // Create item at version 1
    const seq = await prisma.$queryRaw`SELECT nextval(pg_get_serial_sequence('"WorkItem"', 'referenceNumber')) as next_ref;`;
    const refNum = Number(seq[0].next_ref);
    const item = await prisma.workItem.create({
      data: {
        referenceNumber: refNum,
        reference: `OPS-${refNum}`,
        title: 'Original Title v1',
        description: 'Original description',
        priority: 'MEDIUM',
        status: 'OPEN',
        teamId: team.id,
        createdById: user1.user.id,
        version: 1,
      },
    });

    // Both Dev 1 and Dev 2 read the item at version 1
    const readItem = await prisma.workItem.findUnique({ where: { id: item.id } });
    expect(readItem.version).toBe(1);

    // 1. Dev 1 updates using version 1 -> Succeeds, increments version to 2
    const update1 = await request(app)
      .patch(`/api/work-items/${item.id}`)
      .set('Authorization', `Bearer ${user1.token}`)
      .send({
        title: 'Title updated by Dev 1',
        priority: 'HIGH',
        version: 1,
      });

    expect(update1.status).toBe(200);
    expect(update1.body.data.version).toBe(2);
    expect(update1.body.data.title).toBe('Title updated by Dev 1');

    // 2. Dev 2 attempts to save an edit using stale version 1 -> Must be 409 Conflict
    const update2 = await request(app)
      .patch(`/api/work-items/${item.id}`)
      .set('Authorization', `Bearer ${user2.token}`)
      .send({
        title: 'Title blindly overwritten by Dev 2',
        priority: 'LOW',
        version: 1,
      });

    expect(update2.status).toBe(409);
    expect(update2.body.error.code).toBe('CONFLICT');
    expect(update2.body.error.message).toMatch(/updated by someone else/i);

    // 3. Verify in database: Dev 1's update is intact, version is 2
    const currentItem = await prisma.workItem.findUnique({ where: { id: item.id } });
    expect(currentItem.title).toBe('Title updated by Dev 1');
    expect(currentItem.priority).toBe('HIGH');
    expect(currentItem.version).toBe(2);

    // 4. Now if Dev 2 fetches latest (version 2) and saves with version 2 -> Succeeds
    const update3 = await request(app)
      .patch(`/api/work-items/${item.id}`)
      .set('Authorization', `Bearer ${user2.token}`)
      .send({
        title: 'Dev 2 informed update after refresh',
        version: 2,
      });

    expect(update3.status).toBe(200);
    expect(update3.body.data.version).toBe(3);
    expect(update3.body.data.title).toBe('Dev 2 informed update after refresh');
  });
});
