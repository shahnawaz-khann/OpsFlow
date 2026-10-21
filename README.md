# OpsFlow

OpsFlow is an internal tool for managing operational work in one place instead of tracking requests through emails, chat messages, and spreadsheets.

Users can create work items, assign them to team members, track progress, manage approvals, and view the history of changes.

## Tech Stack

- **Frontend:** React 18, Vite, JavaScript, Tailwind CSS, React Router
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Validation:** Zod
- **Testing:** Vitest and Supertest
- **Database Setup:** Docker Compose

## Features

- Create, update, assign, and resolve work items.
- Search and filter by status, priority, team, and assignee.
- View dashboard summaries and urgent work.
- Manage team memberships and roles.
- Track changes through an activity timeline.
- Prevent conflicting claims and stale updates.
- Enforce team-based permissions on the backend.
- Handle approval workflows.

## Getting Started

### Prerequisites

- Node.js 18 or a compatible version
- npm
- Docker with Docker Compose

### 1. Clone the Repository

```bash
git clone <repo-url>
cd OpsFlow
npm install
```

Replace `<repo-url>` with the repository URL.

### 2. Configure Environment Variables

Create the required `.env` files using the provided `.env.example` files. Set the PostgreSQL credentials and make sure the backend's `DATABASE_URL` matches the database configuration.

Do not commit environment files containing secrets.

### 3. Start PostgreSQL

```bash
docker compose up -d
docker compose ps
```

### 4. Run Migrations and Seed Data

```bash
npm run prisma:migrate
npm run prisma:seed
```

These commands should create the database tables and insert sample users, teams, and work items.

### 5. Start the Application

Start the backend in one terminal:

```bash
npm run dev:server
```

Start the frontend in another terminal:

```bash
npm run dev:client
```

Open `http://localhost:5173` in your browser. The API should run at `http://localhost:5001`.

## How It Works

### Safe Claiming

When two users try to claim the same unassigned item, the backend uses a conditional database update. Only one claim can succeed; the other request receives a conflict response.

### Concurrent Updates

Each work item has a version number. If a user tries to save an older version, the backend rejects the update and asks them to refresh the latest data.

### Authorization

Users have roles within individual teams. The backend checks team membership and permissions before allowing access or changes. Frontend controls alone are not used for security.

### Activity History

Important changes are recorded in an activity timeline. The work-item update and its activity entry are saved in the same database transaction.

## Demo Accounts

The seed script creates six sample users across Engineering, Customer Operations, and Finance.

| User | Email | Roles |
|---|---|---|
| Ananya Sharma | `ananya@opsflow.internal` | Engineering Admin, Customer Ops Admin, Finance Lead |
| Rohan Verma | `rohan@opsflow.internal` | Engineering Lead, Customer Ops Member |
| Priya Patel | `priya@opsflow.internal` | Engineering Member |
| Deepak Gupta | `deepak@opsflow.internal` | Engineering Viewer, Finance Member |
| Kavita Iyer | `kavita@opsflow.internal` | Customer Ops Lead |
| Vikram Malhotra | `vikram@opsflow.internal` | Finance Member |

Use the demo credentials configured by the seed script. Any shared demo password is for local testing only.

The role switcher is intended for demonstrations. It must not allow users to grant themselves permissions; the backend must enforce authorization independently.

## Running Tests

Run the automated tests with:

```bash
npm run test
```

Use a separate PostgreSQL test database.

The tests should cover:

- Unauthorized access to another team's work.
- Competing claims on the same item.
- Rejection of stale updates.
- Transactional activity history.
- Invalid workflow transitions and approval rules.

Report only test results that have actually been verified.

## Project Structure

```text
OpsFlow/
├── client/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       └── pages/
├── server/
│   ├── prisma/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── validators/
│   └── tests/
├── docker-compose.yml
├── package.json
├── README.md
└── ENGINEERING_DECISIONS.md
```

## Known Limitations

List any features that are incomplete, such as real-time updates, notifications, or production deployment configuration.

## Engineering Decisions

See [ENGINEERING_DECISIONS.md](./ENGINEERING_DECISIONS.md) for the reasoning behind the database model, authorization, concurrent updates, and activity history.