import { z } from "zod";

const trimText = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const numberFromValue = (value) => {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const parseDateInput = (value) => {
  if (value === "" || value == null) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "invalid_date" : parsed;
};

export const requiredText = (label, max = 200) =>
  z.preprocess(
    (value) => trimText(value),
    z.string({ required_error: `${label} is required` }).min(1, `${label} is required`).max(max)
  );

export const optionalText = (max = 1000) =>
  z.preprocess((value) => trimText(value), z.string().max(max).nullable());

export const requiredInt = (label, min = 0) =>
  z.preprocess(
    (value) => numberFromValue(value),
    z.number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` })
      .int(`${label} must be a whole number`)
      .min(min, `${label} must be at least ${min}`)
  );

export const optionalInt = (min = 0) =>
  z.preprocess(
    (value) => numberFromValue(value),
    z.number({ invalid_type_error: `Value must be a number` }).int().min(min).nullable()
  );

export const requiredFloat = (label, min = 0) =>
  z.preprocess(
    (value) => numberFromValue(value),
    z.number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` }).min(
      min,
      `${label} must be at least ${min}`
    )
  );

export const optionalFloat = (min = 0) =>
  z.preprocess(
    (value) => numberFromValue(value),
    z.number({ invalid_type_error: `Value must be a number` }).min(min).nullable()
  );

export const requiredDate = (label) =>
  z.preprocess(
    (value) => parseDateInput(value),
    z.date({ required_error: `${label} is required`, invalid_type_error: `${label} must be a valid date` })
  );

export const optionalDate = () =>
  z.preprocess(
    (value) => parseDateInput(value),
    z.date({ invalid_type_error: "Must be a valid date" }).nullable()
  );

export const optionalId = () =>
  z.preprocess((value) => trimText(value), z.string().min(1).nullable());

export const enumText = (values, label) =>
  z.preprocess(
    (value) => {
      const text = trimText(value);
      return text ? text.toLowerCase() : text;
    },
    z.enum(values, { errorMap: () => ({ message: `${label} must be one of: ${values.join(", ")}` }) })
  );

export const optionalEnumText = (values, label) =>
  z.preprocess(
    (value) => {
      const text = trimText(value);
      return text ? text.toLowerCase() : null;
    },
    z.enum(values, { errorMap: () => ({ message: `${label} must be one of: ${values.join(", ")}` }) }).nullable()
  );

export const formatDateOnly = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : null;

export const serializeRecord = (record, dateOnlyFields = []) => {
  if (record == null || typeof record !== "object") return record;

  const dateSet = new Set(dateOnlyFields);
  const output = {};

  Object.entries(record).forEach(([key, value]) => {
    if (value instanceof Date) {
      output[key] = dateSet.has(key) ? formatDateOnly(value) : value.toISOString();
      return;
    }

    if (Array.isArray(value)) {
      output[key] = value.map((item) => serializeRecord(item));
      return;
    }

    if (value && typeof value === "object") {
      output[key] = serializeRecord(value);
      return;
    }

    output[key] = value;
  });

  return output;
};

export const sendValidationError = (res, error) => {
  const firstIssue = error?.issues?.[0];
  res.status(400).json({
    error: firstIssue?.message || "Invalid request payload",
    issues: (error?.issues || []).map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
};

const handleCrudError = (error, res, label) => {
  if (error?.code === "P2002") {
    res.status(409).json({ error: `${label} already exists with this value` });
    return true;
  }

  if (error?.code === "P2003") {
    res.status(409).json({ error: `Cannot delete ${label.toLowerCase()} while related records still exist` });
    return true;
  }

  if (error?.code === "P2025") {
    res.status(404).json({ error: `${label} not found` });
    return true;
  }

  return false;
};

const buildActivitySummary = (action, label, value) => {
  const suffix = value ? `: ${value}` : "";
  if (action === "create") return `Created ${label}${suffix}`;
  if (action === "update") return `Updated ${label}${suffix}`;
  if (action === "delete") return `Deleted ${label}${suffix}`;
  return `${action} ${label}${suffix}`;
};

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one record to delete"),
});

