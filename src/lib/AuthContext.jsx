import React, { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);

      if (error?.status === 401) {
        setAuthError({
          type: "auth_required",
          message: "Please sign in to continue",
        });
      } else {
        setAuthError({
          type: "unknown",
          message: error?.message || "Failed to verify authentication state",
        });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async (shouldRedirect = true) => {
    await base44.auth.logout(shouldRedirect ? window.location.href : undefined);
    setUser(null);
    setIsAuthenticated(false);
    setAuthError({
      type: "auth_required",
      message: "Please sign in to continue",
    });
  };

  const navigateToLogin = () => {
    setAuthError({
      type: "auth_required",
      message: "Please sign in to continue",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
