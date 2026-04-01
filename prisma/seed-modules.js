import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SAMPLE_MARKER = "[sample-data]";
const poultryHouseNames = [
  "Tanner Sample Layer House",
  "Tanner Sample Broiler House",
  "Tanner Sample Turkey House",
];
const poultryFlockCodes = ["PF-LAY-2601", "PF-BRO-2602", "PF-TUR-2504"];
const goatPenNames = [
  "Tanner Sample Breeding Pen",
  "Tanner Sample Kids Pen",
  "Tanner Sample Fattening Pen",
];
const goatTagNumbers = [
  "GT-SMP-001",
  "GT-SMP-002",
  "GT-SMP-003",
  "GT-SMP-004",
  "GT-SMP-005",
  "GT-SMP-006",
  "GT-SMP-007",
  "GT-SMP-008",
];
const poultryWorkerSampleIds = ["sample-poultry-worker-1", "sample-poultry-worker-2", "sample-poultry-worker-3"];
const goatWorkerSampleIds = ["sample-goat-worker-1", "sample-goat-worker-2", "sample-goat-worker-3"];

const daysAgo = (days) => {
  const value = new Date();
  value.setHours(9, 0, 0, 0);
  value.setDate(value.getDate() - days);
  return value;
};

const monthsAgo = (months, day = 8) => {
  const value = new Date();
  value.setHours(9, 0, 0, 0);
  value.setMonth(value.getMonth() - months, day);
  return value;
};

const weeksAgo = (weeks) => daysAgo(weeks * 7);

async function resetPoultrySampleData() {
  const flocks = await prisma.poultryFlock.findMany({
    where: { flock_code: { in: poultryFlockCodes } },
    select: { id: true },
  });
  const flockIds = flocks.map((item) => item.id);

  if (flockIds.length > 0) {
    await prisma.poultryDailyLog.deleteMany({ where: { flock_id: { in: flockIds } } });
    await prisma.poultryFeedLog.deleteMany({ where: { flock_id: { in: flockIds } } });
    await prisma.poultryHealthLog.deleteMany({ where: { flock_id: { in: flockIds } } });
    await prisma.poultrySale.deleteMany({ where: { flock_id: { in: flockIds } } });
    await prisma.poultryExpense.deleteMany({ where: { flock_id: { in: flockIds } } });
    await prisma.poultryFlock.deleteMany({ where: { id: { in: flockIds } } });
  }

  const houses = await prisma.poultryHouse.findMany({
    where: { name: { in: poultryHouseNames } },
    select: { id: true },
  });
  const houseIds = houses.map((item) => item.id);

  if (houseIds.length > 0) {
    await prisma.poultryHouse.deleteMany({ where: { id: { in: houseIds } } });
  }
}

async function resetGoatSampleData() {
  const goats = await prisma.goat.findMany({
    where: { tag_number: { in: goatTagNumbers } },
    select: { id: true },
  });
  const goatIds = goats.map((item) => item.id);

  if (goatIds.length > 0) {
    await prisma.goatBreedingLog.deleteMany({
      where: {
        OR: [{ doe_goat_id: { in: goatIds } }, { buck_goat_id: { in: goatIds } }],
      },
    });
    await prisma.goatHealthLog.deleteMany({ where: { goat_id: { in: goatIds } } });
    await prisma.goatWeightLog.deleteMany({ where: { goat_id: { in: goatIds } } });
    await prisma.goatFeedLog.deleteMany({ where: { goat_id: { in: goatIds } } });
    await prisma.goatSale.deleteMany({ where: { goat_id: { in: goatIds } } });
    await prisma.goatExpense.deleteMany({ where: { goat_id: { in: goatIds } } });
    await prisma.goat.deleteMany({ where: { id: { in: goatIds } } });
  }

  const pens = await prisma.goatPen.findMany({
    where: { name: { in: goatPenNames } },
    select: { id: true },
  });
  const penIds = pens.map((item) => item.id);

  if (penIds.length > 0) {
    await prisma.goatFeedLog.deleteMany({ where: { pen_id: { in: penIds } } });
    await prisma.goatExpense.deleteMany({ where: { pen_id: { in: penIds } } });
    await prisma.goatPen.deleteMany({ where: { id: { in: penIds } } });
  }
}

