import { Router } from "express";
import { getPoultryModuleData } from "./service.js";
import { poultrySchemas } from "./validators.js";
import { registerCrudRoutes, serializeRecord } from "../../shared/moduleCrud.js";

export const createPoultryRouter = ({ prisma, requireAuth, logActivitySafe }) => {
  const router = Router();
  router.use(requireAuth);

  const serialize = (row, dateFields = []) => serializeRecord(row, dateFields);

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

  router.get("/dashboard", async (_req, res, next) => {
    try {
      res.json(await getPoultryModuleData(prisma));
    } catch (error) {
      next(error);
    }
  });

  router.get("/analytics", async (_req, res, next) => {
    try {
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
