# Workflow Studio

Workflow Studio is a web application for designing and managing approval workflows, form templates, and versioned business processes.

## Features

- Form template management
- Workflow definition
- Version control
- Draft and published templates
- Approval process design

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript

### Backend

- NestJS
- TypeScript

### Database

- PostgreSQL
- Prisma

### Development Environment

- Docker Compose
- pnpm Workspace

## Getting Started

### Requirements

- Docker Desktop

Node.js and pnpm do not need to be installed on the host machine.

### Start Development Environment

```bash
docker compose up
```

On the first startup:

1. PostgreSQL starts
2. API container starts
3. Dependencies are installed with `pnpm install`
4. NestJS starts
5. Health check passes
6. Frontend starts

The first startup may take a few minutes.

### Dependency Installation

Dependencies are installed automatically inside the API container during startup.

Installed packages are written to the repository's node_modules directory on the host machine, allowing IDEs such as VS Code to provide TypeScript, ESLint, and IntelliSense support without requiring Node.js or pnpm to be installed locally.

The frontend startup is intentionally delayed until the backend health check succeeds, ensuring dependency installation and backend initialization have completed before Next.js starts

### Access URLs

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:3100 |

### Stop Environment

```bash
docker compose down
```

### Remove All Data

```bash
docker compose down -v
```

## Documentation

- [Domain Model](docs/domain-model.md)
- [Request Lifecycle](docs/request-lifecycle.md)
- [Schema Design](docs/schema.md)
- [ER Diagram](docs/er-diagram.md)
- [Architecture Decision Records](docs/adr)

## Repository Structure

```text
apps/
  web/      # Next.js
  api/      # NestJS
packages/
  db/       # Prisma schema and client

docs/
  adr/
```
