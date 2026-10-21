import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma, clearDatabase, createTestUser, createTestTeam } from './setup.js';

describe('Test E: Workflow Validation and Approval Enforcement', () => {
  const app = createApp();

  beforeEach(async () => {
    await clearDatabase();
  });

  it('rejects illegal status transitions (e.g. OPEN -> BLOCKED directly)', async () => {
    const team = await createTestTeam('Core Team');
    const user = await createTestUser('Alice Tester', 'alice@test.com', 'MEMBER', team);

    const seq = await prisma.$queryRaw`SELECT nextval(pg_get_serial_sequence('"WorkItem"', 'referenceNumber')) as next_ref;`;
    const refNum = Number(seq[0].next_ref);
    const item = await prisma.workItem.create({
      data: {
        referenceNumber: refNum,
        reference: `OPS-${refNum}`,
        title: 'Workflow transition check',
        description: 'Test illegal jump',
        priority: 'MEDIUM',
        status: 'OPEN',
        teamId: team.id,
        createdById: user.user.id,
        version: 1,
      },
    });

    // Try transitioning OPEN -> BLOCKED (only OPEN -> IN_PROGRESS or OPEN -> RESOLVED allowed)
    const res = await request(app)
      .post(`/api/work-items/${item.id}/transition`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        status: 'BLOCKED',
        version: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
    expect(res.body.error.message).toMatch(/cannot transition from OPEN to BLOCKED/i);

    // Verify item remains OPEN in database
    const inDb = await prisma.workItem.findUnique({ where: { id: item.id } });
    expect(inDb.status).toBe('OPEN');
    expect(inDb.version).toBe(1);
  });

  it('blocks resolution of an item requiring approval when approval is still pending', async () => {
    const team = await createTestTeam('DevOps Team');
    const member = await createTestUser('Dev Member', 'dev@test.com', 'MEMBER', team);
    const lead = await createTestUser('Dev Lead', 'lead@test.com', 'LEAD', team);

    // Create item requiring approval with pending approval request
    const seq = await prisma.$queryRaw`SELECT nextval(pg_get_serial_sequence('"WorkItem"', 'referenceNumber')) as next_ref;`;
    const refNum = Number(seq[0].next_ref);
    const item = await prisma.workItem.create({
      data: {
        referenceNumber: refNum,
        reference: `OPS-${refNum}`,
        title: 'Drop database table partition',
        description: 'Dangerous operation',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        teamId: team.id,
        createdById: member.user.id,
        requiresApproval: true,
        version: 1,
      },
    });

    await prisma.approval.create({
      data: {
        workItemId: item.id,
        requestedById: member.user.id,
        status: 'PENDING',
      },
    });

    // Attempt to transition to RESOLVED while approval is pending -> Rejected
    const resolveAttempt = await request(app)
      .post(`/api/work-items/${item.id}/transition`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        status: 'RESOLVED',
        version: 1,
      });

    expect(resolveAttempt.status).toBe(400);
    expect(resolveAttempt.body.error.code).toBe('INVALID_TRANSITION');
    expect(resolveAttempt.body.error.message).toMatch(/requires an approved decision/i);

    // Verify item remains IN_PROGRESS
    const unchanged = await prisma.workItem.findUnique({ where: { id: item.id } });
    expect(unchanged.status).toBe('IN_PROGRESS');

    // Now Team Lead approves the request
    const approveRes = await request(app)
      .post(`/api/work-items/${item.id}/approval`)
      .set('Authorization', `Bearer ${lead.token}`)
      .send({
        decision: 'APPROVED',
        note: 'Risk evaluated and approved',
      });

    expect(approveRes.status).toBe(200);

    // Fetch latest version
    const updatedItem = await prisma.workItem.findUnique({ where: { id: item.id } });

    // Now transitioning to RESOLVED succeeds
    const resolveSuccess = await request(app)
      .post(`/api/work-items/${item.id}/transition`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        status: 'RESOLVED',
        version: updatedItem.version,
      });

    expect(resolveSuccess.status).toBe(200);
    expect(resolveSuccess.body.data.status).toBe('RESOLVED');
    expect(resolveSuccess.body.data.resolvedAt).not.toBeNull();
  });

  it('restricts reopening a RESOLVED item to Lead or Admin only', async () => {
    const team = await createTestTeam('Product Team');
    const member = await createTestUser('Regular Member', 'reg@test.com', 'MEMBER', team);
    const lead = await createTestUser('Team Leader', 'leader@test.com', 'LEAD', team);

    const seq = await prisma.$queryRaw`SELECT nextval(pg_get_serial_sequence('"WorkItem"', 'referenceNumber')) as next_ref;`;
    const refNum = Number(seq[0].next_ref);
    const item = await prisma.workItem.create({
      data: {
        referenceNumber: refNum,
        reference: `OPS-${refNum}`,
        title: 'Resolved feature item',
        description: 'Completed work',
        priority: 'MEDIUM',
        status: 'RESOLVED',
        teamId: team.id,
        createdById: lead.user.id,
        resolvedAt: new Date(),
        version: 2,
      },
    });

    // Regular member attempts to reopen (RESOLVED -> OPEN) -> Forbidden
    const memberReopen = await request(app)
      .post(`/api/work-items/${item.id}/transition`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        status: 'OPEN',
        version: 2,
      });

    expect(memberReopen.status).toBe(403);

    // Lead reopens (RESOLVED -> OPEN) -> Succeeded
    const leadReopen = await request(app)
      .post(`/api/work-items/${item.id}/transition`)
      .set('Authorization', `Bearer ${lead.token}`)
      .send({
        status: 'OPEN',
        version: 2,
        note: 'Reopened by lead due to regression report',
      });

    expect(leadReopen.status).toBe(200);
    expect(leadReopen.body.data.status).toBe('OPEN');
    expect(leadReopen.body.data.resolvedAt).toBeNull();
  });
});