async function resetWorkerSampleData() {
  await prisma.entityRecord.deleteMany({
    where: {
      id: {
        in: [...poultryWorkerSampleIds, ...goatWorkerSampleIds],
      },
    },
  });
}

async function seedPoultrySampleData() {
  const layerHouse = await prisma.poultryHouse.create({
    data: {
      name: poultryHouseNames[0],
      type: "layer",
      capacity: 1200,
      status: "active",
      notes: `${SAMPLE_MARKER} Main egg production house for demo data`,
    },
  });

  const broilerHouse = await prisma.poultryHouse.create({
    data: {
      name: poultryHouseNames[1],
      type: "broiler",
      capacity: 900,
      status: "active",
      notes: `${SAMPLE_MARKER} Broiler batch demo house`,
    },
  });

  const turkeyHouse = await prisma.poultryHouse.create({
    data: {
      name: poultryHouseNames[2],
      type: "turkey",
      capacity: 300,
      status: "inactive",
      notes: `${SAMPLE_MARKER} Seasonal turkey house for completed flock history`,
    },
  });

  const layerFlock = await prisma.poultryFlock.create({
    data: {
      poultry_house_id: layerHouse.id,
      flock_code: poultryFlockCodes[0],
      bird_type: "layer",
      breed: "Isa Brown",
      start_date: monthsAgo(4, 5),
      initial_bird_count: 1050,
      source: "Premier Chicks Ltd",
      purpose: "egg",
      status: "active",
      notes: `${SAMPLE_MARKER} High-output egg flock`,
    },
  });

  const broilerFlock = await prisma.poultryFlock.create({
    data: {
      poultry_house_id: broilerHouse.id,
      flock_code: poultryFlockCodes[1],
      bird_type: "broiler",
      breed: "Cobb 500",
      start_date: monthsAgo(2, 14),
      initial_bird_count: 820,
      source: "Sunrise Hatchery",
      purpose: "meat",
      status: "active",
      notes: `${SAMPLE_MARKER} Fast-growing broiler batch`,
    },
  });

  const turkeyFlock = await prisma.poultryFlock.create({
    data: {
      poultry_house_id: turkeyHouse.id,
      flock_code: poultryFlockCodes[2],
      bird_type: "turkey",
      breed: "Broad Breasted Bronze",
      start_date: monthsAgo(8, 10),
      initial_bird_count: 180,
      source: "Heritage Poultry Co",
      purpose: "meat",
      status: "completed",
      notes: `${SAMPLE_MARKER} Completed seasonal turkey flock`,
    },
  });

  const dailyLogs = [];
  for (let i = 13; i >= 0; i -= 1) {
    dailyLogs.push({
      flock_id: layerFlock.id,
      log_date: daysAgo(i),
      eggs_collected: 760 + (13 - i) * 6,
      bad_eggs: i % 3,
      mortality_count: i === 10 ? 2 : i === 4 ? 1 : 0,
      culled_count: i === 7 ? 1 : 0,
      feed_consumed: 98 + (13 - i) * 1.4,
      water_consumed: 175 + (13 - i) * 2.5,
      avg_weight: 1.82 + (13 - i) * 0.01,
      temperature: 27 + ((13 - i) % 4),
      notes: `${SAMPLE_MARKER} Layer flock daily production`,
    });
    dailyLogs.push({
      flock_id: broilerFlock.id,
      log_date: daysAgo(i),
      eggs_collected: 0,
      bad_eggs: 0,
      mortality_count: i === 11 ? 3 : i === 3 ? 2 : 1,
      culled_count: i === 5 ? 2 : 0,
      feed_consumed: 82 + (13 - i) * 2.2,
      water_consumed: 150 + (13 - i) * 3.4,
      avg_weight: 2.1 + (13 - i) * 0.07,
      temperature: 28 + ((13 - i) % 3),
      notes: `${SAMPLE_MARKER} Broiler flock daily production`,
    });
  }

  await prisma.poultryDailyLog.createMany({ data: dailyLogs });

  await prisma.poultryFeedLog.createMany({
    data: [
      {
        flock_id: layerFlock.id,
        log_date: daysAgo(10),
        feed_type: "Layer mash",
        quantity: 350,
        unit: "kg",
        cost: 168000,
        supplier: "AgroFeeds Depot",
        notes: `${SAMPLE_MARKER} Weekly feed restock`,
      },
      {
        flock_id: layerFlock.id,
        log_date: daysAgo(3),
        feed_type: "Layer mash",
        quantity: 320,
        unit: "kg",
        cost: 153600,
        supplier: "AgroFeeds Depot",
        notes: `${SAMPLE_MARKER} Mid-cycle restock`,
      },
      {
        flock_id: broilerFlock.id,
        log_date: daysAgo(8),
        feed_type: "Finisher mash",
        quantity: 420,
        unit: "kg",
        cost: 201600,
        supplier: "Sunrise Feeds",
        notes: `${SAMPLE_MARKER} Broiler finisher delivery`,
      },
      {
        flock_id: turkeyFlock.id,
        log_date: monthsAgo(6, 12),
        feed_type: "Turkey grower",
        quantity: 180,
        unit: "kg",
        cost: 104400,
        supplier: "Heritage Poultry Co",
        notes: `${SAMPLE_MARKER} Historical completed flock feed`,
      },
    ],
  });

  await prisma.poultryHealthLog.createMany({
    data: [
      {
        flock_id: layerFlock.id,
        log_date: daysAgo(9),
        issue_type: "Vaccination",
        symptoms: "Routine Newcastle prevention",
        affected_count: 1050,
        treatment: "Scheduled vaccination round",
        medication: null,
        vaccination: "Lasota",
        notes: `${SAMPLE_MARKER} Routine preventive schedule`,
      },
      {
        flock_id: broilerFlock.id,
        log_date: daysAgo(4),
        issue_type: "Heat stress",
        symptoms: "Panting and reduced feed intake",
        affected_count: 46,
        treatment: "Electrolytes and added ventilation",
        medication: "Vitamin-electrolyte mix",
        vaccination: null,
        notes: `${SAMPLE_MARKER} Contained with same-day intervention`,
      },
      {
        flock_id: turkeyFlock.id,
        log_date: monthsAgo(5, 18),
        issue_type: "Deworming",
        symptoms: "Routine parasite control",
        affected_count: 180,
        treatment: "Scheduled deworming",
        medication: "Albendazole",
        vaccination: null,
        notes: `${SAMPLE_MARKER} Historical preventive treatment`,
      },
    ],
  });

  await prisma.poultrySale.createMany({
    data: [
      {
        flock_id: layerFlock.id,
        sale_date: daysAgo(6),
        sale_type: "eggs",
        quantity: 128,
        unit_price: 4500,
        total_amount: 576000,
        buyer: "CityMart Stores",
        payment_status: "paid",
        notes: `${SAMPLE_MARKER} Weekly tray sale`,
      },
      {
        flock_id: layerFlock.id,
        sale_date: daysAgo(1),
        sale_type: "eggs",
        quantity: 136,
        unit_price: 4600,
        total_amount: 625600,
        buyer: "Fresh Basket Retail",
        payment_status: "paid",
        notes: `${SAMPLE_MARKER} Weekend egg dispatch`,
      },
      {
        flock_id: broilerFlock.id,
        sale_date: daysAgo(3),
        sale_type: "live_birds",
        quantity: 90,
        unit_price: 9800,
        total_amount: 882000,
        buyer: "Kubwa Meat Hub",
        payment_status: "partial",
        notes: `${SAMPLE_MARKER} Partial live bird off-take`,
      },
      {
        flock_id: null,
        sale_date: daysAgo(2),
        sale_type: "manure",
        quantity: 35,
        unit_price: 2500,
        total_amount: 87500,
        buyer: "RootGrow Farms",
        payment_status: "paid",
        notes: `${SAMPLE_MARKER} General poultry manure sale`,
      },
    ],
  });

  await prisma.poultryExpense.createMany({
    data: [
      {
        flock_id: layerFlock.id,
        expense_date: daysAgo(11),
        category: "feed",
        amount: 168000,
        description: `${SAMPLE_MARKER} Layer mash purchase`,
      },
      {
        flock_id: broilerFlock.id,
        expense_date: daysAgo(8),
        category: "feed",
        amount: 201600,
        description: `${SAMPLE_MARKER} Finisher mash purchase`,
      },
      {
        flock_id: broilerFlock.id,
        expense_date: daysAgo(4),
        category: "medication",
        amount: 28000,
        description: `${SAMPLE_MARKER} Heat stress supplements`,
      },
      {
        flock_id: null,
        expense_date: daysAgo(2),
        category: "utilities",
        amount: 45000,
        description: `${SAMPLE_MARKER} Poultry section water and power allocation`,
      },
    ],
  });

  return {
    layerHouse,
    broilerHouse,
    turkeyHouse,
  };
}

