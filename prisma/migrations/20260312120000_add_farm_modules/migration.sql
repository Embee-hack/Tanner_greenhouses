-- CreateTable
CREATE TABLE "poultry_houses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "capacity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poultry_houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poultry_flocks" (
    "id" TEXT NOT NULL,
    "poultry_house_id" TEXT NOT NULL,
    "flock_code" TEXT NOT NULL,
    "bird_type" TEXT NOT NULL,
    "breed" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "initial_bird_count" INTEGER NOT NULL,
    "source" TEXT,
    "purpose" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poultry_flocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poultry_daily_logs" (
    "id" TEXT NOT NULL,
    "flock_id" TEXT NOT NULL,
    "log_date" TIMESTAMP(3) NOT NULL,
    "eggs_collected" INTEGER NOT NULL DEFAULT 0,
    "bad_eggs" INTEGER NOT NULL DEFAULT 0,
    "mortality_count" INTEGER NOT NULL DEFAULT 0,
    "culled_count" INTEGER NOT NULL DEFAULT 0,
    "feed_consumed" DOUBLE PRECISION,
    "water_consumed" DOUBLE PRECISION,
    "avg_weight" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poultry_daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poultry_feed_logs" (
    "id" TEXT NOT NULL,
    "flock_id" TEXT NOT NULL,
    "log_date" TIMESTAMP(3) NOT NULL,
    "feed_type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "cost" DOUBLE PRECISION,
    "supplier" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poultry_feed_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poultry_health_logs" (
    "id" TEXT NOT NULL,
    "flock_id" TEXT NOT NULL,
    "log_date" TIMESTAMP(3) NOT NULL,
    "issue_type" TEXT NOT NULL,
    "symptoms" TEXT,
    "affected_count" INTEGER,
    "treatment" TEXT,
    "medication" TEXT,
    "vaccination" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poultry_health_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poultry_sales" (
    "id" TEXT NOT NULL,
    "flock_id" TEXT,
    "sale_date" TIMESTAMP(3) NOT NULL,
    "sale_type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "buyer" TEXT,
    "payment_status" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poultry_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poultry_expenses" (
    "id" TEXT NOT NULL,
    "flock_id" TEXT,
    "expense_date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poultry_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goat_pens" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "capacity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goat_pens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goats" (
    "id" TEXT NOT NULL,
    "tag_number" TEXT NOT NULL,
    "name" TEXT,
    "breed" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "estimated_age" TEXT,
    "acquisition_date" TIMESTAMP(3),
    "source" TEXT,
    "pen_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "current_weight" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goat_breeding_logs" (
    "id" TEXT NOT NULL,
    "doe_goat_id" TEXT NOT NULL,
    "buck_goat_id" TEXT,
    "mating_date" TIMESTAMP(3) NOT NULL,
    "expected_kidding_date" TIMESTAMP(3),
    "actual_kidding_date" TIMESTAMP(3),
    "kids_born_count" INTEGER NOT NULL DEFAULT 0,
    "kids_alive_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goat_breeding_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goat_health_logs" (
    "id" TEXT NOT NULL,
    "goat_id" TEXT NOT NULL,
    "log_date" TIMESTAMP(3) NOT NULL,
    "issue_type" TEXT NOT NULL,
    "symptoms" TEXT,
    "treatment" TEXT,
    "medication" TEXT,
    "vaccination" TEXT,
    "deworming" TEXT,
    "vet_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goat_health_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goat_weight_logs" (
    "id" TEXT NOT NULL,
    "goat_id" TEXT NOT NULL,
    "log_date" TIMESTAMP(3) NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goat_weight_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goat_feed_logs" (
    "id" TEXT NOT NULL,
    "goat_id" TEXT,
    "pen_id" TEXT,
    "log_date" TIMESTAMP(3) NOT NULL,
    "feed_type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goat_feed_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goat_sales" (
    "id" TEXT NOT NULL,
    "goat_id" TEXT NOT NULL,
    "sale_date" TIMESTAMP(3) NOT NULL,
    "sale_type" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "buyer" TEXT,
    "payment_status" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goat_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goat_expenses" (
    "id" TEXT NOT NULL,
    "goat_id" TEXT,
    "pen_id" TEXT,
    "expense_date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goat_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "poultry_flocks_flock_code_key" ON "poultry_flocks"("flock_code");

-- CreateIndex
CREATE INDEX "poultry_flocks_poultry_house_id_idx" ON "poultry_flocks"("poultry_house_id");

-- CreateIndex
CREATE INDEX "poultry_flocks_status_idx" ON "poultry_flocks"("status");

-- CreateIndex
CREATE INDEX "poultry_daily_logs_flock_id_idx" ON "poultry_daily_logs"("flock_id");

-- CreateIndex
CREATE INDEX "poultry_daily_logs_log_date_idx" ON "poultry_daily_logs"("log_date");

-- CreateIndex
CREATE INDEX "poultry_feed_logs_flock_id_idx" ON "poultry_feed_logs"("flock_id");

-- CreateIndex
CREATE INDEX "poultry_feed_logs_log_date_idx" ON "poultry_feed_logs"("log_date");

-- CreateIndex
CREATE INDEX "poultry_health_logs_flock_id_idx" ON "poultry_health_logs"("flock_id");

-- CreateIndex
CREATE INDEX "poultry_health_logs_log_date_idx" ON "poultry_health_logs"("log_date");

-- CreateIndex
CREATE INDEX "poultry_sales_flock_id_idx" ON "poultry_sales"("flock_id");

-- CreateIndex
CREATE INDEX "poultry_sales_sale_date_idx" ON "poultry_sales"("sale_date");

-- CreateIndex
CREATE INDEX "poultry_expenses_flock_id_idx" ON "poultry_expenses"("flock_id");

-- CreateIndex
CREATE INDEX "poultry_expenses_expense_date_idx" ON "poultry_expenses"("expense_date");

-- CreateIndex
CREATE UNIQUE INDEX "goats_tag_number_key" ON "goats"("tag_number");

-- CreateIndex
CREATE INDEX "goats_pen_id_idx" ON "goats"("pen_id");

-- CreateIndex
CREATE INDEX "goats_status_idx" ON "goats"("status");

-- CreateIndex
CREATE INDEX "goat_breeding_logs_doe_goat_id_idx" ON "goat_breeding_logs"("doe_goat_id");

-- CreateIndex
CREATE INDEX "goat_breeding_logs_buck_goat_id_idx" ON "goat_breeding_logs"("buck_goat_id");

-- CreateIndex
CREATE INDEX "goat_breeding_logs_mating_date_idx" ON "goat_breeding_logs"("mating_date");

-- CreateIndex
CREATE INDEX "goat_health_logs_goat_id_idx" ON "goat_health_logs"("goat_id");

-- CreateIndex
CREATE INDEX "goat_health_logs_log_date_idx" ON "goat_health_logs"("log_date");

-- CreateIndex
CREATE INDEX "goat_weight_logs_goat_id_idx" ON "goat_weight_logs"("goat_id");

-- CreateIndex
CREATE INDEX "goat_weight_logs_log_date_idx" ON "goat_weight_logs"("log_date");

-- CreateIndex
CREATE INDEX "goat_feed_logs_goat_id_idx" ON "goat_feed_logs"("goat_id");

-- CreateIndex
CREATE INDEX "goat_feed_logs_pen_id_idx" ON "goat_feed_logs"("pen_id");

-- CreateIndex
CREATE INDEX "goat_feed_logs_log_date_idx" ON "goat_feed_logs"("log_date");

-- CreateIndex
CREATE INDEX "goat_sales_goat_id_idx" ON "goat_sales"("goat_id");

-- CreateIndex
CREATE INDEX "goat_sales_sale_date_idx" ON "goat_sales"("sale_date");

-- CreateIndex
CREATE INDEX "goat_expenses_goat_id_idx" ON "goat_expenses"("goat_id");

-- CreateIndex
CREATE INDEX "goat_expenses_pen_id_idx" ON "goat_expenses"("pen_id");

-- CreateIndex
CREATE INDEX "goat_expenses_expense_date_idx" ON "goat_expenses"("expense_date");

-- AddForeignKey
ALTER TABLE "poultry_flocks" ADD CONSTRAINT "poultry_flocks_poultry_house_id_fkey" FOREIGN KEY ("poultry_house_id") REFERENCES "poultry_houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poultry_daily_logs" ADD CONSTRAINT "poultry_daily_logs_flock_id_fkey" FOREIGN KEY ("flock_id") REFERENCES "poultry_flocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poultry_feed_logs" ADD CONSTRAINT "poultry_feed_logs_flock_id_fkey" FOREIGN KEY ("flock_id") REFERENCES "poultry_flocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poultry_health_logs" ADD CONSTRAINT "poultry_health_logs_flock_id_fkey" FOREIGN KEY ("flock_id") REFERENCES "poultry_flocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poultry_sales" ADD CONSTRAINT "poultry_sales_flock_id_fkey" FOREIGN KEY ("flock_id") REFERENCES "poultry_flocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poultry_expenses" ADD CONSTRAINT "poultry_expenses_flock_id_fkey" FOREIGN KEY ("flock_id") REFERENCES "poultry_flocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goats" ADD CONSTRAINT "goats_pen_id_fkey" FOREIGN KEY ("pen_id") REFERENCES "goat_pens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goat_breeding_logs" ADD CONSTRAINT "goat_breeding_logs_doe_goat_id_fkey" FOREIGN KEY ("doe_goat_id") REFERENCES "goats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goat_breeding_logs" ADD CONSTRAINT "goat_breeding_logs_buck_goat_id_fkey" FOREIGN KEY ("buck_goat_id") REFERENCES "goats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goat_health_logs" ADD CONSTRAINT "goat_health_logs_goat_id_fkey" FOREIGN KEY ("goat_id") REFERENCES "goats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goat_weight_logs" ADD CONSTRAINT "goat_weight_logs_goat_id_fkey" FOREIGN KEY ("goat_id") REFERENCES "goats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goat_feed_logs" ADD CONSTRAINT "goat_feed_logs_goat_id_fkey" FOREIGN KEY ("goat_id") REFERENCES "goats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goat_feed_logs" ADD CONSTRAINT "goat_feed_logs_pen_id_fkey" FOREIGN KEY ("pen_id") REFERENCES "goat_pens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goat_sales" ADD CONSTRAINT "goat_sales_goat_id_fkey" FOREIGN KEY ("goat_id") REFERENCES "goats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goat_expenses" ADD CONSTRAINT "goat_expenses_goat_id_fkey" FOREIGN KEY ("goat_id") REFERENCES "goats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goat_expenses" ADD CONSTRAINT "goat_expenses_pen_id_fkey" FOREIGN KEY ("pen_id") REFERENCES "goat_pens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
