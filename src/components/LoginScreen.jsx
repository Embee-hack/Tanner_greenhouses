import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginScreen({ onSuccess }) {
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [hasUsers, setHasUsers] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    base44.auth.bootstrap()
      .then((result) => {
        setHasUsers(Boolean(result?.has_users));
      })
      .catch((err) => {
        setError(err?.message || "Failed to load authentication state");
      })
      .finally(() => setLoadingBootstrap(false));
  }, []);

  const handleLogin = async () => {
    setError("");
    setSubmitting(true);
    try {
      await base44.auth.login(email, password);
      await onSuccess?.();
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetup = async () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await base44.auth.setup({
        email,
        password,
        full_name: fullName || undefined,
      });
      await onSuccess?.();
    } catch (err) {
      setError(err?.message || "Setup failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingBootstrap) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">{hasUsers ? "Sign In" : "Set Up Admin Account"}</h1>
          <p className="text-sm text-slate-600 mt-1">
            {hasUsers
              ? "Use your account credentials to access the dashboard."
              : "Create the first admin account for this self-hosted instance."}
          </p>
        </div>

        <div className="space-y-3">
          {!hasUsers && (
            <Input
              placeholder="Full name (optional)"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={hasUsers ? "current-password" : "new-password"}
          />
          {!hasUsers && (
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          )}
        </div>

        {error && (
          <div className="text-sm rounded-lg px-3 py-2 bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <Button
          className="w-full"
          onClick={hasUsers ? handleLogin : handleSetup}
          disabled={submitting || !email || !password || (!hasUsers && !confirmPassword)}
        >
          {submitting
            ? hasUsers
              ? "Signing in..."
              : "Setting up..."
            : hasUsers
              ? "Sign In"
              : "Create Admin Account"}
        </Button>
      </div>
    </div>
  );
}
