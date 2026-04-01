import { formatDateOnly, serializeRecord } from "../../shared/moduleCrud.js";

const round = (value, decimals = 2) => Number(Number(value || 0).toFixed(decimals));

const buildMonthSeries = (months) => {
  const now = new Date();
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date),
    };
  });
};

const monthKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const incrementMap = (map, key, value) => {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + value);
};

export const getGoatModuleData = async (prisma) => {
  const [pens, goats, breedingLogs, healthLogs, weightLogs, feedLogs, sales, expenses] = await Promise.all([
    prisma.goatPen.findMany({ orderBy: { name: "asc" } }),
    prisma.goat.findMany({ orderBy: { created_at: "desc" } }),
    prisma.goatBreedingLog.findMany({ orderBy: { mating_date: "desc" } }),
    prisma.goatHealthLog.findMany({ orderBy: { log_date: "desc" } }),
    prisma.goatWeightLog.findMany({ orderBy: { log_date: "desc" } }),
    prisma.goatFeedLog.findMany({ orderBy: { log_date: "desc" } }),
    prisma.goatSale.findMany({ orderBy: { sale_date: "desc" } }),
    prisma.goatExpense.findMany({ orderBy: { expense_date: "desc" } }),
  ]);

  const serializedPens = pens.map((row) => serializeRecord(row));
  const serializedGoats = goats.map((row) => serializeRecord(row, ["date_of_birth", "acquisition_date"]));
  const serializedBreeding = breedingLogs.map((row) =>
    serializeRecord(row, ["mating_date", "expected_kidding_date", "actual_kidding_date"])
  );
  const serializedHealth = healthLogs.map((row) => serializeRecord(row, ["log_date"]));
  const serializedWeights = weightLogs.map((row) => serializeRecord(row, ["log_date"]));
  const serializedFeed = feedLogs.map((row) => serializeRecord(row, ["log_date"]));
  const serializedSales = sales.map((row) => serializeRecord(row, ["sale_date"]));
  const serializedExpenses = expenses.map((row) => serializeRecord(row, ["expense_date"]));

  const activeGoats = serializedGoats.filter((goat) => goat.status === "active");
  const maleGoats = activeGoats.filter((goat) => goat.sex === "male").length;
  const femaleGoats = activeGoats.filter((goat) => goat.sex === "female").length;
  const pregnancyWindowStart = new Date();
  pregnancyWindowStart.setDate(pregnancyWindowStart.getDate() - 160);

  const pregnantGoats = new Set(
    serializedBreeding
      .filter(
        (log) =>
          log.doe_goat_id &&
          log.mating_date &&
          new Date(log.mating_date) >= pregnancyWindowStart &&
          !log.actual_kidding_date
      )
      .map((log) => log.doe_goat_id)
  );

  const currentMonthKey = monthKey(new Date());
  const kidsBornThisMonth = serializedBreeding
    .filter((log) => log.actual_kidding_date && monthKey(log.actual_kidding_date) === currentMonthKey)
    .reduce((sum, log) => sum + (log.kids_born_count || 0), 0);

  const recentHealthAlerts = serializedHealth.slice(0, 5);
  const monthSeries = buildMonthSeries(8);
  const registrationsByMonth = new Map();
  const birthsByMonth = new Map();
  const salesByMonth = new Map();
  const expensesByMonth = new Map();
  const weightTotalsByMonth = new Map();
  const weightCountsByMonth = new Map();
  const sexCounts = new Map();
  const statusCounts = new Map();

  activeGoats.forEach((goat) => {
    incrementMap(sexCounts, goat.sex, 1);
  });

  serializedGoats.forEach((goat) => {
    incrementMap(statusCounts, goat.status, 1);
    incrementMap(registrationsByMonth, monthKey(goat.acquisition_date || goat.created_at), 1);
  });

  serializedBreeding.forEach((log) => {
    incrementMap(birthsByMonth, monthKey(log.actual_kidding_date), log.kids_born_count || 0);
  });

  serializedSales.forEach((sale) => {
    incrementMap(salesByMonth, monthKey(sale.sale_date), sale.amount || 0);
  });

  serializedExpenses.forEach((expense) => {
    incrementMap(expensesByMonth, monthKey(expense.expense_date), expense.amount || 0);
  });

  serializedWeights.forEach((log) => {
    const key = monthKey(log.log_date);
    if (!key) return;
    incrementMap(weightTotalsByMonth, key, log.weight || 0);
    incrementMap(weightCountsByMonth, key, 1);
  });

  let runningTotal = 0;
  const herdGrowth = monthSeries.map((month) => {
    runningTotal += registrationsByMonth.get(month.key) || 0;
    return {
      period: month.label,
      goats: runningTotal,
    };
  });

  const completedBreeding = serializedBreeding.filter((log) => log.actual_kidding_date);
  const totalKidsBorn = serializedBreeding.reduce((sum, log) => sum + (log.kids_born_count || 0), 0);
  const totalKidsAlive = serializedBreeding.reduce((sum, log) => sum + (log.kids_alive_count || 0), 0);

  return {
    summary: {
      total_goats: activeGoats.length,
      male_goats: maleGoats,
      female_goats: femaleGoats,
      pregnant_goats: pregnantGoats.size,
      kids_born_this_month: round(kidsBornThisMonth),
      health_alerts: recentHealthAlerts,
      active_pens: serializedPens.filter((pen) => pen.status === "active").length,
    },
    charts: {
      herd_growth: herdGrowth,
      births_by_month: monthSeries.map((month) => ({
        period: month.label,
        births: round(birthsByMonth.get(month.key) || 0),
      })),
      weight_trend: monthSeries.map((month) => ({
        period: month.label,
        avg_weight:
          (weightCountsByMonth.get(month.key) || 0) > 0
            ? round((weightTotalsByMonth.get(month.key) || 0) / weightCountsByMonth.get(month.key))
            : 0,
      })),
      sales_trend: monthSeries.map((month) => ({
        period: month.label,
        amount: round(salesByMonth.get(month.key) || 0),
      })),
      expense_trend: monthSeries.map((month) => ({
        period: month.label,
        amount: round(expensesByMonth.get(month.key) || 0),
      })),
    },
    analytics: {
      herd_count_by_sex: Array.from(sexCounts.entries()).map(([name, value]) => ({ name, value })),
      herd_count_by_status: Array.from(statusCounts.entries()).map(([name, value]) => ({ name, value })),
      births_by_month: monthSeries.map((month) => ({
        period: month.label,
        value: round(birthsByMonth.get(month.key) || 0),
      })),
      weight_trend: monthSeries.map((month) => ({
        period: month.label,
        value:
          (weightCountsByMonth.get(month.key) || 0) > 0
            ? round((weightTotalsByMonth.get(month.key) || 0) / weightCountsByMonth.get(month.key))
            : 0,
      })),
      sales_trend: monthSeries.map((month) => ({
        period: month.label,
        value: round(salesByMonth.get(month.key) || 0),
      })),
      expense_summary: monthSeries.map((month) => ({
        period: month.label,
        value: round(expensesByMonth.get(month.key) || 0),
      })),
      breeding_success_rate:
        serializedBreeding.length > 0 ? round((completedBreeding.length / serializedBreeding.length) * 100) : 0,
      kidding_rate: totalKidsBorn > 0 ? round((totalKidsAlive / totalKidsBorn) * 100) : 0,
    },
    reference: {
      pens: serializedPens,
      goats: serializedGoats,
      breeding_logs: serializedBreeding,
      health_logs: serializedHealth,
      weight_logs: serializedWeights,
      feed_logs: serializedFeed,
      sales: serializedSales,
      expenses: serializedExpenses,
    },
  };
};
