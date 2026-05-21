const pageHelp = {
  Dashboard: {
    title: "Dashboard",
    purpose: "Use this as the farm command center for live KPIs, urgent issues, scheduled work, harvest trends, and greenhouse performance.",
    steps: [
      "Review the KPI cards first to spot plant count, harvest, revenue, cost, or incident changes.",
      "Use alerts and upcoming work to decide what needs attention today.",
      "Open greenhouse performance tiles when you need house-level detail.",
    ],
  },
  Greenhouses: {
    title: "Greenhouses",
    purpose: "Register physical houses, blocks, capacity, status, and structure details.",
    steps: [
      "Add one record per greenhouse before creating crop cycles or logs.",
      "Use blocks when a greenhouse is split into operational sections.",
      "Keep status current so dashboards and comparisons stay accurate.",
    ],
  },
  GreenhouseDailyLogs: {
    title: "Daily Logs",
    purpose: "Capture daily greenhouse work such as irrigation, fertigation, spraying, pruning, observations, and operational notes.",
    steps: [
      "Create one log per greenhouse per day where possible.",
      "Record chemicals and treatments on the day they happen.",
      "Use notes for exceptions the manager should review later.",
    ],
  },
  CropCycles: {
    title: "Crop Cycles",
    purpose: "Track what crop and variety is active in each greenhouse from planting through completion.",
    steps: [
      "Create crop types and varieties in the catalog first.",
      "Start a cycle when planting begins and mark it complete or abandoned when finished.",
      "Select active cycles from harvest and log forms to keep records linked.",
    ],
  },
  Harvests: {
    title: "Harvest & Sales",
    purpose: "Record harvest volume and grade-based sales in one workflow.",
    steps: [
      "Select greenhouse, active cycle, crop type, and variety.",
      "Enter harvested kg by grade, then sold kg and price per kg for each grade.",
      "Revenue and unsold kg calculate automatically; linked sales reports update from the saved grade rows.",
    ],
  },
  Inventory: {
    title: "Inventory",
    purpose: "Track farm supplies, quantities, purchase dates, suppliers, cost, and low-stock alerts.",
    steps: [
      "Add items with unit, quantity, reorder level, unit cost, supplier, and purchase date.",
      "Use Adjust Stock for quick additions or removals.",
      "Watch low-stock cards and alerts to reorder before supplies run out.",
    ],
  },
  NurseryBatches: {
    title: "Nursery Batches",
    purpose: "Track seed batches, tray usage, nursery location, germination, and transplant readiness.",
    steps: [
      "Create a batch when seeds are started.",
      "Update batch status as it moves from active nursery care to transplanted or failed.",
      "Use the batch record to connect nursery work back to greenhouse planning.",
    ],
  },
  NurseryDailyLogs: {
    title: "Nursery Daily Logs",
    purpose: "Record daily nursery care including irrigation, fertigation, pest observations, and batch conditions.",
    steps: [
      "Add daily entries for active nursery work.",
      "Use filters to review recent activity by batch or date.",
      "Keep notes concise and factual so transplant decisions are easier.",
    ],
  },
  Incidents: {
    title: "Incident Log",
    purpose: "Log pests, diseases, structural damage, natural disasters, and other issues that need follow-up.",
    steps: [
      "Create incidents as soon as they are observed and assign severity.",
      "Group related incidents when the same issue affects multiple houses.",
      "Create a response from an incident to track treatment and resolution.",
    ],
  },
  Treatments: {
    title: "Response Log",
    purpose: "Track actions taken against incidents, including treatments, observations, outcomes, and follow-up status.",
    steps: [
      "Start responses from the linked incident when possible.",
      "Record treatment dates, products, responsible users, and observed outcome.",
      "Close or update responses as the issue improves or escalates.",
    ],
  },
  Sales: {
    title: "Sales Reports",
    purpose: "Review sales records, revenue, sold kg, buyers, product trends, and grade-level sale lines.",
    steps: [
      "Use filters by month and product to inspect specific sales periods.",
      "Use chart toggles to compare kg sold versus revenue.",
      "Edit manual sale records here; harvest-linked grade sales are best edited from Harvest & Sales.",
    ],
  },
  Expenses: {
    title: "Expenses",
    purpose: "Record and review farm costs for profit reporting and greenhouse comparisons.",
    steps: [
      "Add expenses with date, category, amount, supplier, and greenhouse when applicable.",
      "Use grouped daily records to audit costs by period.",
      "Keep expenses current so dashboard profit is meaningful.",
    ],
  },
  Workers: {
    title: "Workers",
    purpose: "Manage worker profiles, roles, assignments, contact details, and employment status.",
    steps: [
      "Add workers before using attendance or worker issue workflows.",
      "Use roles to standardize job descriptions.",
      "Keep status and assignment fields current for accurate team reporting.",
    ],
  },
  WorkerAttendance: {
    title: "Attendance Sheet",
    purpose: "Record daily worker attendance, lateness, leave, off days, and linked notes.",
    steps: [
      "Use the daily sheet to mark multiple workers quickly.",
      "Add individual records for corrections or late updates.",
      "Review the current window to spot attendance patterns.",
    ],
  },
  WorkerGrievances: {
    title: "Grievance Log",
    purpose: "Track worker issues, investigations, resolutions, waivers, and surcharges.",
    steps: [
      "Log the issue with worker, date, status, and severity.",
      "Update status as it moves through review and resolution.",
      "Record surcharge or waiver decisions only when confirmed.",
    ],
  },
  FarmCalendar: {
    title: "Farm Calendar",
    purpose: "Plan upcoming farm work, reminders, inspections, harvest dates, treatments, and team activities.",
    steps: [
      "Add dated events for work that should appear in the weekly dashboard.",
      "Assign greenhouse context when the task is house-specific.",
      "Keep completed or outdated plans updated so the dashboard stays relevant.",
    ],
  },
  Compare: {
    title: "Compare",
    purpose: "Compare greenhouse performance using harvest, revenue, cost, plants, and derived productivity metrics.",
    steps: [
      "Select up to eight greenhouses for side-by-side comparison.",
      "Use revenue and harvest metrics together rather than judging one number alone.",
      "Review crop cycle context before making operational decisions.",
    ],
  },
  UserManagement: {
    title: "User Management",
    purpose: "Create and manage app users, roles, and access levels.",
    steps: [
      "Use admin roles only for users who should see finance and management features.",
      "Use farm manager roles for operational users.",
      "Change passwords or deactivate users as team access changes.",
    ],
  },
  ActivityLog: {
    title: "Activity Log",
    purpose: "Audit important system actions such as creates, updates, deletes, logins, and reminders.",
    steps: [
      "Use this when investigating who changed a record.",
      "Filter by record type or date when reviewing recent activity.",
      "Treat delete events as audit evidence, not recoverable backups.",
    ],
  },
  Settings: {
    title: "Settings",
    purpose: "Review setup status and app guidance in one place.",
    steps: [
      "Use the setup checklist to see which launch tasks are complete.",
      "Open the page guide section to understand where each workflow lives.",
      "Return here when onboarding a new manager or checking configuration readiness.",
    ],
  },
};

export const getPageHelp = (pageName) =>
  pageHelp[pageName] || {
    title: pageName || "This page",
    purpose: "Use this page for the workflow shown in the current screen.",
    steps: [
      "Review the page header and primary action first.",
      "Use filters and record actions to narrow, edit, or inspect data.",
      "Save changes from the modal or form before navigating away.",
    ],
  };

export const getAllPageHelp = () => pageHelp;
