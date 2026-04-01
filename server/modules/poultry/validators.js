import { z } from "zod";
import {
  enumText,
  optionalDate,
  optionalEnumText,
  optionalFloat,
  optionalId,
  optionalInt,
  optionalText,
  requiredDate,
  requiredFloat,
  requiredInt,
  requiredText,
} from "../../shared/moduleCrud.js";

const houseSchema = z.object({
  name: requiredText("House name/code"),
  type: optionalText(120),
  capacity: optionalInt(0),
  status: enumText(["active", "inactive", "maintenance"], "Status"),
  notes: optionalText(1000),
});

const flockSchema = z.object({
  poultry_house_id: requiredText("Poultry house"),
  flock_code: requiredText("Flock code", 120),
  bird_type: requiredText("Bird type", 120),
  breed: requiredText("Breed", 120),
  start_date: requiredDate("Arrival/start date"),
  initial_bird_count: requiredInt("Initial bird count", 0),
  source: optionalText(160),
  purpose: optionalEnumText(["egg", "meat", "breeding"], "Purpose"),
  status: optionalEnumText(["active", "completed", "inactive"], "Status"),
  notes: optionalText(1000),
});

const dailyLogSchema = z.object({
  flock_id: requiredText("Flock"),
  log_date: requiredDate("Date"),
  eggs_collected: requiredInt("Eggs collected", 0),
  bad_eggs: requiredInt("Bad eggs", 0),
  mortality_count: requiredInt("Mortality count", 0),
  culled_count: requiredInt("Culled count", 0),
  feed_consumed: optionalFloat(0),
  water_consumed: optionalFloat(0),
  avg_weight: optionalFloat(0),
  temperature: optionalFloat(-50),
  notes: optionalText(1000),
});

const feedLogSchema = z.object({
  flock_id: requiredText("Flock"),
  log_date: requiredDate("Date"),
  feed_type: requiredText("Feed type", 120),
  quantity: requiredFloat("Quantity", 0),
  unit: requiredText("Unit", 40),
  cost: optionalFloat(0),
  supplier: optionalText(160),
  notes: optionalText(1000),
});

const healthLogSchema = z.object({
  flock_id: requiredText("Flock"),
  log_date: requiredDate("Date"),
  issue_type: requiredText("Issue type", 120),
  symptoms: optionalText(400),
  affected_count: optionalInt(0),
  treatment: optionalText(300),
  medication: optionalText(300),
  vaccination: optionalText(300),
  notes: optionalText(1000),
});

const saleLogSchema = z.object({
  flock_id: optionalId(),
  sale_date: requiredDate("Sale date"),
  sale_type: enumText(["eggs", "live_birds", "dressed_birds", "manure"], "Sale type"),
  quantity: requiredFloat("Quantity", 0),
  unit_price: requiredFloat("Unit price", 0),
  total_amount: requiredFloat("Total amount", 0),
  buyer: optionalText(200),
  payment_status: enumText(["paid", "pending", "partial"], "Payment status"),
  notes: optionalText(1000),
});

const expenseSchema = z.object({
  flock_id: optionalId(),
  expense_date: requiredDate("Expense date"),
  category: requiredText("Category", 120),
  amount: requiredFloat("Amount", 0),
  description: optionalText(500),
});

export const poultrySchemas = {
  houses: {
    create: houseSchema,
    update: houseSchema.partial(),
    dateFields: [],
  },
  flocks: {
    create: flockSchema,
    update: flockSchema.partial(),
    dateFields: ["start_date"],
  },
  dailyLogs: {
    create: dailyLogSchema,
    update: dailyLogSchema.partial(),
    dateFields: ["log_date"],
  },
  feedLogs: {
    create: feedLogSchema,
    update: feedLogSchema.partial(),
    dateFields: ["log_date"],
  },
  healthLogs: {
    create: healthLogSchema,
    update: healthLogSchema.partial(),
    dateFields: ["log_date"],
  },
  sales: {
    create: saleLogSchema,
    update: saleLogSchema.partial(),
    dateFields: ["sale_date"],
  },
  expenses: {
    create: expenseSchema,
    update: expenseSchema.partial(),
    dateFields: ["expense_date"],
  },
};

export const poultryDashboardFilters = z.object({
  from: optionalDate(),
  to: optionalDate(),
});
