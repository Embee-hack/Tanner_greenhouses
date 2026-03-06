import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";
import { randomUUID, randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || "dev-change-me";
const JWT_TTL = process.env.JWT_TTL || "30d";
const ROLE_ADMIN = "admin";
const ROLE_FARM_MANAGER = "farm_manager";
const CALENDAR_EVENT_ENTITY = "CalendarEvent";
const ACTIVITY_LOG_ENTITY = "ActivityLog";
const REMINDER_LOG_ENTITY = "EventReminderLog";
const INTERNAL_SERVER_ONLY_ENTITIES = new Set([ACTIVITY_LOG_ENTITY, REMINDER_LOG_ENTITY]);

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const SMTP_HOST = String(process.env.SMTP_HOST || "smtp.gmail.com").trim();
const SMTP_PORT = toPositiveNumber(process.env.SMTP_PORT, 465);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "true").toLowerCase() === "true";
const SMTP_USER = String(process.env.SMTP_USER || "").trim();
const SMTP_PASS = String(process.env.SMTP_PASS || "").trim();
const SMTP_FROM = String(process.env.SMTP_FROM || SMTP_USER).trim();
const EVENT_REMINDER_ENABLED = String(process.env.EVENT_REMINDER_ENABLED || "").toLowerCase() === "true";
const EVENT_REMINDER_LOOKAHEAD_HOURS = toPositiveNumber(process.env.EVENT_REMINDER_LOOKAHEAD_HOURS, 24);
const EVENT_REMINDER_CHECK_INTERVAL_MINUTES = toPositiveNumber(process.env.EVENT_REMINDER_CHECK_INTERVAL_MINUTES, 15);
const EVENT_REMINDER_TIMEZONE = String(
  process.env.EVENT_REMINDER_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
).trim();

const FARM_MANAGER_BLOCKED_WRITE_ENTITIES = new Set([
  "SalesRecord",
  "ExpenseRecord",
  "Worker",
  "WorkerRole",
  "User",
]);

const normalizeUserRole = (rawRole) =>
  String(rawRole || "").toLowerCase() === ROLE_ADMIN ? ROLE_ADMIN : ROLE_FARM_MANAGER;

const isAdmin = (user) => normalizeUserRole(user?.role) === ROLE_ADMIN;

const canReadEntity = (user, entity) => {
  if (entity === "User") return isAdmin(user);
  if (entity === REMINDER_LOG_ENTITY) return isAdmin(user);
  return true;
};

const canWriteEntity = (user, entity) => {
  if (isAdmin(user)) return true;
  return !FARM_MANAGER_BLOCKED_WRITE_ENTITIES.has(entity);
};

const sseClients = new Set();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(uploadsDir));

const isObject = (v) => v != null && typeof v === "object" && !Array.isArray(v);

const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  full_name: user.full_name,
  role: normalizeUserRole(user.role),
  profile_picture: user.profile_picture,
  created_date: user.created_date?.toISOString?.() || null,
  updated_date: user.updated_date?.toISOString?.() || null,
});

const toEntityOutput = (record) => {
  const data = isObject(record.data) ? record.data : {};
  return {
    ...data,
    id: record.id,
    created_date: data.created_date || record.created_at.toISOString(),
    updated_date: data.updated_date || record.updated_at.toISOString(),
  };
};

const signToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: normalizeUserRole(user.role),
    },
    JWT_SECRET,
    { expiresIn: JWT_TTL }
  );

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  if (typeof req.query.token === "string") return req.query.token;
  return null;
};

const requireAuth = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ error: "Missing auth token" });
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: "Invalid auth token" });
    req.user = user;
    next();
  } catch (_err) {
    res.status(401).json({ error: "Authentication required" });
  }
};

const requireAdmin = (req, res, next) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

const normalizeFilterValue = (raw) => {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
};

const matchesFilter = (item, filters) =>
  Object.entries(filters).every(([key, queryValue]) => {
    const value = item[key];
    const target = normalizeFilterValue(queryValue);
    if (target === null) return value == null || value === "";
    if (typeof value === "number") return value === Number(target);
    if (typeof value === "boolean") return value === Boolean(target);
    return String(value ?? "") === String(target ?? "");
  });

