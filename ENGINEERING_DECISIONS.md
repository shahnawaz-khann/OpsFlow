# Engineering Decisions

Here are five key technical decisions I made while building OpsFlow, along with why I made them, what trade-offs they come with, and how they could be improved as the app grows.

---

## 1. Using PostgreSQL and a Relational Model

### The Problem
OpsFlow handles connected data: users belong to teams, work items belong to teams, work items are assigned to users, and every action creates an activity log entry.

If I used a NoSQL database like MongoDB, I would have had to duplicate team and user information inside work items. When someone changes teams or a user is removed, keeping that duplicated data up to date gets messy quickly.

### What I Chose
I chose PostgreSQL with Prisma ORM.
- **Foreign keys:** If a user or team membership is removed, the database keeps everything clean (`CASCADE` or `RESTRICT`) instead of leaving broken references.
- **Readable IDs:** Work item IDs like `OPS-1001` use a PostgreSQL sequence (`SERIAL`), so they increase reliably without two items getting the same number.
- **Indexes:** I added compound indexes on `(teamId, status, updatedAt)` and `(assigneeId, status, updatedAt)` so team filtering and dashboard sorting stay fast.

### Trade-offs
Schema changes need migrations. If we ever want users to add dynamic custom fields to work items, a relational schema makes that harder than a flexible JSON document.

### How to Scale Later
As the database grows:
1. Move older activity logs into monthly archive tables or partitions, since people mostly view recent activity.
2. Add a read replica so dashboard queries don't slow down create and update requests.

---

## 2. Team-Based Permissions Checked on the Server

### The Problem
In real companies, permissions depend on the team. For example, a person might be a Lead in Engineering, but only a Viewer in Finance. Also, just hiding buttons on the frontend isn't real security, because anyone can still send direct API requests using curl or Postman.

### What I Chose
I wrote team-scoped permission checks in the backend (`permissionService.js`):
- Roles (`ADMIN`, `LEAD`, `MEMBER`, `VIEWER`) are tied to a specific team membership, not the user's global profile.
- Every API endpoint that fetches work items filters by the teams the user actually belongs to.
- Users can only assign items to people who are members of that item's team.
- Once created, a work item cannot be moved to another team. This stops someone from accidentally or sneakily moving a sensitive ticket to a team where they have higher permissions.

### Trade-offs
Every request looks up the user's team memberships in the database. For users with memberships in many teams, this adds an extra query on each check.

### How to Scale Later
1. Cache the user's team roles in Redis for a minute or until their permissions change.
2. If teams need more specific permissions later (like "can change priority but cannot delete"), we can switch from fixed roles to permission flags.

---

## 3. Safe Claiming and Preventing Overwrites

### The Problem
Two common concurrency issues happen in ticketing systems:
1. **Double Claim:** Two teammates open the same ticket at the same time and both click "Claim". Both think they got it.
2. **Lost Updates:** Teammate A opens a ticket to edit the description. While they are typing, Teammate B changes the priority to Urgent. When Teammate A clicks save, Teammate B's priority change is accidentally wiped out.

### What I Chose
I handled both at the database level:
1. **Safe Claiming:** The SQL query only assigns the item if `assigneeId` is currently `NULL`:
   ```sql
   UPDATE "WorkItem"
   SET "assigneeId" = $userId, "version" = "version" + 1
   WHERE "id" = $id AND "assigneeId" IS NULL;
   ```
   If someone else already claimed it, the query updates 0 rows, and the server returns a `409 Conflict`.
2. **Version Checking (OCC):** Every work item has a `version` number. When a user sends an update, they must include the version they were looking at. The update only runs if the version in the database matches:
   ```sql
   WHERE "id" = $id AND "version" = $version;
   ```
   If the version changed in the meantime, the server rejects the update with a `409 Conflict`. The UI shows a friendly modal telling the user the ticket was updated and lets them reload without losing their text.

### Trade-offs
When an update conflict happens, the second user has to refresh and re-submit their changes. This is fine for normal ticketing workloads, but would be annoying if many people edited the same item at once.

### How to Scale Later
We could add field-level merging (like Google Docs or Git) so that if Teammate A edits the title and Teammate B edits the priority, both changes are saved automatically without conflict.

---

## 4. Saving Audit History in the Same Database Transaction

### The Problem
If saving a work item update and saving its activity log are separate steps, one can fail while the other succeeds. For example, the work item might update, but the server crashes right before saving the log. Then nobody knows who made the change.

### What I Chose
I used Prisma's interactive transactions (`prisma.$transaction`).
- The work item update and the activity log insert happen inside the same database transaction.
- If anything fails, PostgreSQL rolls back the whole thing. Either both succeed, or neither does.

### Trade-offs
Database transactions keep a lock on the row for a brief moment. If we tried to do slow things inside the transaction (like calling an external API), it would slow down the database.

### How to Scale Later
If write volume gets very high, we can use an Outbox pattern: save the work item and an event record together in Postgres, then have a background worker push the event to a log service or Kafka.

---

## 5. Keeping the Core API Simple and Synchronous

### The Problem
Operational apps often need to send Slack notifications, trigger emails, or call webhooks. Trying to do all of that inside the main HTTP request slows things down and makes the API fail if Slack or the email provider is temporarily down.

### What I Chose
For this project, I kept all core actions synchronous and purely focused on the database:
- The API only updates the database, verifies permissions, and writes the audit log.
- Every action completes in a few milliseconds.
- I left external notifications (like emails or Slack webhooks) out of the main request path.

### Trade-offs
Users only see updates inside the web app; there are no external email or Slack alerts.

### How to Scale Later
Add a background job queue (like BullMQ with Redis):
1. When an item status changes, add a small job `{ workItemId, action, userId }` to the queue.
2. A separate worker process picks up the job and sends the Slack alert or email with automatic retries if the external service fails.
