import { ShieldX } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="console-glass w-full max-w-md bg-card/90 border rounded-2xl p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-danger/14 text-danger flex items-center justify-center mb-4">
          <ShieldX className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Access Restricted</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Your current role does not have permission to view this page.
        </p>
      </div>
    </div>
  );
}
