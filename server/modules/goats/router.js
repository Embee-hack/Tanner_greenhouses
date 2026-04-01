import { Router } from "express";
import { getGoatModuleData } from "./service.js";
import { goatSchemas } from "./validators.js";
import { registerCrudRoutes, serializeRecord } from "../../shared/moduleCrud.js";

export const createGoatRouter = ({ prisma, requireAuth, logActivitySafe }) => {
  const router = Router();
  router.use(requireAuth);

  const serialize = (row, dateFields = []) => serializeRecord(row, dateFields);

  registerCrudRoutes({
    router,
    path: "/pens",
    label: "Goat Pen",
    delegate: prisma.goatPen,
    createSchema: goatSchemas.pens.create,
    updateSchema: goatSchemas.pens.update,
    listOrderBy: { name: "asc" },
    serialize: (row) => serialize(row, goatSchemas.pens.dateFields),
    describe: (row) => row.name,
    logActivitySafe,
  });

  registerCrudRoutes({
    router,
    path: "/registry",
    label: "Goat",
    delegate: prisma.goat,
    createSchema: goatSchemas.goats.create,
    updateSchema: goatSchemas.goats.update,
    listOrderBy: { created_at: "desc" },
    include: { pen: true },
    serialize: (row) => serialize(row, goatSchemas.goats.dateFields),
    describe: (row) => row.tag_number,
    logActivitySafe,
  });

  registerCrudRoutes({
    router,
    path: "/breeding",
    label: "Goat Breeding Log",
    delegate: prisma.goatBreedingLog,
    createSchema: goatSchemas.breeding.create,
    updateSchema: goatSchemas.breeding.update,
    listOrderBy: { mating_date: "desc" },
    include: { doe_goat: true, buck_goat: true },
    serialize: (row) => serialize(row, goatSchemas.breeding.dateFields),
    describe: (row) => `${row.doe_goat?.tag_number || row.doe_goat_id}`.trim(),
    logActivitySafe,
  });

  registerCrudRoutes({
    router,
    path: "/health-logs",
    label: "Goat Health Log",
    delegate: prisma.goatHealthLog,
    createSchema: goatSchemas.health.create,
    updateSchema: goatSchemas.health.update,
    listOrderBy: { log_date: "desc" },
    include: { goat: true },
    serialize: (row) => serialize(row, goatSchemas.health.dateFields),
    describe: (row) => `${row.goat?.tag_number || row.goat_id} ${row.issue_type || ""}`.trim(),
    logActivitySafe,
  });

  registerCrudRoutes({
    router,
    path: "/weight-logs",
    label: "Goat Weight Log",
    delegate: prisma.goatWeightLog,
    createSchema: goatSchemas.weights.create,
    updateSchema: goatSchemas.weights.update,
    listOrderBy: { log_date: "desc" },
    include: { goat: true },
    serialize: (row) => serialize(row, goatSchemas.weights.dateFields),
    describe: (row) => `${row.goat?.tag_number || row.goat_id} ${row.weight || ""}`.trim(),
    logActivitySafe,
  });

  registerCrudRoutes({
    router,
    path: "/feed-logs",
    label: "Goat Feed Log",
    delegate: prisma.goatFeedLog,
    createSchema: goatSchemas.feed.create,
    updateSchema: goatSchemas.feed.update,
    listOrderBy: { log_date: "desc" },
    include: { pen: true },
    buildCreateData: (input) => ({
      ...input,
      goat_id: null,
    }),
    buildUpdateData: (input) => ({
      ...input,
      goat_id: null,
    }),
    serialize: (row) => serialize(row, goatSchemas.feed.dateFields),
    describe: (row) => `${row.pen?.name || row.pen_id || ""} ${row.feed_type || ""}`.trim(),
    logActivitySafe,
  });

  registerCrudRoutes({
    router,
    path: "/sales",
    label: "Goat Sale",
    delegate: prisma.goatSale,
    createSchema: goatSchemas.sales.create,
    updateSchema: goatSchemas.sales.update,
    listOrderBy: { sale_date: "desc" },
    include: { goat: true },
    serialize: (row) => serialize(row, goatSchemas.sales.dateFields),
    describe: (row) => `${row.goat?.tag_number || row.goat_id}`.trim(),
    logActivitySafe,
  });

  registerCrudRoutes({
    router,
    path: "/expenses",
    label: "Goat Expense",
    delegate: prisma.goatExpense,
    createSchema: goatSchemas.expenses.create,
    updateSchema: goatSchemas.expenses.update,
    listOrderBy: { expense_date: "desc" },
    include: { goat: true, pen: true },
    serialize: (row) => serialize(row, goatSchemas.expenses.dateFields),
    describe: (row) => `${row.category || "expense"} ${row.goat?.tag_number || row.pen?.name || ""}`.trim(),
    logActivitySafe,
  });

  router.get("/dashboard", async (_req, res, next) => {
    try {
      res.json(await getGoatModuleData(prisma));
    } catch (error) {
      next(error);
    }
  });

  router.get("/analytics", async (_req, res, next) => {
    try {
      const data = await getGoatModuleData(prisma);
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
