import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Sprout } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LoginScreen({ onSuccess }) {
  const navigate = useNavigate();
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [hasUsers, setHasUsers] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      navigate("/modules", { replace: true });
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
      navigate("/modules", { replace: true });
    } catch (err) {
      setError(err?.message || "Setup failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingBootstrap) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-2 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_34px_hsl(var(--primary)/0.28)]">
          <Sprout className="w-9 h-9 text-primary-foreground" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tanner Farms</h1>
          <p className="text-sm text-muted-foreground">Farm Management System</p>
        </div>
      </div>

      <div className="console-glass w-full max-w-md bg-card/90 border rounded-2xl p-6 space-y-5">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">{hasUsers ? "Sign In" : "Set Up Admin Account"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
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
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={hasUsers ? "current-password" : "new-password"}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {!hasUsers && (
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm rounded-xl px-3 py-2 bg-danger/12 text-danger border border-danger/30">
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

      <p className="mt-6 text-xs text-muted-foreground">Crystal AI Apps</p>
    </div>
  );
}