async function seedGoatSampleData() {
  const breedingPen = await prisma.goatPen.create({
    data: {
      name: goatPenNames[0],
      type: "breeding",
      capacity: 12,
      status: "active",
      notes: `${SAMPLE_MARKER} Demo breeding pen`,
    },
  });

  const kidsPen = await prisma.goatPen.create({
    data: {
      name: goatPenNames[1],
      type: "kids",
      capacity: 16,
      status: "active",
      notes: `${SAMPLE_MARKER} Demo kids pen`,
    },
  });

  const fatteningPen = await prisma.goatPen.create({
    data: {
      name: goatPenNames[2],
      type: "fattening",
      capacity: 10,
      status: "active",
      notes: `${SAMPLE_MARKER} Demo fattening pen`,
    },
  });

  const goats = {};
  goats.doeA = await prisma.goat.create({
    data: {
      tag_number: goatTagNumbers[0],
      name: "Binta",
      breed: "Red Sokoto",
      sex: "female",
      date_of_birth: monthsAgo(30, 12),
      acquisition_date: monthsAgo(24, 9),
      source: "Tanner breeder line",
      pen_id: breedingPen.id,
      status: "active",
      current_weight: 39.5,
      notes: `${SAMPLE_MARKER} Productive breeding doe`,
    },
  });
  goats.doeB = await prisma.goat.create({
    data: {
      tag_number: goatTagNumbers[1],
      name: "Zara",
      breed: "Boer Cross",
      sex: "female",
      date_of_birth: monthsAgo(22, 4),
      acquisition_date: monthsAgo(18, 2),
      source: "Northern Livestock Market",
      pen_id: breedingPen.id,
      status: "active",
      current_weight: 44.2,
      notes: `${SAMPLE_MARKER} Heavy doe for meat and breeding`,
    },
  });
  goats.doeC = await prisma.goat.create({
    data: {
      tag_number: goatTagNumbers[2],
      name: "Lami",
      breed: "Sahel",
      sex: "female",
      date_of_birth: monthsAgo(20, 18),
      acquisition_date: monthsAgo(14, 6),
      source: "Kano breeders cooperative",
      pen_id: breedingPen.id,
      status: "active",
      current_weight: 36.7,
      notes: `${SAMPLE_MARKER} Currently in pregnancy watch window`,
    },
  });
  goats.buckA = await prisma.goat.create({
    data: {
      tag_number: goatTagNumbers[3],
      name: "Sarki",
      breed: "Boer",
      sex: "male",
      date_of_birth: monthsAgo(28, 10),
      acquisition_date: monthsAgo(20, 5),
      source: "Premier Goat Ranch",
      pen_id: breedingPen.id,
      status: "active",
      current_weight: 61.3,
      notes: `${SAMPLE_MARKER} Primary breeding buck`,
    },
  });
  goats.kidA = await prisma.goat.create({
    data: {
      tag_number: goatTagNumbers[4],
      name: "Koko",
      breed: "Red Sokoto",
      sex: "female",
      date_of_birth: monthsAgo(2, 22),
      acquisition_date: monthsAgo(2, 22),
      source: "Born on farm",
      pen_id: kidsPen.id,
      status: "active",
      current_weight: 12.8,
      notes: `${SAMPLE_MARKER} Sample kid doe`,
    },
  });
  goats.kidB = await prisma.goat.create({
    data: {
      tag_number: goatTagNumbers[5],
      name: "Rafi",
      breed: "Boer Cross",
      sex: "male",
      date_of_birth: monthsAgo(2, 22),
      acquisition_date: monthsAgo(2, 22),
      source: "Born on farm",
      pen_id: kidsPen.id,
      status: "active",
      current_weight: 14.1,
      notes: `${SAMPLE_MARKER} Sample kid buck`,
    },
  });
  goats.fattening = await prisma.goat.create({
    data: {
      tag_number: goatTagNumbers[6],
      name: "Musa",
      breed: "Sahel Cross",
      sex: "male",
      date_of_birth: monthsAgo(16, 7),
      acquisition_date: monthsAgo(10, 12),
      source: "Kaduna livestock market",
      pen_id: fatteningPen.id,
      status: "active",
      current_weight: 48.9,
      notes: `${SAMPLE_MARKER} Fattening pen sample goat`,
    },
  });
  goats.sold = await prisma.goat.create({
    data: {
      tag_number: goatTagNumbers[7],
      name: "Hauwa",
      breed: "Red Sokoto",
      sex: "female",
      date_of_birth: monthsAgo(18, 16),
      acquisition_date: monthsAgo(12, 8),
      source: "Tanner breeder line",
      pen_id: fatteningPen.id,
      status: "sold",
      current_weight: 41.2,
      notes: `${SAMPLE_MARKER} Sold goat retained for historical sales view`,
    },
  });

  await prisma.goatBreedingLog.createMany({
    data: [
      {
        doe_goat_id: goats.doeA.id,
        buck_goat_id: goats.buckA.id,
        mating_date: monthsAgo(5, 4),
        expected_kidding_date: monthsAgo(0, 18),
        actual_kidding_date: monthsAgo(2, 22),
        kids_born_count: 2,
        kids_alive_count: 2,
        notes: `${SAMPLE_MARKER} Successful kidding for Binta`,
      },
      {
        doe_goat_id: goats.doeB.id,
        buck_goat_id: goats.buckA.id,
        mating_date: monthsAgo(7, 9),
        expected_kidding_date: monthsAgo(2, 1),
        actual_kidding_date: monthsAgo(2, 2),
        kids_born_count: 3,
        kids_alive_count: 2,
        notes: `${SAMPLE_MARKER} One kid lost after birth`,
      },
      {
        doe_goat_id: goats.doeC.id,
        buck_goat_id: goats.buckA.id,
        mating_date: weeksAgo(8),
        expected_kidding_date: weeksAgo(-13),
        actual_kidding_date: null,
        kids_born_count: 0,
        kids_alive_count: 0,
        notes: `${SAMPLE_MARKER} Recent mating; doe should appear as pregnant estimate`,
      },
    ],
  });

  await prisma.goatHealthLog.createMany({
    data: [
      {
        goat_id: goats.doeA.id,
        log_date: daysAgo(21),
        issue_type: "Vaccination",
        symptoms: "Routine PPR vaccination",
        treatment: "Preventive schedule",
        medication: null,
        vaccination: "PPR booster",
        deworming: null,
        vet_notes: `${SAMPLE_MARKER} Routine vaccination completed`,
      },
      {
        goat_id: goats.fattening.id,
        log_date: daysAgo(6),
        issue_type: "Digestive upset",
        symptoms: "Reduced appetite and loose stool",
        treatment: "Oral rehydration and ration adjustment",
        medication: "Probiotic mix",
        vaccination: null,
        deworming: null,
        vet_notes: `${SAMPLE_MARKER} Responded within 48 hours`,
      },
      {
        goat_id: goats.kidA.id,
        log_date: daysAgo(12),
        issue_type: "Deworming",
        symptoms: "Routine parasite control",
        treatment: "Scheduled deworming",
        medication: null,
        vaccination: null,
        deworming: "Albendazole oral dose",
        vet_notes: `${SAMPLE_MARKER} Preventive treatment for kids pen`,
      },
    ],
  });

  const weightLogs = [];
  const weightedGoats = [goats.doeA, goats.doeB, goats.doeC, goats.fattening, goats.kidA, goats.kidB];
  weightedGoats.forEach((goat, index) => {
    for (let month = 5; month >= 0; month -= 1) {
      weightLogs.push({
        goat_id: goat.id,
        log_date: monthsAgo(month, 6 + index),
        weight: Number((goat.current_weight - month * (index < 4 ? 1.4 : 0.6)).toFixed(1)),
        notes: `${SAMPLE_MARKER} Monthly weigh-in`,
      });
    }
  });
  await prisma.goatWeightLog.createMany({ data: weightLogs });

  await prisma.goatFeedLog.createMany({
    data: [
      {
        goat_id: null,
        pen_id: breedingPen.id,
        log_date: daysAgo(5),
        feed_type: "Concentrate mix",
        quantity: 32,
        unit: "kg",
        cost: 28160,
        notes: `${SAMPLE_MARKER} Concentrate top-up for breeding pen`,
      },
      {
        goat_id: null,
        pen_id: breedingPen.id,
        log_date: daysAgo(3),
        feed_type: "Hay + legume mix",
        quantity: 85,
        unit: "kg",
        cost: 34000,
        notes: `${SAMPLE_MARKER} Weekly breeding pen ration`,
      },
      {
        goat_id: null,
        pen_id: kidsPen.id,
        log_date: daysAgo(2),
        feed_type: "Kid starter mash",
        quantity: 42,
        unit: "kg",
        cost: 17600,
        notes: `${SAMPLE_MARKER} Kids pen ration`,
      },
      {
        goat_id: null,
        pen_id: fatteningPen.id,
        log_date: daysAgo(1),
        feed_type: "Fattening ration",
        quantity: 58,
        unit: "kg",
        cost: 52200,
        notes: `${SAMPLE_MARKER} Pen ration for fattening group`,
      },
    ],
  });

  await prisma.goatSale.createMany({
    data: [
      {
        goat_id: goats.sold.id,
        sale_date: weeksAgo(3),
        sale_type: "Live sale",
        amount: 118000,
        buyer: "Wuse Livestock Traders",
        payment_status: "paid",
        notes: `${SAMPLE_MARKER} Demo historical goat sale`,
      },
      {
        goat_id: goats.fattening.id,
        sale_date: daysAgo(4),
        sale_type: "Breeding reservation",
        amount: 45000,
        buyer: "Jabi Ranch Collective",
        payment_status: "pending",
        notes: `${SAMPLE_MARKER} Deposit awaiting balance`,
      },
    ],
  });

  await prisma.goatExpense.createMany({
    data: [
      {
        goat_id: goats.doeA.id,
        pen_id: null,
        expense_date: daysAgo(20),
        category: "vaccination",
        amount: 9500,
        description: `${SAMPLE_MARKER} PPR vaccination cost allocation`,
      },
      {
        goat_id: null,
        pen_id: breedingPen.id,
        expense_date: daysAgo(3),
        category: "feed",
        amount: 34000,
        description: `${SAMPLE_MARKER} Breeding pen hay and legume ration`,
      },
      {
        goat_id: goats.fattening.id,
        pen_id: null,
        expense_date: daysAgo(6),
        category: "medication",
        amount: 7800,
        description: `${SAMPLE_MARKER} Digestive treatment`,
      },
      {
        goat_id: null,
        pen_id: kidsPen.id,
        expense_date: daysAgo(2),
        category: "feed",
        amount: 17600,
        description: `${SAMPLE_MARKER} Kids pen starter mash`,
      },
    ],
  });

  return {
    breedingPen,
    kidsPen,
    fatteningPen,
  };
}

