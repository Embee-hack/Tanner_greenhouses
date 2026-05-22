ALTER TABLE "poultry_expenses" ADD COLUMN "payment_method" TEXT NOT NULL DEFAULT 'cash';

ALTER TABLE "goat_expenses" ADD COLUMN "payment_method" TEXT NOT NULL DEFAULT 'cash';