export const registerCrudRoutes = ({
  router,
  path,
  label,
  delegate,
  createSchema,
  updateSchema,
  buildCreateData = (input) => input,
  buildUpdateData = (input) => input,
  include,
  listOrderBy,
  serialize = (row) => row,
  describe = (row) => row?.name || row?.code || row?.title || row?.id,
  logActivitySafe,
}) => {
  router.get(path, async (_req, res, next) => {
    try {
      const rows = await delegate.findMany({
        orderBy: listOrderBy,
        include,
      });
      res.json(rows.map((row) => serialize(row)));
    } catch (error) {
      next(error);
    }
  });

  router.get(`${path}/:id`, async (req, res, next) => {
    try {
      const row = await delegate.findUnique({
        where: { id: req.params.id },
        include,
      });
      if (!row) {
        return res.status(404).json({ error: `${label} not found` });
      }
      res.json(serialize(row));
    } catch (error) {
      next(error);
    }
  });

  router.post(path, async (req, res, next) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    try {
      const created = await delegate.create({
        data: buildCreateData(parsed.data),
        include,
      });
      const output = serialize(created);
      await logActivitySafe?.({
        action: "create",
        entity: label,
        entityId: output.id,
        actor: req.user,
        summary: buildActivitySummary("create", label, describe(output)),
        details: `${label} created`,
      });
      res.status(201).json(output);
    } catch (error) {
      if (handleCrudError(error, res, label)) return;
      next(error);
    }
  });

  router.post(`${path}/bulk-delete`, async (req, res, next) => {
    const parsed = bulkDeleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    try {
      const rows = await delegate.findMany({
        where: { id: { in: parsed.data.ids } },
        include,
      });

      if (rows.length === 0) {
        return res.status(404).json({ error: `${label} not found` });
      }

      await delegate.deleteMany({
        where: { id: { in: rows.map((row) => row.id) } },
      });

      const deletedRows = rows.map((row) => serialize(row));
      await logActivitySafe?.({
        action: "bulk_delete",
        entity: label,
        actor: req.user,
        summary: `Deleted ${deletedRows.length} ${label}${deletedRows.length === 1 ? "" : "s"}`,
        details: `${label} records deleted in bulk`,
        metadata: {
          count: deletedRows.length,
          ids: deletedRows.map((row) => row.id),
        },
      });

      res.json({ ok: true, count: deletedRows.length, ids: deletedRows.map((row) => row.id) });
    } catch (error) {
      if (handleCrudError(error, res, label)) return;
      next(error);
    }
  });

  router.patch(`${path}/:id`, async (req, res, next) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    try {
      const updated = await delegate.update({
        where: { id: req.params.id },
        data: buildUpdateData(parsed.data),
        include,
      });
      const output = serialize(updated);
      await logActivitySafe?.({
        action: "update",
        entity: label,
        entityId: output.id,
        actor: req.user,
        summary: buildActivitySummary("update", label, describe(output)),
        details: `${label} updated`,
      });
      res.json(output);
    } catch (error) {
      if (handleCrudError(error, res, label)) return;
      next(error);
    }
  });

  router.delete(`${path}/:id`, async (req, res, next) => {
    try {
      const existing = await delegate.findUnique({ where: { id: req.params.id }, include });
      if (!existing) {
        return res.status(404).json({ error: `${label} not found` });
      }
      await delegate.delete({ where: { id: req.params.id } });
      const output = serialize(existing);
      await logActivitySafe?.({
        action: "delete",
        entity: label,
        entityId: output.id,
        actor: req.user,
        summary: buildActivitySummary("delete", label, describe(output)),
        details: `${label} deleted`,
      });
      res.json({ ok: true });
    } catch (error) {
      if (handleCrudError(error, res, label)) return;
      next(error);
    }
  });
};