const sortItems = (items, sortParam) => {
  if (!sortParam) {
    return [...items].sort((a, b) => String(b.updated_date || b.created_date || "").localeCompare(String(a.updated_date || a.created_date || "")));
  }

  const desc = sortParam.startsWith("-");
  const key = desc ? sortParam.slice(1) : sortParam;
  const direction = desc ? -1 : 1;

  const normalize = (v) => {
    if (v == null) return null;
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    const asDate = Date.parse(v);
    if (!Number.isNaN(asDate) && key.includes("date")) return asDate;
    return String(v).toLowerCase();
  };

  return [...items].sort((a, b) => {
    const av = normalize(a[key]);
    const bv = normalize(b[key]);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av > bv) return direction;
    if (av < bv) return -direction;
    return 0;
  });
};

const sendSse = (res, data) => {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const broadcastEntityEvent = (event) => {
  for (const client of sseClients) {
    sendSse(client.res, event);
  }
};

const getPublicBaseUrl = (req) => {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  }
  const protocol = req.headers["x-forwarded-proto"]?.toString().split(",")[0] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${protocol}://${host}`;
};

const humanizeEntity = (entity) =>
  String(entity || "record")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();

const sanitizeText = (value, maxLen = 180) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
};

const getEntityLabel = (entity, data) => {
  const item = isObject(data) ? data : {};
  if (entity === CALENDAR_EVENT_ENTITY) return sanitizeText(item.title);
  const candidates = [
    item.title,
    item.name,
    item.full_name,
    item.email,
    item.code,
    item.category,
    item.incident_type,
    item.event_type,
    item.crop_type,
    item.buyer,
  ];
  return sanitizeText(candidates.find((v) => String(v || "").trim()));
};

const getEntityActionSummary = ({ action, entity, data }) => {
  const readableEntity = humanizeEntity(entity);
  const label = getEntityLabel(entity, data);
  if (action === "create") return `Created ${readableEntity}${label ? `: ${label}` : ""}`;
  if (action === "update") return `Updated ${readableEntity}${label ? `: ${label}` : ""}`;
  if (action === "delete") return `Deleted ${readableEntity}${label ? `: ${label}` : ""}`;
  return `${sanitizeText(action)} ${readableEntity}${label ? `: ${label}` : ""}`;
};

const toActivityActor = (user) => ({
  actor_user_id: user?.id || null,
  actor_email: user?.email || null,
  actor_name: user?.full_name || null,
  actor_role: user?.role ? normalizeUserRole(user.role) : null,
});

const logActivity = async ({
  action,
  entity,
  entityId = null,
  actor = null,
  summary = "",
  details = "",
  metadata = null,
  at = new Date(),
}) => {
  const id = randomUUID();
  const atIso = at instanceof Date ? at.toISOString() : new Date(at).toISOString();
  const payload = {
    id,
    action: sanitizeText(action, 60),
    entity: sanitizeText(entity, 80),
    entity_id: entityId || null,
    summary: sanitizeText(summary || `${action} ${entity}`),
    details: sanitizeText(details, 500),
    ...toActivityActor(actor),
    metadata: metadata && isObject(metadata) ? metadata : null,
    created_date: atIso,
    updated_date: atIso,
  };

  await prisma.entityRecord.create({
    data: {
      id,
      entity: ACTIVITY_LOG_ENTITY,
      data: payload,
    },
  });

  broadcastEntityEvent({ entity: ACTIVITY_LOG_ENTITY, type: "create", id, data: payload });
  return payload;
};

const logActivitySafe = async (payload) => {
  try {
    await logActivity(payload);
  } catch (error) {
    console.error("Failed to record activity log:", error);
  }
};

let mailTransport = null;
let reminderInterval = null;
let reminderRunPromise = null;

const hasEmailReminderConfig = () =>
  EVENT_REMINDER_ENABLED && Boolean(SMTP_USER && SMTP_PASS && SMTP_FROM);

