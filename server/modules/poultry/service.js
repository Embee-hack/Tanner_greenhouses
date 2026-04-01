import { formatDateOnly, serializeRecord } from "../../shared/moduleCrud.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (date, amount) => new Date(date.getTime() + amount * ONE_DAY_MS);

const buildDaySeries = (days) => {
  const today = startOfDay();
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(today, index - (days - 1));
    return {
      key: formatDateOnly(date),
      label: formatDateOnly(date),
    };
  });
};

const startOfWeek = (value = new Date()) => {
  const date = startOfDay(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
};

const buildWeekSeries = (weeks) => {
  const currentWeekStart = startOfWeek();
  return Array.from({ length: weeks }, (_, index) => {
    const weekStart = addDays(currentWeekStart, (index - (weeks - 1)) * 7);
    return {
      key: formatDateOnly(weekStart),
      label: `Week of ${formatDateOnly(weekStart)}`,
    };
  });
};

const dateKey = (value) => formatDateOnly(value instanceof Date ? value : new Date(value));

const incrementMap = (map, key, value) => {
  map.set(key, (map.get(key) || 0) + value);
};

const round = (value, decimals = 2) => Number(Number(value || 0).toFixed(decimals));

const liveBirdsByFlock = (flocks, dailyLogs, sales) => {
  const mortalityByFlock = new Map();
  const salesByFlock = new Map();

  dailyLogs.forEach((log) => {
    incrementMap(mortalityByFlock, log.flock_id, (log.mortality_count || 0) + (log.culled_count || 0));
  });

  sales
    .filter((sale) => sale.flock_id && ["live_birds", "dressed_birds"].includes(String(sale.sale_type || "").toLowerCase()))
    .forEach((sale) => {
      incrementMap(salesByFlock, sale.flock_id, sale.quantity || 0);
    });

  return new Map(
    flocks.map((flock) => [
      flock.id,
      Math.max(
        0,
        (flock.initial_bird_count || 0) - (mortalityByFlock.get(flock.id) || 0) - (salesByFlock.get(flock.id) || 0)
      ),
    ])
  );
};

export const getPoultryModuleData = async (prisma) => {
  const [houses, flocks, dailyLogs, feedLogs, healthLogs, sales, expenses] = await Promise.all([
    prisma.poultryHouse.findMany({ orderBy: { name: "asc" } }),
    prisma.poultryFlock.findMany({ orderBy: { start_date: "desc" } }),
    prisma.poultryDailyLog.findMany({ orderBy: { log_date: "desc" } }),
    prisma.poultryFeedLog.findMany({ orderBy: { log_date: "desc" } }),
    prisma.poultryHealthLog.findMany({ orderBy: { log_date: "desc" } }),
    prisma.poultrySale.findMany({ orderBy: { sale_date: "desc" } }),
    prisma.poultryExpense.findMany({ orderBy: { expense_date: "desc" } }),
  ]);

  const serializedHouses = houses.map((row) => serializeRecord(row));
  const serializedFlocks = flocks.map((row) => serializeRecord(row, ["start_date"]));
  const serializedDailyLogs = dailyLogs.map((row) => serializeRecord(row, ["log_date"]));
  const serializedFeedLogs = feedLogs.map((row) => serializeRecord(row, ["log_date"]));
  const serializedHealthLogs = healthLogs.map((row) => serializeRecord(row, ["log_date"]));
  const serializedSales = sales.map((row) => serializeRecord(row, ["sale_date"]));
  const serializedExpenses = expenses.map((row) => serializeRecord(row, ["expense_date"]));

  const todayKey = formatDateOnly(new Date());
  const weekStart = startOfWeek();
  const liveBirdsMap = liveBirdsByFlock(serializedFlocks, serializedDailyLogs, serializedSales);
  const totalLiveBirds = [...liveBirdsMap.values()].reduce((sum, value) => sum + value, 0);
  const activeFlocks = serializedFlocks.filter((flock) => flock.status === "active");
  const eggsToday = serializedDailyLogs
    .filter((log) => log.log_date === todayKey)
    .reduce((sum, log) => sum + (log.eggs_collected || 0), 0);
  const mortalityToday = serializedDailyLogs
    .filter((log) => log.log_date === todayKey)
    .reduce((sum, log) => sum + (log.mortality_count || 0), 0);
  const feedConsumedToday = serializedDailyLogs
    .filter((log) => log.log_date === todayKey)
    .reduce((sum, log) => sum + (log.feed_consumed || 0), 0);
  const revenueThisWeek = serializedSales
    .filter((sale) => sale.sale_date && new Date(sale.sale_date) >= weekStart)
    .reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

  const daySeries = buildDaySeries(14);
  const eggsByDay = new Map();
  const mortalityByDay = new Map();
  const feedByDay = new Map();

  serializedDailyLogs.forEach((log) => {
    incrementMap(eggsByDay, log.log_date, log.eggs_collected || 0);
    incrementMap(mortalityByDay, log.log_date, log.mortality_count || 0);
    incrementMap(feedByDay, log.log_date, log.feed_consumed || 0);
  });

  const weekSeries = buildWeekSeries(8);
  const revenueByWeek = new Map();
  const expensesByWeek = new Map();

  serializedSales.forEach((sale) => {
    const weekKey = formatDateOnly(startOfWeek(new Date(sale.sale_date)));
    incrementMap(revenueByWeek, weekKey, sale.total_amount || 0);
  });

  serializedExpenses.forEach((expense) => {
    const weekKey = formatDateOnly(startOfWeek(new Date(expense.expense_date)));
    incrementMap(expensesByWeek, weekKey, expense.amount || 0);
  });

  const flockNameMap = new Map(serializedFlocks.map((flock) => [flock.id, flock.flock_code]));
  const eggsByFlock = new Map();
  const revenueByFlock = new Map();
  const expensesByFlock = new Map();
  const mortalityByFlock = new Map();
  const feedByFlock = new Map();

  serializedDailyLogs.forEach((log) => {
    incrementMap(eggsByFlock, log.flock_id, log.eggs_collected || 0);
    incrementMap(mortalityByFlock, log.flock_id, log.mortality_count || 0);
    incrementMap(feedByFlock, log.flock_id, log.feed_consumed || 0);
  });

  serializedSales.forEach((sale) => {
    if (!sale.flock_id) return;
    incrementMap(revenueByFlock, sale.flock_id, sale.total_amount || 0);
  });

  serializedExpenses.forEach((expense) => {
    if (!expense.flock_id) return;
    incrementMap(expensesByFlock, expense.flock_id, expense.amount || 0);
  });

  const totalMortality = [...mortalityByFlock.values()].reduce((sum, value) => sum + value, 0);
  const totalEggs = [...eggsByFlock.values()].reduce((sum, value) => sum + value, 0);
  const totalFeed = [...feedByFlock.values()].reduce((sum, value) => sum + value, 0);
  const totalInitialBirds = serializedFlocks.reduce((sum, flock) => sum + (flock.initial_bird_count || 0), 0);

  const flockPerformance = serializedFlocks.map((flock) => {
    const revenue = revenueByFlock.get(flock.id) || 0;
    const expense = expensesByFlock.get(flock.id) || 0;
    const eggs = eggsByFlock.get(flock.id) || 0;
    const mortality = mortalityByFlock.get(flock.id) || 0;
    const currentBirds = liveBirdsMap.get(flock.id) || 0;

    return {
      flock_id: flock.id,
      flock_code: flock.flock_code,
      revenue: round(revenue),
      expense: round(expense),
      profit: round(revenue - expense),
      eggs: round(eggs),
      mortality: round(mortality),
      current_live_birds: round(currentBirds),
    };
  });

  return {
    summary: {
      active_flocks: activeFlocks.length,
      total_live_birds: round(totalLiveBirds),
      eggs_today: round(eggsToday),
      mortality_today: round(mortalityToday),
      feed_consumed_today: round(feedConsumedToday),
      revenue_this_week: round(revenueThisWeek),
      active_houses: serializedHouses.filter((house) => house.status === "active").length,
      recent_health_alerts: serializedHealthLogs.slice(0, 5),
    },
    charts: {
      eggs_trend: daySeries.map((day) => ({
        date: day.label,
        eggs: round(eggsByDay.get(day.key) || 0),
      })),
      mortality_trend: daySeries.map((day) => ({
        date: day.label,
        mortality: round(mortalityByDay.get(day.key) || 0),
      })),
      feed_trend: daySeries.map((day) => ({
        date: day.label,
        feed: round(feedByDay.get(day.key) || 0),
      })),
      revenue_vs_expense: weekSeries.map((week) => ({
        period: week.label,
        revenue: round(revenueByWeek.get(week.key) || 0),
        expense: round(expensesByWeek.get(week.key) || 0),
      })),
      egg_output_by_flock: flockPerformance
        .map((item) => ({
          name: item.flock_code,
          eggs: item.eggs,
        }))
        .sort((a, b) => b.eggs - a.eggs),
    },
    analytics: {
      mortality_rate: totalInitialBirds > 0 ? round((totalMortality / totalInitialBirds) * 100) : 0,
      eggs_per_bird: totalLiveBirds > 0 ? round(totalEggs / totalLiveBirds) : 0,
      feed_per_bird: totalLiveBirds > 0 ? round(totalFeed / totalLiveBirds) : 0,
      revenue_by_flock: flockPerformance.map((item) => ({
        flock_id: item.flock_id,
        flock_code: item.flock_code,
        value: item.revenue,
      })),
      expenses_by_flock: flockPerformance.map((item) => ({
        flock_id: item.flock_id,
        flock_code: item.flock_code,
        value: item.expense,
      })),
      profit_estimate_by_flock: flockPerformance.map((item) => ({
        flock_id: item.flock_id,
        flock_code: item.flock_code,
        value: item.profit,
      })),
      flock_performance: flockPerformance,
    },
    reference: {
      houses: serializedHouses,
      flocks: serializedFlocks,
      daily_logs: serializedDailyLogs,
      feed_logs: serializedFeedLogs,
      health_logs: serializedHealthLogs,
      sales: serializedSales,
      expenses: serializedExpenses,
    },
  };
};
