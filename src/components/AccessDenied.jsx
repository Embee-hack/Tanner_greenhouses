import { ShieldX } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <ShieldX className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Access Restricted</h1>
        <p className="text-sm text-slate-600 mt-2">
          Your current role does not have permission to view this page.
        </p>
      </div>
    </div>
  );
}