const getMailTransport = () => {
  if (!mailTransport) {
    mailTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return mailTransport;
};

const parseCalendarEventDate = (rawDate) => {
  const text = String(rawDate || "").trim();
  if (!text) return null;

  // Calendar events are currently date-first, so date-only values are treated as local 09:00.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(year, month - 1, day, 9, 0, 0, 0);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCalendarEventDate = (rawDate) => {
  const text = String(rawDate || "").trim();
  const parsed = parseCalendarEventDate(text);
  if (!parsed) return text || "Unknown date";

  const options = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? { dateStyle: "full", timeZone: EVENT_REMINDER_TIMEZONE }
    : { dateStyle: "full", timeStyle: "short", timeZone: EVENT_REMINDER_TIMEZONE };

  try {
    return new Intl.DateTimeFormat("en-US", options).format(parsed);
  } catch (_err) {
    return parsed.toISOString();
  }
};

const buildReminderEmail = ({ adminName, event, greenhouseLabel, eventDateLabel, hoursUntil, appUrl }) => {
  const cleanTitle = String(event?.title || "Upcoming farm event").trim();
  const cleanType = String(event?.event_type || "other").trim();
  const description = String(event?.description || "").trim();
  const subject = `[Greenhouse] Upcoming event in ${hoursUntil}h: ${cleanTitle}`;
  const greetingName = adminName || "Admin";
  const locationLine = greenhouseLabel ? `Greenhouse: ${greenhouseLabel}` : "Greenhouse: All / N/A";
  const openAppLine = appUrl ? `Open dashboard: ${appUrl}` : "";

  const text = [
    `Hi ${greetingName},`,
    "",
    "An upcoming calendar event needs attention.",
    `Title: ${cleanTitle}`,
    `Type: ${cleanType}`,
    `Date: ${eventDateLabel}`,
    locationLine,
    description ? `Notes: ${description}` : "",
    openAppLine,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <p>Hi ${greetingName},</p>
      <p>An upcoming calendar event needs attention.</p>
      <table style="border-collapse: collapse; min-width: 320px;">
        <tr><td style="padding: 4px 10px 4px 0;"><strong>Title</strong></td><td>${cleanTitle}</td></tr>
        <tr><td style="padding: 4px 10px 4px 0;"><strong>Type</strong></td><td>${cleanType}</td></tr>
        <tr><td style="padding: 4px 10px 4px 0;"><strong>Date</strong></td><td>${eventDateLabel}</td></tr>
        <tr><td style="padding: 4px 10px 4px 0;"><strong>Greenhouse</strong></td><td>${greenhouseLabel || "All / N/A"}</td></tr>
      </table>
      ${description ? `<p><strong>Notes:</strong> ${description}</p>` : ""}
      ${appUrl ? `<p><a href="${appUrl}">Open dashboard</a></p>` : ""}
    </div>
  `;

  return { subject, text, html };
};

const sendReminderEmail = async ({ to, subject, text, html }) => {
  const transport = getMailTransport();
  await transport.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
};

const runEventReminderCycle = async ({ dryRun = false, reason = "scheduled", triggeredBy = null } = {}) => {
  if (!hasEmailReminderConfig()) {
    return {
      status: EVENT_REMINDER_ENABLED ? "missing_smtp_config" : "disabled",
      dry_run: dryRun,
      reason,
      message: EVENT_REMINDER_ENABLED
        ? "Set SMTP_USER, SMTP_PASS, and SMTP_FROM to enable reminders."
        : "Set EVENT_REMINDER_ENABLED=true to enable reminders.",
    };
  }

  if (reminderRunPromise) {
    return {
      status: "already_running",
      dry_run: dryRun,
      reason,
    };
  }

  reminderRunPromise = (async () => {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + EVENT_REMINDER_LOOKAHEAD_HOURS * 60 * 60 * 1000);

    const [admins, eventRows, greenhouseRows, reminderLogRows] = await Promise.all([
      prisma.user.findMany({ where: { role: ROLE_ADMIN }, orderBy: { created_date: "asc" } }),
      prisma.entityRecord.findMany({ where: { entity: CALENDAR_EVENT_ENTITY } }),
      prisma.entityRecord.findMany({ where: { entity: "Greenhouse" } }),
      prisma.entityRecord.findMany({ where: { entity: REMINDER_LOG_ENTITY } }),
    ]);

    const adminRecipients = admins
      .map((admin) => ({
        email: String(admin.email || "").trim().toLowerCase(),
        full_name: String(admin.full_name || "").trim(),
      }))
      .filter((admin) => admin.email.includes("@"));

    if (adminRecipients.length === 0) {
      return {
        status: "no_admin_recipients",
        dry_run: dryRun,
        reason,
        admins: 0,
        upcoming_events: 0,
      };
    }

    const greenhouseMap = new Map(
      greenhouseRows
        .map(toEntityOutput)
        .filter((item) => item?.id)
        .map((item) => [item.id, item])
    );

    const existingReminderKeys = new Set(
      reminderLogRows
        .map(toEntityOutput)
        .map((log) => String(log?.reminder_key || "").trim())
        .filter(Boolean)
    );

    const events = eventRows
      .map(toEntityOutput)
      .map((event) => ({
        ...event,
        _starts_at: parseCalendarEventDate(event.date),
      }))
      .filter((event) => event._starts_at && event._starts_at >= now && event._starts_at <= windowEnd)
      .sort((a, b) => a._starts_at.getTime() - b._starts_at.getTime());

    let skippedAlreadySent = 0;
    let consideredRecipients = 0;
    let attempted = 0;
    let wouldSend = 0;
    let sent = 0;
    const errors = [];
    const appUrl = allowedOrigins[0] || "";

    for (const event of events) {
      const dateLabel = formatCalendarEventDate(event.date);
      const greenhouse = greenhouseMap.get(event.greenhouse_id);
      const greenhouseLabel = greenhouse
        ? String(greenhouse.code || greenhouse.name || greenhouse.id)
        : "All / N/A";
      const hoursUntil = Math.max(0, Math.round((event._starts_at.getTime() - now.getTime()) / (60 * 60 * 1000)));

      for (const admin of adminRecipients) {
        const reminderKey = `${event.id}:${event.date}:${admin.email}:${EVENT_REMINDER_LOOKAHEAD_HOURS}`;
        if (existingReminderKeys.has(reminderKey)) {
          skippedAlreadySent += 1;
          continue;
        }

        consideredRecipients += 1;

        if (dryRun) {
          wouldSend += 1;
          continue;
        }

        const { subject, text, html } = buildReminderEmail({
          adminName: admin.full_name,
          event,
          greenhouseLabel,
          eventDateLabel: dateLabel,
          hoursUntil,
          appUrl,
        });

        attempted += 1;

        try {
          await sendReminderEmail({ to: admin.email, subject, text, html });
          sent += 1;

          const logId = randomUUID();
          const sentAt = new Date().toISOString();
          const logData = {
            id: logId,
            reminder_key: reminderKey,
            event_id: event.id,
            event_title: event.title || null,
            event_date: event.date || null,
            recipient_email: admin.email,
            created_date: sentAt,
            updated_date: sentAt,
            sent_at: sentAt,
            reason,
            triggered_by: triggeredBy,
          };

          await prisma.entityRecord.create({
            data: {
              id: logId,
              entity: REMINDER_LOG_ENTITY,
              data: logData,
            },
          });
          existingReminderKeys.add(reminderKey);
        } catch (error) {
          errors.push({
            event_id: event.id,
            event_title: event.title || null,
            recipient_email: admin.email,
            message: String(error?.message || "Failed to send reminder"),
          });
        }
      }
    }

    return {
      status: dryRun ? "dry_run" : errors.length > 0 ? "partial_success" : "ok",
      dry_run: dryRun,
      reason,
      now: now.toISOString(),
      window_end: windowEnd.toISOString(),
      lookahead_hours: EVENT_REMINDER_LOOKAHEAD_HOURS,
      admins: adminRecipients.length,
      total_events: eventRows.length,
      upcoming_events: events.length,
      considered_recipients: consideredRecipients,
      skipped_already_sent: skippedAlreadySent,
      attempted,
      would_send: dryRun ? wouldSend : 0,
      sent,
      errors,
    };
  })();

  try {
    return await reminderRunPromise;
  } finally {
    reminderRunPromise = null;
  }
};

const startEventReminderScheduler = () => {
  if (!EVENT_REMINDER_ENABLED) {
    console.log("Event reminders are disabled. Set EVENT_REMINDER_ENABLED=true to enable.");
    return;
  }
  if (!SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    console.warn("Event reminders enabled, but SMTP config is incomplete. Scheduler was not started.");
    return;
  }
  if (reminderInterval) return;

  const intervalMs = EVENT_REMINDER_CHECK_INTERVAL_MINUTES * 60 * 1000;

  setTimeout(() => {
    runEventReminderCycle({ reason: "startup" })
      .then((result) => {
        if (result?.sent) {
          console.log(`Event reminders startup run: sent ${result.sent} email(s).`);
        }
      })
      .catch((error) => {
        console.error("Failed startup reminder run:", error);
      });
  }, 5000);

  reminderInterval = setInterval(() => {
    runEventReminderCycle({ reason: "interval" }).catch((error) => {
      console.error("Scheduled reminder run failed:", error);
    });
  }, intervalMs);

  console.log(
    `Event reminders enabled: checking every ${EVENT_REMINDER_CHECK_INTERVAL_MINUTES} minute(s) for events in next ${EVENT_REMINDER_LOOKAHEAD_HOURS} hour(s).`
  );
};

app.get("/api/health", async (_req, res) => {
  const userCount = await prisma.user.count();
  res.json({ ok: true, users: userCount, timestamp: new Date().toISOString() });
});

app.get("/api/auth/bootstrap", async (_req, res) => {
  const count = await prisma.user.count();
  res.json({ has_users: count > 0 });
});

app.post("/api/auth/setup", async (req, res) => {
  const count = await prisma.user.count();
  if (count > 0) return res.status(409).json({ error: "Setup already completed" });

  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const fullName = String(req.body?.full_name || "").trim() || null;

  if (!email || !email.includes("@")) return res.status(400).json({ error: "Valid email is required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      password_hash: passwordHash,
      full_name: fullName,
      role: ROLE_ADMIN,
    },
  });

  const token = signToken(user);
  await logActivitySafe({
    action: "setup",
    entity: "Auth",
    entityId: user.id,
    actor: user,
    summary: "Completed first-time setup",
    details: `Initial admin account created: ${user.email}`,
  });
  res.status(201).json({ token, user: toPublicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken(user);
  await logActivitySafe({
    action: "login",
    entity: "Auth",
    entityId: user.id,
    actor: user,
    summary: "Signed in",
    details: `User signed in: ${user.email}`,
  });
  res.json({ token, user: toPublicUser(user) });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  res.json(toPublicUser(req.user));
});

app.patch("/api/auth/me", requireAuth, async (req, res) => {
  const data = {};
  if (typeof req.body?.profile_picture === "string" || req.body?.profile_picture === null) {
    data.profile_picture = req.body.profile_picture;
  }
  if (typeof req.body?.full_name === "string" || req.body?.full_name === null) {
    data.full_name = req.body.full_name;
  }
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
  });
  await logActivitySafe({
    action: "update",
    entity: "UserProfile",
    entityId: req.user.id,
    actor: req.user,
    summary: "Updated own profile",
    details: "Profile details changed",
  });
  res.json(toPublicUser(user));
});

app.post("/api/auth/logout", requireAuth, (_req, res) => {
  logActivitySafe({
    action: "logout",
    entity: "Auth",
    entityId: _req.user.id,
    actor: _req.user,
    summary: "Signed out",
    details: `User signed out: ${_req.user.email}`,
  });
  res.json({ ok: true });
});

app.get("/api/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { created_date: "desc" } });
  res.json(users.map(toPublicUser));
});

app.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const fullName = String(req.body?.full_name || "").trim() || null;
  const role = normalizeUserRole(req.body?.role);
  const plainPassword = String(req.body?.password || "");

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" });
  }
  if (plainPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "User with this email already exists" });

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      password_hash: await bcrypt.hash(plainPassword, 10),
      full_name: fullName,
      role,
    },
  });

  const payload = toPublicUser(user);
  broadcastEntityEvent({ entity: "User", type: "create", id: payload.id, data: payload });
  await logActivitySafe({
    action: "create",
    entity: "User",
    entityId: payload.id,
    actor: req.user,
    summary: getEntityActionSummary({ action: "create", entity: "User", data: payload }),
    details: `Created user ${payload.email} with role ${payload.role}`,
    metadata: { role: payload.role },
  });
  res.status(201).json({ user: payload, message: "User created successfully." });
});

app.post("/api/users/invite", requireAuth, requireAdmin, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const role = normalizeUserRole(req.body?.role);

  if (!email || !email.includes("@")) return res.status(400).json({ error: "Valid email is required" });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "User with this email already exists" });

  const temporaryPassword = randomBytes(8).toString("base64url");
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  const fullName = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      password_hash: passwordHash,
      full_name: fullName,
      role,
    },
  });

  await logActivitySafe({
    action: "invite",
    entity: "User",
    entityId: user.id,
    actor: req.user,
    summary: `Invited user: ${user.email}`,
    details: `Generated temporary password for ${user.email}`,
    metadata: { role: normalizeUserRole(user.role) },
  });

  res.status(201).json({
    user: toPublicUser(user),
    temporary_password: temporaryPassword,
    message: "User invited. Share the temporary password securely.",
  });
});

app.get("/api/entities/:entity", requireAuth, async (req, res) => {
  const { entity } = req.params;
  const sort = typeof req.query.sort === "string" ? req.query.sort : undefined;
  const limit = Number(req.query.limit) || undefined;

  if (!canReadEntity(req.user, entity)) {
    return res.status(403).json({ error: "You do not have permission to view this data" });
  }

  if (entity === "User") {
    const users = await prisma.user.findMany({ orderBy: { created_date: "desc" } });
    const sorted = sortItems(users.map(toPublicUser), sort);
    return res.json(limit ? sorted.slice(0, limit) : sorted);
  }

  const rows = await prisma.entityRecord.findMany({ where: { entity } });
  const items = rows.map(toEntityOutput);
  const sorted = sortItems(items, sort);
  res.json(limit ? sorted.slice(0, limit) : sorted);
});

app.get("/api/entities/:entity/filter", requireAuth, async (req, res) => {
  const { entity } = req.params;
  const filters = { ...req.query };
  delete filters.sort;
  delete filters.limit;

  if (!canReadEntity(req.user, entity)) {
    return res.status(403).json({ error: "You do not have permission to view this data" });
  }

  if (entity === "User") {
    const users = await prisma.user.findMany({ orderBy: { created_date: "desc" } });
    return res.json(users.map(toPublicUser).filter((u) => matchesFilter(u, filters)));
  }

  const rows = await prisma.entityRecord.findMany({ where: { entity } });
  const items = rows.map(toEntityOutput);
  res.json(items.filter((item) => matchesFilter(item, filters)));
});

app.post("/api/entities/:entity", requireAuth, async (req, res) => {
  const { entity } = req.params;

  if (INTERNAL_SERVER_ONLY_ENTITIES.has(entity)) {
    return res.status(403).json({ error: `${entity} is managed internally by the server` });
  }

  if (!canWriteEntity(req.user, entity)) {
    return res.status(403).json({ error: "You do not have permission to create this record" });
  }

  if (entity === "User") {
    if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin access required" });
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || randomBytes(8).toString("base64url"));
    const role = normalizeUserRole(req.body?.role);
    const fullName = String(req.body?.full_name || "").trim() || null;
    if (!email || !email.includes("@")) return res.status(400).json({ error: "Valid email is required" });
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "User with this email already exists" });
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        password_hash: await bcrypt.hash(password, 10),
        full_name: fullName,
        role,
      },
    });
    const payload = toPublicUser(user);
    broadcastEntityEvent({ entity, type: "create", id: payload.id, data: payload });
    await logActivitySafe({
      action: "create",
      entity,
      entityId: payload.id,
      actor: req.user,
      summary: getEntityActionSummary({ action: "create", entity, data: payload }),
      details: `Created user ${payload.email} with role ${payload.role}`,
      metadata: { role: payload.role },
    });
    return res.status(201).json(payload);
  }

  const input = isObject(req.body) ? req.body : {};
  const nowIso = new Date().toISOString();
  const id = randomUUID();
  const data = {
    ...input,
    id,
    created_date: input.created_date || nowIso,
    updated_date: nowIso,
    created_by: input.created_by || req.user.email,
  };

  await prisma.entityRecord.create({
    data: { id, entity, data },
  });

  broadcastEntityEvent({ entity, type: "create", id, data });
  await logActivitySafe({
    action: "create",
    entity,
    entityId: id,
    actor: req.user,
    summary: getEntityActionSummary({ action: "create", entity, data }),
    details: `${humanizeEntity(entity)} record created`,
  });
  res.status(201).json(data);
});

app.patch("/api/entities/:entity/:id", requireAuth, async (req, res) => {
  const { entity, id } = req.params;

  if (INTERNAL_SERVER_ONLY_ENTITIES.has(entity)) {
    return res.status(403).json({ error: `${entity} is managed internally by the server` });
  }

  if (!canWriteEntity(req.user, entity)) {
    return res.status(403).json({ error: "You do not have permission to update this record" });
  }

  if (entity === "User") {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "User not found" });
    if (!isAdmin(req.user) && req.user.id !== id) return res.status(403).json({ error: "Forbidden" });
    const patch = isObject(req.body) ? req.body : {};
    const data = {};
    if (typeof patch.full_name === "string" || patch.full_name === null) data.full_name = patch.full_name;
    if (typeof patch.profile_picture === "string" || patch.profile_picture === null) data.profile_picture = patch.profile_picture;
    if (isAdmin(req.user) && typeof patch.role === "string") data.role = normalizeUserRole(patch.role);
    const updated = await prisma.user.update({ where: { id }, data });
    const payload = toPublicUser(updated);
    broadcastEntityEvent({ entity, type: "update", id, data: payload });
    await logActivitySafe({
      action: "update",
      entity,
      entityId: id,
      actor: req.user,
      summary: getEntityActionSummary({ action: "update", entity, data: payload }),
      details: `Updated user ${payload.email}`,
      metadata: { role: payload.role },
    });
    return res.json(payload);
  }

  const existing = await prisma.entityRecord.findUnique({ where: { id } });
  if (!existing || existing.entity !== entity) return res.status(404).json({ error: `${entity} record not found` });

  const currentData = isObject(existing.data) ? existing.data : {};
  const patch = isObject(req.body) ? req.body : {};
  const nowIso = new Date().toISOString();
  const merged = {
    ...currentData,
    ...patch,
    id,
    created_date: currentData.created_date || existing.created_at.toISOString(),
    updated_date: nowIso,
    updated_by: req.user.email,
  };

  await prisma.entityRecord.update({
    where: { id },
    data: { data: merged },
  });

  broadcastEntityEvent({ entity, type: "update", id, data: merged });
  await logActivitySafe({
    action: "update",
    entity,
    entityId: id,
    actor: req.user,
    summary: getEntityActionSummary({ action: "update", entity, data: merged }),
    details: `${humanizeEntity(entity)} record updated`,
  });
  res.json(merged);
});

app.delete("/api/entities/:entity/:id", requireAuth, async (req, res) => {
  const { entity, id } = req.params;

  if (INTERNAL_SERVER_ONLY_ENTITIES.has(entity)) {
    return res.status(403).json({ error: `${entity} is managed internally by the server` });
  }

  if (!canWriteEntity(req.user, entity)) {
    return res.status(403).json({ error: "You do not have permission to delete this record" });
  }

  if (entity === "User") {
    if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin access required" });
    if (req.user.id === id) return res.status(400).json({ error: "You cannot delete your own user" });
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "User not found" });
    await prisma.user.delete({ where: { id } });
    const payload = toPublicUser(existing);
    broadcastEntityEvent({ entity, type: "delete", id, data: payload });
    await logActivitySafe({
      action: "delete",
      entity,
      entityId: id,
      actor: req.user,
      summary: getEntityActionSummary({ action: "delete", entity, data: payload }),
      details: `Deleted user ${payload.email}`,
      metadata: { role: payload.role },
    });
    return res.json({ ok: true });
  }

  const existing = await prisma.entityRecord.findUnique({ where: { id } });
  if (!existing || existing.entity !== entity) return res.status(404).json({ error: `${entity} record not found` });
  await prisma.entityRecord.delete({ where: { id } });
  const data = toEntityOutput(existing);
  broadcastEntityEvent({ entity, type: "delete", id, data });
  await logActivitySafe({
    action: "delete",
    entity,
    entityId: id,
    actor: req.user,
    summary: getEntityActionSummary({ action: "delete", entity, data }),
    details: `${humanizeEntity(entity)} record deleted`,
  });
  res.json({ ok: true });
});

app.post("/api/upload", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const baseUrl = getPublicBaseUrl(req);
  const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
  await logActivitySafe({
    action: "upload",
    entity: "File",
    entityId: req.file.filename,
    actor: req.user,
    summary: `Uploaded file: ${req.file.originalname || req.file.filename}`,
    details: `Stored as ${req.file.filename}`,
    metadata: {
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      url: fileUrl,
    },
  });
  res.json({ file_url: fileUrl });
});

let fxCache = { timestamp: 0, rates: null };
const FX_TTL_MS = 60 * 60 * 1000;
const FX_FALLBACK = {
  USD: 0.00065,
  EUR: 0.0006,
  GBP: 0.0005,
};

const getFxRates = async () => {
  if (fxCache.rates && Date.now() - fxCache.timestamp < FX_TTL_MS) return fxCache.rates;
  const response = await fetch("https://open.er-api.com/v6/latest/NGN");
  if (!response.ok) throw new Error(`FX upstream failed with ${response.status}`);
  const payload = await response.json();
  if (!payload?.rates) throw new Error("FX upstream returned invalid payload");
  fxCache = { timestamp: Date.now(), rates: payload.rates };
  return payload.rates;
};

app.get("/api/fx", async (req, res) => {
  const to = String(req.query.to || "USD").toUpperCase();
  try {
    const rates = await getFxRates();
    if (!rates[to]) return res.status(404).json({ error: `Unsupported target currency: ${to}` });
    return res.json({ base: "NGN", to, rate: rates[to], source: "open.er-api" });
  } catch (error) {
    if (!FX_FALLBACK[to]) return res.status(500).json({ error: "FX service unavailable" });
    return res.json({ base: "NGN", to, rate: FX_FALLBACK[to], source: "fallback" });
  }
});

app.post("/api/reminders/run", requireAuth, requireAdmin, async (req, res) => {
  const dryRun = Boolean(req.body?.dry_run);
  const result = await runEventReminderCycle({
    dryRun,
    reason: "manual",
    triggeredBy: req.user.email,
  });
  await logActivitySafe({
    action: dryRun ? "dry_run" : "run",
    entity: "EventReminder",
    entityId: null,
    actor: req.user,
    summary: dryRun ? "Ran reminder check (dry run)" : "Ran reminder check",
    details: `Upcoming events: ${result?.upcoming_events || 0}, sent: ${result?.sent || 0}`,
    metadata: {
      dry_run: dryRun,
      status: result?.status,
      upcoming_events: result?.upcoming_events || 0,
      sent: result?.sent || 0,
    },
  });
  res.json(result);
});

app.post("/api/reminders/test-email", requireAuth, requireAdmin, async (req, res) => {
  if (!EVENT_REMINDER_ENABLED) {
    return res.status(400).json({
      error: "Event reminders are disabled. Set EVENT_REMINDER_ENABLED=true first.",
    });
  }
  if (!SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    return res.status(400).json({
      error: "Missing SMTP config. Set SMTP_USER, SMTP_PASS, and SMTP_FROM.",
    });
  }

  const recipient = String(req.body?.to || req.user.email || "")
    .trim()
    .toLowerCase();
  if (!recipient.includes("@")) {
    return res.status(400).json({ error: "A valid recipient email is required." });
  }

  const now = new Date();
  await sendReminderEmail({
    to: recipient,
    subject: "[Greenhouse] SMTP reminder test",
    text: [
      "Your Gmail SMTP reminder setup is working.",
      "",
      `Sent at: ${now.toISOString()}`,
      `Timezone: ${EVENT_REMINDER_TIMEZONE}`,
      `Lookahead hours: ${EVENT_REMINDER_LOOKAHEAD_HOURS}`,
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <p>Your Gmail SMTP reminder setup is working.</p>
        <ul>
          <li>Sent at: ${now.toISOString()}</li>
          <li>Timezone: ${EVENT_REMINDER_TIMEZONE}</li>
          <li>Lookahead hours: ${EVENT_REMINDER_LOOKAHEAD_HOURS}</li>
        </ul>
      </div>
    `,
  });

  await logActivitySafe({
    action: "test_email",
    entity: "EventReminder",
    entityId: null,
    actor: req.user,
    summary: `Sent reminder test email to ${recipient}`,
    details: "SMTP test endpoint executed",
    metadata: { recipient },
  });

  res.json({ ok: true, to: recipient, sent_at: now.toISOString() });
});

app.get("/api/events", async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ error: "Missing auth token" });
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: "Invalid auth token" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const client = { res, userId: user.id };
    sseClients.add(client);
    sendSse(res, { type: "connected", at: new Date().toISOString() });

    const heartbeat = setInterval(() => {
      sendSse(res, { type: "ping", at: new Date().toISOString() });
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      sseClients.delete(client);
    });
  } catch (_err) {
    res.status(401).json({ error: "Authentication required" });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const start = async () => {
  try {
    await prisma.$connect();
    startEventReminderScheduler();
    app.listen(PORT, () => {
      console.log(`API listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start API server:", error);
    process.exit(1);
  }
};

start();