async function seedWorkerSampleData({ poultry, goats }) {
  await prisma.entityRecord.createMany({
    data: [
      {
        id: poultryWorkerSampleIds[0],
        entity: "PoultryWorker",
        data: {
          id: poultryWorkerSampleIds[0],
          full_name: "Amina Yusuf",
          role: "Poultry Supervisor",
          phone: "+2348011112201",
          poultry_house_id: poultry.layerHouse.id,
          status: "active",
          salary: 135000,
          hire_date: monthsAgo(14, 6).toISOString().slice(0, 10),
          notes: `${SAMPLE_MARKER} Oversees egg production operations`,
        },
      },
      {
        id: poultryWorkerSampleIds[1],
        entity: "PoultryWorker",
        data: {
          id: poultryWorkerSampleIds[1],
          full_name: "Moses Daniel",
          role: "Feed Attendant",
          phone: "+2348011112202",
          poultry_house_id: poultry.broilerHouse.id,
          status: "active",
          salary: 92000,
          hire_date: monthsAgo(7, 10).toISOString().slice(0, 10),
          notes: `${SAMPLE_MARKER} Handles ration prep and feed delivery`,
        },
      },
      {
        id: poultryWorkerSampleIds[2],
        entity: "PoultryWorker",
        data: {
          id: poultryWorkerSampleIds[2],
          full_name: "Ruth Okeke",
          role: "Vaccination Assistant",
          phone: "+2348011112203",
          poultry_house_id: null,
          status: "on_leave",
          salary: 88000,
          hire_date: monthsAgo(10, 18).toISOString().slice(0, 10),
          notes: `${SAMPLE_MARKER} Shared support worker across poultry houses`,
        },
      },
      {
        id: goatWorkerSampleIds[0],
        entity: "GoatWorker",
        data: {
          id: goatWorkerSampleIds[0],
          full_name: "Sule Garba",
          role: "Goat Herdsman",
          phone: "+2348022223301",
          pen_id: goats.breedingPen.id,
          status: "active",
          salary: 118000,
          hire_date: monthsAgo(16, 9).toISOString().slice(0, 10),
          notes: `${SAMPLE_MARKER} Leads breeding pen handling and observations`,
        },
      },
      {
        id: goatWorkerSampleIds[1],
        entity: "GoatWorker",
        data: {
          id: goatWorkerSampleIds[1],
          full_name: "Patience Bello",
          role: "Kids Pen Attendant",
          phone: "+2348022223302",
          pen_id: goats.kidsPen.id,
          status: "active",
          salary: 97000,
          hire_date: monthsAgo(9, 14).toISOString().slice(0, 10),
          notes: `${SAMPLE_MARKER} Focuses on kid feeding and daily checks`,
        },
      },
      {
        id: goatWorkerSampleIds[2],
        entity: "GoatWorker",
        data: {
          id: goatWorkerSampleIds[2],
          full_name: "Ibrahim Tanko",
          role: "Fattening Pen Assistant",
          phone: "+2348022223303",
          pen_id: goats.fatteningPen.id,
          status: "inactive",
          salary: 89000,
          hire_date: monthsAgo(5, 3).toISOString().slice(0, 10),
          notes: `${SAMPLE_MARKER} Sample inactive goat worker for status demos`,
        },
      },
    ],
  });
}

