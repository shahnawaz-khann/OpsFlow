import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding OpsFlow database with realistic Indian operational data...');

  // Clean existing data in reverse order of foreign key dependencies
  await prisma.activity.deleteMany({});
  await prisma.approval.deleteMany({});
  await prisma.workItem.deleteMany({});
  await prisma.teamMembership.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.user.deleteMany({});

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Create Users with authentic Indian names
  const ananya = await prisma.user.create({
    data: {
      name: 'Ananya Sharma',
      email: 'ananya@opsflow.internal',
      password: defaultPassword,
    },
  });

  const rohan = await prisma.user.create({
    data: {
      name: 'Rohan Verma',
      email: 'rohan@opsflow.internal',
      password: defaultPassword,
    },
  });

  const priya = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      email: 'priya@opsflow.internal',
      password: defaultPassword,
    },
  });

  const deepak = await prisma.user.create({
    data: {
      name: 'Deepak Gupta',
      email: 'deepak@opsflow.internal',
      password: defaultPassword,
    },
  });

  const kavita = await prisma.user.create({
    data: {
      name: 'Kavita Iyer',
      email: 'kavita@opsflow.internal',
      password: defaultPassword,
    },
  });

  const vikram = await prisma.user.create({
    data: {
      name: 'Vikram Malhotra',
      email: 'vikram@opsflow.internal',
      password: defaultPassword,
    },
  });

  console.log('Created 6 users (Ananya, Rohan, Priya, Deepak, Kavita, Vikram).');

  // 2. Create Teams
  const engineering = await prisma.team.create({
    data: {
      name: 'Engineering',
      description: 'Platform infrastructure, backend services, bug triage and developer tooling',
    },
  });

  const customerOps = await prisma.team.create({
    data: {
      name: 'Customer Operations',
      description: 'Customer escalations, onboarding workflows, account reconciliations',
    },
  });

  const finance = await prisma.team.create({
    data: {
      name: 'Finance',
      description: 'Vendor settlements, GST reconciliations, financial audit reporting',
    },
  });

  console.log('Created 3 teams (Engineering, Customer Operations, Finance).');

  // 3. Create Team Memberships (demonstrating role per team)
  // Engineering:
  // Ananya: ADMIN, Rohan: LEAD, Priya: MEMBER, Deepak: VIEWER
  await prisma.teamMembership.createMany({
    data: [
      { userId: ananya.id, teamId: engineering.id, role: 'ADMIN' },
      { userId: rohan.id, teamId: engineering.id, role: 'LEAD' },
      { userId: priya.id, teamId: engineering.id, role: 'MEMBER' },
      { userId: deepak.id, teamId: engineering.id, role: 'VIEWER' },
    ],
  });

  // Customer Operations:
  // Ananya: ADMIN, Kavita: LEAD, Rohan: MEMBER
  await prisma.teamMembership.createMany({
    data: [
      { userId: ananya.id, teamId: customerOps.id, role: 'ADMIN' },
      { userId: kavita.id, teamId: customerOps.id, role: 'LEAD' },
      { userId: rohan.id, teamId: customerOps.id, role: 'MEMBER' },
    ],
  });

  // Finance:
  // Ananya: LEAD, Vikram: MEMBER, Deepak: MEMBER
  await prisma.teamMembership.createMany({
    data: [
      { userId: ananya.id, teamId: finance.id, role: 'LEAD' },
      { userId: vikram.id, teamId: finance.id, role: 'MEMBER' },
      { userId: deepak.id, teamId: finance.id, role: 'MEMBER' },
    ],
  });

  console.log('Created team memberships.');

  // Helper to create a work item with activity
  let seq = 1000;
  async function createItem({
    title,
    description,
    teamId,
    status = 'OPEN',
    priority = 'MEDIUM',
    assigneeId = null,
    createdById,
    requiresApproval = false,
    version = 1,
    resolvedAt = null,
    activities = [],
    approval = null,
  }) {
    seq++;
    const refNum = seq;
    const ref = `OPS-${refNum}`;

    const item = await prisma.workItem.create({
      data: {
        referenceNumber: refNum,
        reference: ref,
        title,
        description,
        status,
        priority,
        teamId,
        assigneeId,
        createdById,
        requiresApproval,
        version,
        resolvedAt,
      },
    });

    // Default CREATED activity
    await prisma.activity.create({
      data: {
        workItemId: item.id,
        actorId: createdById,
        action: 'CREATED',
        note: `Work item ${ref} created`,
      },
    });

    // Additional activity history
    for (const act of activities) {
      await prisma.activity.create({
        data: {
          workItemId: item.id,
          actorId: act.actorId || createdById,
          action: act.action,
          field: act.field,
          oldValue: act.oldValue,
          newValue: act.newValue,
          note: act.note,
        },
      });
    }

    if (approval) {
      await prisma.approval.create({
        data: {
          workItemId: item.id,
          requestedById: approval.requestedById,
          decidedById: approval.decidedById || null,
          status: approval.status || 'PENDING',
          decisionNote: approval.decisionNote || null,
          decidedAt: approval.decidedAt || null,
        },
      });
    }

    return item;
  }

  // 4. Create realistic, dynamic Work Items
  // Item 1: High priority open bug in Engineering (unassigned - ready to be claimed!)
  await createItem({
    title: 'PostgreSQL connection pool exhaustion during peak ingest',
    description: 'Read replicas hit connection limit causing 504 gateway timeouts on the telemetry pipeline. Need connection pooling or pgBouncer tuning.',
    teamId: engineering.id,
    status: 'OPEN',
    priority: 'URGENT',
    createdById: rohan.id,
  });

  // Item 2: Urgent item assigned to Priya (In Progress)
  await createItem({
    title: 'Migrate legacy Redis session cache to Valkey cluster',
    description: 'Ensure compatibility with session serialization and verify cluster failover resilience under staging load.',
    teamId: engineering.id,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assigneeId: priya.id,
    createdById: rohan.id,
    version: 2,
    activities: [
      {
        actorId: priya.id,
        action: 'CLAIMED',
        note: 'Priya Patel self-claimed this item to lead the Valkey migration',
      },
      {
        actorId: priya.id,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: 'OPEN',
        newValue: 'IN_PROGRESS',
        note: 'Starting cluster deployment on Kubernetes node pool',
      },
    ],
  });

  // Item 3: Blocked item in Engineering
  await createItem({
    title: 'Integrate OpenTelemetry tracing in batch worker daemon',
    description: 'Trace context propagation is dropping span headers over background job queue workers.',
    teamId: engineering.id,
    status: 'BLOCKED',
    priority: 'MEDIUM',
    assigneeId: rohan.id,
    createdById: ananya.id,
    version: 3,
    activities: [
      {
        actorId: ananya.id,
        action: 'ASSIGNED',
        field: 'assigneeId',
        oldValue: 'Unassigned',
        newValue: 'Rohan Verma',
        note: 'Assigned to Rohan for deep architectural review',
      },
      {
        actorId: rohan.id,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: 'OPEN',
        newValue: 'IN_PROGRESS',
      },
      {
        actorId: rohan.id,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: 'IN_PROGRESS',
        newValue: 'BLOCKED',
        note: 'Waiting for upstream tracing SDK patch release',
      },
    ],
  });

  // Item 4: Resolved item in Engineering
  await createItem({
    title: 'Security patch: Update openssl and node base images',
    description: 'Applied security update to Dockerfile base alpine image addressing CVE-2024-5535.',
    teamId: engineering.id,
    status: 'RESOLVED',
    priority: 'HIGH',
    assigneeId: priya.id,
    createdById: ananya.id,
    version: 3,
    resolvedAt: new Date(),
    activities: [
      {
        actorId: priya.id,
        action: 'CLAIMED',
        note: 'Claimed by Priya Patel',
      },
      {
        actorId: priya.id,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: 'OPEN',
        newValue: 'IN_PROGRESS',
      },
      {
        actorId: priya.id,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: 'IN_PROGRESS',
        newValue: 'RESOLVED',
        note: 'Images deployed and verified clean in vulnerability scanner',
      },
    ],
  });

  // Item 5: Unassigned item requiring approval (Engineering)
  await createItem({
    title: 'Database schema drop: Deprecate legacy audit_log_v1 partition table',
    description: 'Data older than retention policy has been archived to S3 cold storage. Requires Lead approval before dropping physical table partition.',
    teamId: engineering.id,
    status: 'OPEN',
    priority: 'HIGH',
    createdById: priya.id,
    requiresApproval: true,
    approval: {
      requestedById: priya.id,
      status: 'PENDING',
    },
  });

  // Item 6: Customer Ops - Unassigned Open (UPI Escalation)
  await createItem({
    title: 'Investigate UPI auto-debit failure on HDFC merchant gateway',
    description: 'Multiple users reporting mandate registration failure with error code U19. Validate NPCI callback response payload parsing.',
    teamId: customerOps.id,
    status: 'OPEN',
    priority: 'URGENT',
    createdById: kavita.id,
  });

  // Item 7: Customer Ops - In Progress
  await createItem({
    title: 'Reconcile duplicate account invitations for Enterprise cohort',
    description: 'Users receiving multiple workspace invites due to webhook retry loop on auth service.',
    teamId: customerOps.id,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assigneeId: rohan.id,
    createdById: kavita.id,
    version: 2,
    activities: [
      {
        actorId: kavita.id,
        action: 'ASSIGNED',
        field: 'assigneeId',
        oldValue: 'Unassigned',
        newValue: 'Rohan Verma',
        note: 'Assigned to Rohan to inspect webhook idempotent consumer',
      },
      {
        actorId: rohan.id,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: 'OPEN',
        newValue: 'IN_PROGRESS',
      },
    ],
  });

  // Item 8: Customer Ops - Open Medium
  await createItem({
    title: 'Audit export request for annual compliance report',
    description: 'Generate sanitized user activity log for external compliance audit.',
    teamId: customerOps.id,
    status: 'OPEN',
    priority: 'MEDIUM',
    createdById: ananya.id,
  });

  // Item 9: Finance - In Progress with Vikram
  await createItem({
    title: 'Investigate Razorpay merchant refund discrepancies for batch #849',
    description: 'Merchant ledger variance of ₹3,42,000 reported across net banking settlements. Reconcile settlement batch files against internal ledger.',
    teamId: finance.id,
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    assigneeId: vikram.id,
    createdById: ananya.id,
    version: 2,
    activities: [
      {
        actorId: vikram.id,
        action: 'CLAIMED',
        note: 'Vikram Malhotra claimed for settlement reconciliation',
      },
      {
        actorId: vikram.id,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: 'OPEN',
        newValue: 'IN_PROGRESS',
      },
    ],
  });

  // Item 10: Finance - Blocked
  await createItem({
    title: 'Quarterly GST withholding & TDS reconciliation',
    description: 'Missing Form 16A contractor documentation from three cloud vendors.',
    teamId: finance.id,
    status: 'BLOCKED',
    priority: 'HIGH',
    assigneeId: deepak.id,
    createdById: vikram.id,
    version: 3,
    activities: [
      {
        actorId: vikram.id,
        action: 'ASSIGNED',
        field: 'assigneeId',
        oldValue: 'Unassigned',
        newValue: 'Deepak Gupta',
      },
      {
        actorId: deepak.id,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: 'OPEN',
        newValue: 'IN_PROGRESS',
      },
      {
        actorId: deepak.id,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: 'IN_PROGRESS',
        newValue: 'BLOCKED',
        note: 'Awaiting vendor accounting response via email',
      },
    ],
  });

  // Item 11: Finance - Approved & Resolved
  await createItem({
    title: 'Annual cloud infrastructure prepayment authorization',
    description: 'AWS annual savings plan commitment discount authorization for FY26-27.',
    teamId: finance.id,
    status: 'RESOLVED',
    priority: 'URGENT',
    assigneeId: ananya.id,
    createdById: vikram.id,
    requiresApproval: true,
    version: 4,
    resolvedAt: new Date(),
    activities: [
      {
        actorId: vikram.id,
        action: 'ASSIGNED',
        field: 'assigneeId',
        oldValue: 'Unassigned',
        newValue: 'Ananya Sharma',
      },
      {
        actorId: ananya.id,
        action: 'APPROVAL_DECIDED',
        note: 'Approved 3-year term commitment',
      },
      {
        actorId: ananya.id,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: 'OPEN',
        newValue: 'RESOLVED',
        note: 'Payment schedule booked in NetSuite',
      },
    ],
    approval: {
      requestedById: vikram.id,
      decidedById: ananya.id,
      status: 'APPROVED',
      decisionNote: 'Authorized under executive capital budget limits',
      decidedAt: new Date(),
    },
  });

  // Item 12: Engineering - Low priority open
  await createItem({
    title: 'Update developer documentation for local docker-compose setup',
    description: 'Add instructions for running PostgreSQL on Apple Silicon and configuring pgAdmin.',
    teamId: engineering.id,
    status: 'OPEN',
    priority: 'LOW',
    createdById: priya.id,
  });

  // Item 13: Customer Ops - Resolved
  await createItem({
    title: 'Fix customer email notification template formatting on mobile',
    description: 'HTML tables in notification digest emails were clipping on iOS Mail client.',
    teamId: customerOps.id,
    status: 'RESOLVED',
    priority: 'LOW',
    assigneeId: kavita.id,
    createdById: kavita.id,
    resolvedAt: new Date(),
  });

  // Item 14: Engineering - Medium open
  await createItem({
    title: 'Implement rate limiting on public webhook ingress route',
    description: 'Protect webhook listener against bursts exceeding 200 req/sec per token.',
    teamId: engineering.id,
    status: 'OPEN',
    priority: 'MEDIUM',
    createdById: rohan.id,
  });

  // Item 15: Finance - Open Medium
  await createItem({
    title: 'Setup automated monthly invoice generation for direct enterprise clients',
    description: 'Configure cron trigger in billing service to generate PDF invoices on 1st of every month.',
    teamId: finance.id,
    status: 'OPEN',
    priority: 'MEDIUM',
    createdById: ananya.id,
  });

  console.log('Created 15 realistic Work Items with activities and approvals.');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
