import { z } from "zod";
import {
  enumText,
  optionalDate,
  optionalFloat,
  optionalId,
  optionalInt,
  optionalText,
  requiredDate,
  requiredFloat,
  requiredText,
} from "../../shared/moduleCrud.js";

const penSchema = z.object({
  name: requiredText("Pen name/code"),
  type: optionalText(120),
  capacity: optionalInt(0),
  status: enumText(["active", "inactive", "maintenance"], "Status"),
  notes: optionalText(1000),
});

const goatSchema = z.object({
  tag_number: requiredText("Tag number", 120),
  name: optionalText(160),
  breed: requiredText("Breed", 120),
  sex: enumText(["male", "female"], "Sex"),
  date_of_birth: optionalDate(),
  estimated_age: optionalText(120),
  acquisition_date: optionalDate(),
  source: optionalText(160),
  pen_id: optionalId(),
  status: enumText(["active", "sold", "dead", "transferred"], "Status"),
  current_weight: optionalFloat(0),
  notes: optionalText(1000),
});

const breedingSchema = z.object({
  doe_goat_id: requiredText("Doe goat"),
  buck_goat_id: optionalId(),
  mating_date: requiredDate("Mating date"),
  expected_kidding_date: optionalDate(),
  actual_kidding_date: optionalDate(),
  kids_born_count: optionalInt(0),
  kids_alive_count: optionalInt(0),
  notes: optionalText(1000),
});

const healthSchema = z.object({
  goat_id: requiredText("Goat"),
  log_date: requiredDate("Date"),
  issue_type: requiredText("Issue type", 120),
  symptoms: optionalText(400),
  treatment: optionalText(300),
  medication: optionalText(300),
  vaccination: optionalText(300),
  deworming: optionalText(300),
  vet_notes: optionalText(1000),
});

const weightSchema = z.object({
  goat_id: requiredText("Goat"),
  log_date: requiredDate("Date"),
  weight: requiredFloat("Weight", 0),
  notes: optionalText(1000),
});

const feedSchemaBase = z.object({
  goat_id: optionalId(),
  pen_id: requiredText("Pen"),
  log_date: requiredDate("Date"),
  feed_type: requiredText("Feed type", 120),
  quantity: requiredFloat("Quantity", 0),
  unit: requiredText("Unit", 40),
  cost: optionalFloat(0),
  notes: optionalText(1000),
});

const feedSchema = feedSchemaBase;

const saleSchema = z.object({
  goat_id: requiredText("Goat"),
  sale_date: requiredDate("Sale date"),
  sale_type: optionalText(120),
  amount: requiredFloat("Amount", 0),
  buyer: optionalText(200),
  payment_status: enumText(["paid", "pending", "partial"], "Payment status"),
  notes: optionalText(1000),
});

const expenseSchema = z.object({
  goat_id: optionalId(),
  pen_id: optionalId(),
  expense_date: requiredDate("Expense date"),
  category: requiredText("Category", 120),
  amount: requiredFloat("Amount", 0),
  payment_method: enumText(["cash", "bank"], "Payment method").default("cash"),
  description: optionalText(500),
});

export const goatSchemas = {
  pens: {
    create: penSchema,
    update: penSchema.partial(),
    dateFields: [],
  },
  goats: {
    create: goatSchema,
    update: goatSchema.partial(),
    dateFields: ["date_of_birth", "acquisition_date"],
  },
  breeding: {
    create: breedingSchema,
    update: breedingSchema.partial(),
    dateFields: ["mating_date", "expected_kidding_date", "actual_kidding_date"],
  },
  health: {
    create: healthSchema,
    update: healthSchema.partial(),
    dateFields: ["log_date"],
  },
  weights: {
    create: weightSchema,
    update: weightSchema.partial(),
    dateFields: ["log_date"],
  },
  feed: {
    create: feedSchema,
    update: feedSchemaBase.partial(),
    dateFields: ["log_date"],
  },
  sales: {
    create: saleSchema,
    update: saleSchema.partial(),
    dateFields: ["sale_date"],
  },
  expenses: {
    create: expenseSchema,
    update: expenseSchema.partial(),
    dateFields: ["expense_date"],
  },
};
