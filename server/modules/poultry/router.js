import { Router } from "express";
import { getPoultryModuleData } from "./service.js";
import { poultrySchemas } from "./validators.js";
import { registerCrudRoutes, serializeRecord } from "../../shared/moduleCrud.js";

export const createPoultryRouter = ({ prisma, requireAuth, logActivitySafe }) => {
  const router = Router();
  router.use(requireAuth);

  const serialize = (row, dateFields = []) => serializeRecord(row, dateFields);
  const isAdmin = (user) => String(user?.role || "").toLowerCase() === "admin";
  const toManagerDashboardData = (data) => ({
    summary: {
      active_flocks: data.summary.active_flocks,
      total_live_birds: data.summary.total_live_birds,
      eggs_today: data.summary.eggs_today,
      mortality_today: data.summary.mortality_today,
      feed_consumed_today: data.summary.feed_consumed_today,
      active_houses: data.summary.active_houses,
      recent_health_alerts: data.summary.recent_health_alerts,
    },
    charts: {
      eggs_trend: data.charts.eggs_trend,
      mortality_trend: data.charts.mortality_trend,
      feed_trend: data.charts.feed_trend,
      egg_output_by_flock: data.charts.egg_output_by_flock,
    },
    analytics: {
      mortality_rate: data.analytics.mortality_rate,
      eggs_per_bird: data.analytics.eggs_per_bird,
      feed_per_bird: data.analytics.feed_per_bird,
      flock_performance: (data.analytics.flock_performance || []).map((row) => ({
        flock_id: row.flock_id,
        flock_code: row.flock_code,
        eggs: row.eggs,
        mortality: row.mortality,
        current_live_birds: row.current_live_birds,
      })),
    },
    reference: {
      houses: data.reference.houses,
      flocks: data.reference.flocks,
      daily_logs: data.reference.daily_logs,
      feed_logs: data.reference.feed_logs,
      health_logs: data.reference.health_logs,
    },
  });

  registerCrudRoutes({
    router,
    path: "/houses",
    label: "Poultry House",
    delegate: prisma.poultryHouse,
    createSchema: poultrySchemas.houses.create,
    updateSchema: poultrySchemas.houses.update,
    listOrderBy: { name: "asc" },
    serialize: (row) => serialize(row, poultrySchemas.houses.dateFields),
    describe: (row) => row.name,
    logActivitySafe,
  });

  registerCrudRoutes({
    router,
    path: "/flocks",
    label: "Poultry Flock",
    delegate: prisma.poultryFlock,
    createSchema: poultrySchemas.flocks.create,
    updateSchema: poultrySchemas.flocks.update,
    listOrderBy: { start_date: "desc" },
    include: { poultry_house: true },
    serialize: (row) => serialize(row, poultrySchemas.flocks.dateFields),
    describe: (row) => row.flock_code,
    logActivitySafe,
  });

  registerCrudRoutes({
    router,
    path: "/daily-logs",
    label: "Poultry Daily Log",
    delegate: prisma.poultryDailyLog,
    createSchema: poultrySchemas.dailyLogs.create,
    updateSchema: poultrySchemas.dailyLogs.update,
    listOrderBy: { log_date: "desc" },
    include: { flock: true },
    serialize: (row) => serialize(row, poultrySchemas.dailyLogs.dateFields),
    describe: (row) => `${row.flock?.flock_code || row.flock_id} ${row.log_date || ""}`.trim(),
    logActivitySafe,
  });

  registerCrudRoutes({
    router,
    path: "/feed-logs",
    label: "Poultry Feed Log",
    delegate: prisma.poultryFeedLog,
    createSchema: poultrySchemas.feedLogs.create,
    updateSchema: poultrySchemas.feedLogs.update,
    listOrderBy: { log_date: "desc" },
    include: { flock: true },
    serialize: (row) => serialize(row, poultrySchemas.feedLogs.dateFields),
    describe: (row) => `${row.flock?.flock_code || row.flock_id} ${row.feed_type || ""}`.trim(),
    logActivitySafe,
  });

  registerCrudRoutes({
    router,
    path: "/health-logs",
    label: "Poultry Health Log",
    delegate: prisma.poultryHealthLog,
    createSchema: poultrySchemas.healthLogs.create,
    updateSchema: poultrySchemas.healthLogs.update,
    listOrderBy: { log_date: "desc" },
    include: { flock: true },
    serialize: (row) => serialize(row, poultrySchemas.healthLogs.dateFields),
    describe: (row) => `${row.flock?.flock_code || row.flock_id} ${row.issue_type || ""}`.trim(),
    logActivitySafe,
  });

  registerCrudRoutes({
    router,
    path: "/sales",
    label: "Poultry Sale",
    delegate: prisma.poultrySale,
    createSchema: poultrySchemas.sales.create,
    updateSchema: poultrySchemas.sales.update,
    listOrderBy: { sale_date: "desc" },
    include: { flock: true },
    serialize: (row) => serialize(row, poultrySchemas.sales.dateFields),
    describe: (row) => `${row.sale_type || "sale"} ${row.flock?.flock_code || ""}`.trim(),
    logActivitySafe,
  });

  registerCrudRoutes({
    router,
    path: "/expenses",
    label: "Poultry Expense",
    delegate: prisma.poultryExpense,
    createSchema: poultrySchemas.expenses.create,
    updateSchema: poultrySchemas.expenses.update,
    listOrderBy: { expense_date: "desc" },
    include: { flock: true },
    serialize: (row) => serialize(row, poultrySchemas.expenses.dateFields),
    describe: (row) => `${row.category || "expense"} ${row.flock?.flock_code || ""}`.trim(),
    logActivitySafe,
  });

  router.get("/dashboard", async (req, res, next) => {
    try {
      const data = await getPoultryModuleData(prisma);
      res.json(isAdmin(req.user) ? data : toManagerDashboardData(data));
    } catch (error) {
      next(error);
    }
  });

  router.get("/analytics", async (req, res, next) => {
    try {
      if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin access required" });
      const data = await getPoultryModuleData(prisma);
      res.json({
        summary: data.summary,
        charts: data.charts,
        analytics: data.analytics,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
