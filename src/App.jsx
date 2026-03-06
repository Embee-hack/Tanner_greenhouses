import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import LoginScreen from '@/components/LoginScreen';
import AccessDenied from '@/components/AccessDenied';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const adminOnlyPages = new Set(["Sales", "Expenses", "Compare", "Workers", "UserManagement"]);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, checkAppState } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return <LoginScreen onSuccess={checkAppState} />;
    } else if (authError.type === 'unknown') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="w-full max-w-lg border border-border rounded-xl bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Unable to load app</h2>
            <p className="text-sm text-muted-foreground">
              {authError.message || "The frontend cannot reach the API right now."}
            </p>
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

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              {adminOnlyPages.has(path) && user?.role !== "admin" ? <AccessDenied /> : <Page />}
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
