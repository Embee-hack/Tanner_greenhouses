# Deployment Guide (Neon + Render)

This app now runs as a full self-hosted stack:
- `frontend` (static Vite build)
- `api` (Node/Express service)
- `database` (Neon Postgres)

## 1. Create Neon Database

1. Create a Neon project and database.
2. Copy the connection string.
3. Use it as `DATABASE_URL` in the Render API service.

## 2. Deploy API Service on Render

Use a Node web service with:
- Build command: `npm ci && npm run db:generate`
- Start command: `npm run start:server`

Set env vars:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_TTL=30d` (optional)
- `CLIENT_ORIGIN=https://<your-frontend-domain>`
- `PUBLIC_BASE_URL=https://<your-api-domain>`
- `EVENT_REMINDER_ENABLED=true` (for email reminders)
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=<your-gmail-address>`
- `SMTP_PASS=<gmail-app-password>`
- `SMTP_FROM=<your-gmail-address>`
- `EVENT_REMINDER_LOOKAHEAD_HOURS=24` (optional)
- `EVENT_REMINDER_CHECK_INTERVAL_MINUTES=15` (optional)
- `EVENT_REMINDER_TIMEZONE=Africa/Lagos` (optional)

`npm run start:server` runs `prisma db push` before server start, so schema is created/updated automatically.

## 3. Deploy Frontend Service on Render

Use a Static Site service with:
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- SPA rewrite: `/* -> /index.html`

Set env var:
- `VITE_API_BASE_URL=https://<your-api-domain>`

## 4. First Admin Setup

On first launch with an empty DB:
1. Open frontend URL.
2. App shows setup screen.
3. Create first admin account (email/password).
4. Login and continue normally.

Additional users can then be created from the `Users` page by an admin and assigned either:
- `admin`
- `farm_manager`

## 5. Custom Domains

Recommended:
- Frontend: `app.yourdomain.com`
- API: `api.yourdomain.com`

After DNS + TLS are active:
- Set `CLIENT_ORIGIN` to the frontend domain.
- Set `PUBLIC_BASE_URL` and `VITE_API_BASE_URL` to the API domain.

## 6. Data Model

Storage is split into:
- `User` table for auth/users.
- `EntityRecord` table for app entities (`Greenhouse`, `CropCycle`, `HarvestRecord`, etc.) as JSON records.

This keeps existing frontend behavior while staying independent from Base44.

## 7. Gmail Notes

For Gmail SMTP to work:
1. Enable 2-Step Verification on the Gmail account.
2. Generate an App Password in Google Account security settings.
3. Use that App Password as `SMTP_PASS` (not your normal Gmail password).

Optional verification endpoints (admin auth required):
- `POST /api/reminders/test-email` to verify SMTP delivery.
- `POST /api/reminders/run` to manually run upcoming-event reminder checks (`{"dry_run": true}` supported).
