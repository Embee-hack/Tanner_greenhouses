import { Fragment } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { queryClientInstance } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { CurrencyProvider } from "@/components/shared/CurrencyProvider.jsx";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import LoginScreen from "@/components/LoginScreen";
import AccessDenied from "@/components/AccessDenied";
import PageNotFound from "@/lib/PageNotFound";
import { isAdminUser } from "@/lib/roles.js";
import ModuleShell from "@/layouts/ModuleShell.jsx";
import ModuleSelector from "@/modules/hub/pages/ModuleSelector.jsx";
import { greenhouseLayout, greenhouseMainPage, greenhousePages } from "@/modules/greenhouse";
import { poultryNavItems } from "@/modules/poultry/config.js";
import { goatNavItems } from "@/modules/goats/config.js";
import PoultryDashboard from "@/modules/poultry/pages/PoultryDashboard.jsx";
import PoultryHouses from "@/modules/poultry/pages/PoultryHouses.jsx";
import PoultryFlocks from "@/modules/poultry/pages/PoultryFlocks.jsx";
import PoultryDailyLogs from "@/modules/poultry/pages/PoultryDailyLogs.jsx";
import PoultryFeedRecords from "@/modules/poultry/pages/PoultryFeedRecords.jsx";
import PoultryHealthRecords from "@/modules/poultry/pages/PoultryHealthRecords.jsx";
import PoultryWorkers from "@/modules/poultry/pages/PoultryWorkers.jsx";
import PoultrySales from "@/modules/poultry/pages/PoultrySales.jsx";
import PoultryExpenses from "@/modules/poultry/pages/PoultryExpenses.jsx";
import PoultryAnalytics from "@/modules/poultry/pages/PoultryAnalytics.jsx";
import GoatDashboard from "@/modules/goats/pages/GoatDashboard.jsx";
import GoatPens from "@/modules/goats/pages/GoatPens.jsx";
import GoatRegistry from "@/modules/goats/pages/GoatRegistry.jsx";
import GoatBreeding from "@/modules/goats/pages/GoatBreeding.jsx";
import GoatHealthRecords from "@/modules/goats/pages/GoatHealthRecords.jsx";
import GoatWeightLogs from "@/modules/goats/pages/GoatWeightLogs.jsx";
import GoatFeedRecords from "@/modules/goats/pages/GoatFeedRecords.jsx";
import GoatWorkers from "@/modules/goats/pages/GoatWorkers.jsx";
import GoatSales from "@/modules/goats/pages/GoatSales.jsx";
import GoatExpenses from "@/modules/goats/pages/GoatExpenses.jsx";
import GoatAnalytics from "@/modules/goats/pages/GoatAnalytics.jsx";
import ActivityLogPage from "@/pages/ActivityLog.jsx";

const GreenhouseLayout = greenhouseLayout;
const greenhouseMainPageKey = greenhouseMainPage ?? Object.keys(greenhousePages)[0];
const adminOnlyGreenhousePages = new Set(["Compare", "UserManagement", "ActivityLog"]);

const GreenhouseLayoutWrapper = ({ children, currentPageName }) =>
  GreenhouseLayout ? <GreenhouseLayout currentPageName={currentPageName}>{children}</GreenhouseLayout> : <>{children}</>;

const GreenhouseRouteElement = ({ pageName, Page, user }) => (
  <GreenhouseLayoutWrapper currentPageName={pageName}>
    {adminOnlyGreenhousePages.has(pageName) && !isAdminUser(user) ? <AccessDenied /> : <Page />}
  </GreenhouseLayoutWrapper>
);

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, checkAppState } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    }
    if (authError.type === "auth_required") {
      return <LoginScreen onSuccess={checkAppState} />;
    }
    if (authError.type === "unknown") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="console-glass w-full max-w-lg border rounded-2xl bg-card/90 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Unable to load app</h2>
            <p className="text-sm text-muted-foreground">{authError.message || "The frontend cannot reach the API right now."}</p>
            <p className="text-xs text-muted-foreground">
              Check Render environment variables (`VITE_API_BASE_URL`, `CLIENT_ORIGIN`, `PUBLIC_BASE_URL`) and redeploy.
            </p>
            <div className="pt-2">
              <button
                onClick={checkAppState}
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/modules" replace />} />
      <Route path="/modules" element={<ModuleSelector />} />
      <Route path="/greenhouse" element={<Navigate to={`/${greenhouseMainPageKey}`} replace />} />

      <Route path="/poultry" element={<ModuleShell moduleKey="poultry" navItems={poultryNavItems} />}>
        <Route index element={<PoultryDashboard />} />
        <Route path="houses" element={<PoultryHouses />} />
        <Route path="flocks" element={<PoultryFlocks />} />
        <Route path="daily-logs" element={<PoultryDailyLogs />} />
        <Route path="feed-records" element={<PoultryFeedRecords />} />
        <Route path="health-records" element={<PoultryHealthRecords />} />
        <Route path="workers" element={<PoultryWorkers />} />
        <Route path="sales" element={<PoultrySales />} />
        <Route path="expenses" element={<PoultryExpenses />} />
        <Route path="analytics" element={isAdminUser(user) ? <PoultryAnalytics /> : <AccessDenied />} />
      </Route>

      <Route path="/goats" element={<ModuleShell moduleKey="goats" navItems={goatNavItems} />}>
        <Route index element={<GoatDashboard />} />
        <Route path="pens" element={<GoatPens />} />
        <Route path="registry" element={<GoatRegistry />} />
        <Route path="breeding" element={<GoatBreeding />} />
        <Route path="health-records" element={<GoatHealthRecords />} />
        <Route path="weight-logs" element={<GoatWeightLogs />} />
        <Route path="feed-records" element={<GoatFeedRecords />} />
        <Route path="workers" element={<GoatWorkers />} />
        <Route path="sales" element={<GoatSales />} />
        <Route path="expenses" element={<GoatExpenses />} />
        <Route path="analytics" element={isAdminUser(user) ? <GoatAnalytics /> : <AccessDenied />} />
      </Route>

      <Route
        path="/ActivityLog"
        element={<GreenhouseRouteElement pageName="ActivityLog" Page={ActivityLogPage} user={user} />}
      />
      <Route
        path="/greenhouse/ActivityLog"
        element={<GreenhouseRouteElement pageName="ActivityLog" Page={ActivityLogPage} user={user} />}
      />

      {Object.entries(greenhousePages).map(([pageName, Page]) => (
        <Fragment key={pageName}>
          <Route path={`/${pageName}`} element={<GreenhouseRouteElement pageName={pageName} Page={Page} user={user} />} />
          <Route
            path={`/greenhouse/${pageName}`}
            element={<GreenhouseRouteElement pageName={pageName} Page={Page} user={user} />}
          />
        </Fragment>
      ))}

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <CurrencyProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </CurrencyProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