async function main() {
  console.log("Resetting previous poultry/goat sample data...");
  await resetPoultrySampleData();
  await resetGoatSampleData();
  await resetWorkerSampleData();

  console.log("Seeding poultry sample data...");
  const poultrySeed = await seedPoultrySampleData();

  console.log("Seeding goat sample data...");
  const goatSeed = await seedGoatSampleData();

  console.log("Seeding worker sample data...");
  await seedWorkerSampleData({ poultry: poultrySeed, goats: goatSeed });

  const [poultryHouseCount, poultryFlockCount, goatPenCount, goatCount, poultryWorkerCount, goatWorkerCount] = await Promise.all([
    prisma.poultryHouse.count({ where: { name: { in: poultryHouseNames } } }),
    prisma.poultryFlock.count({ where: { flock_code: { in: poultryFlockCodes } } }),
    prisma.goatPen.count({ where: { name: { in: goatPenNames } } }),
    prisma.goat.count({ where: { tag_number: { in: goatTagNumbers } } }),
    prisma.entityRecord.count({ where: { entity: "PoultryWorker", id: { in: poultryWorkerSampleIds } } }),
    prisma.entityRecord.count({ where: { entity: "GoatWorker", id: { in: goatWorkerSampleIds } } }),
  ]);

  console.log(
    `Done. Poultry sample data: ${poultryHouseCount} houses, ${poultryFlockCount} flocks, ${poultryWorkerCount} workers. Goat sample data: ${goatPenCount} pens, ${goatCount} goats, ${goatWorkerCount} workers.`
  );
}

main()
  .catch((error) => {
    console.error("Failed to seed module sample data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
