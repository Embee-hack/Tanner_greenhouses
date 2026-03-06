# Tanner Greenhouse Dashboard (Self-Hosted)

This project is now independent of Base44.

Current stack:
- Frontend: React + Vite (`src/`)
- Backend API: Express + Prisma (`server/`)
- Database: Postgres (Neon-ready via `DATABASE_URL`)
- Auth: JWT-based email/password login
- File uploads: local disk (`/uploads`) served by API

Role model:
- `admin`: full access (finance + users + all operations)
- `farm_manager`: operations-focused access (no user management, no finance pages)

Worker role model:
- Worker roles (for `Workers` records) can be customized by admins from the Workers page (`Manage Roles`).

## 1. Local Setup (macOS)

1. Install Node.js 20+.
2. Install dependencies:

```bash
npm install
```

3. Create backend env file:

```bash
cp .env.example .env
```

4. Set at least:
- `DATABASE_URL` (Neon Postgres URL)
- `JWT_SECRET` (long random value)

5. Create frontend env file:

```bash
cp .env.local.example .env.local
```

6. Sync Prisma schema to your DB:

```bash
npm run db:push
```

7. Run API + frontend together:

```bash
npm run dev:full
```

8. Open `http://localhost:5173`.  
If this is a fresh DB, the app will show a setup screen to create the first admin user.

## 2. Upcoming Event Notifications (In-App + Email)

Current behavior:
- In-app notifications are shown in the admin bell panel for upcoming calendar events (next 24 hours).
- Email reminders are sent to all admin users from the backend scheduler (optional, controlled by env vars).

Gmail SMTP setup (no Resend required):
1. Turn on 2-Step Verification for your Gmail account.
2. Create a Gmail App Password.
3. Add these API env vars:
- `EVENT_REMINDER_ENABLED=true`
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=yourgmail@gmail.com`
- `SMTP_PASS=<gmail-app-password>`
- `SMTP_FROM=yourgmail@gmail.com`
- `EVENT_REMINDER_LOOKAHEAD_HOURS=24` (optional)
- `EVENT_REMINDER_CHECK_INTERVAL_MINUTES=15` (optional)
- `EVENT_REMINDER_TIMEZONE=Africa/Lagos` (optional)

Quick test (after login as admin):
- `POST /api/reminders/test-email` sends a test message.
- `POST /api/reminders/run` manually runs reminder detection (`{"dry_run": true}` supported).

## 3. Production Deploy (Render + Neon)

Use `render.yaml` as a starting blueprint.

Services:
- `tanner-greenhouse-api` (Node web service)
- `tanner-greenhouse-frontend` (Static site)

Required env vars:

API service:
- `DATABASE_URL` (Neon connection string)
- `JWT_SECRET`
- `CLIENT_ORIGIN` (frontend URL, e.g. `https://app.yourdomain.com`)
- `PUBLIC_BASE_URL` (API URL, e.g. `https://api.yourdomain.com`)

Frontend service:
- `VITE_API_BASE_URL` (API public URL)

## 4. Domain Setup

1. Add custom domain(s) in Render for both services (for example):
- Frontend: `app.yourdomain.com`
- API: `api.yourdomain.com`

2. Create the DNS records Render requests (usually CNAME for subdomains).
3. Update API env:
- `CLIENT_ORIGIN=https://app.yourdomain.com`
- `PUBLIC_BASE_URL=https://api.yourdomain.com`
4. Update frontend env:
- `VITE_API_BASE_URL=https://api.yourdomain.com`

## 5. Useful Commands

```bash
npm run lint
npm run build
npm run dev:server
npm run dev:client
npm run db:generate
npm run db:push
```
