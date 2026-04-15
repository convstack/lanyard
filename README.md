<img width="1400" height="400" alt="1400x400" src="https://github.com/user-attachments/assets/d6d673c4-5ce8-4899-8f9d-592841e962d2" />

> **Warning**
> This project is under active development and not yet ready for production use. APIs, database schemas, and features may change without notice.

# Lanyard

Lanyard is an identity provider and service catalog manager, inspired by OpenStack's Keystone. It handles authentication, user management, OIDC provider functionality, and service discovery for the Convention platform.

## What it does

- **Identity Provider** — Email/password authentication, social login (Discord, Google, GitHub), two-factor authentication (TOTP), and passkey/WebAuthn support
- **OIDC Provider** — Acts as an OpenID Connect authorization server so other applications (like Dashboard) can authenticate users via standard OAuth2/OIDC flows
- **Service Catalog** — Backend services register themselves with Lanyard, providing health check endpoints and UI manifests that describe their navigation, pages, and widgets
- **Self-Registration** — On boot, Lanyard registers itself in its own catalog with two services: "Administration" (admin panel) and "My Account" (user self-service)

## Architecture

Lanyard is a full-stack app built with TanStack React Start, but its UI is minimal — only the OIDC auth flow pages (login, register, forgot password, consent) live here. All admin and user self-service UI is rendered by the Dashboard app via JSON manifests.

```
Browser → Dashboard (UI) → API Proxy → Lanyard (API + Auth)
                                    → Other Services (API)
```

## Tech Stack

- **Runtime:** Bun
- **Framework:** TanStack React Start (Vite + React 19)
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** Better Auth with OIDC provider, admin, 2FA, passkey, and organization plugins
- **Storage:** S3-compatible (MinIO for local dev)
- **Linting:** Biome

## Getting Started

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your database URL and secrets

# Run database migrations
bun run db:push

# Create initial admin user + register Dashboard OIDC client
bun run lanyard:setup "Admin" admin@example.com

# Start development server
bun run dev
```

## Scripts

| Script | Description |
|---|---|
| `bun run dev` | Start dev server (port 3000) |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lanyard:setup` | Bootstrap admin user + Dashboard client |
| `bun run db:push` | Push schema to database |
| `bun run db:generate` | Generate migration files |
| `bun run db:migrate` | Run migrations |
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | Biome linting |
