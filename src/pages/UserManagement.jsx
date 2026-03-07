import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Shield, User, Upload } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import Modal from "@/components/shared/Modal";

const roleColors = {
  admin: "bg-primary/10 text-primary border-primary/20",
  farm_manager: "bg-muted text-muted-foreground border-border",
};

const roleLabels = {
  admin: "Admin",
  farm_manager: "Farm Manager",
};

const defaultCreateForm = {
  full_name: "",
  email: "",
  password: "",
  role: "farm_manager",
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Promise.all([base44.entities.User.list(), base44.auth.me()]).then(([u, me]) => {
      setUsers(u);
      setCurrentUser(me);
      setLoading(false);
    });
  }, []);

  const openCreateModal = () => {
    setCreateForm(defaultCreateForm);
    setCreateError("");
    setShowCreateModal(true);
  };

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password) return;
    if (createForm.password.length < 8) {
      setCreateError("Password must be at least 8 characters.");
      return;
    }

    setCreating(true);
    setCreateError("");
    try {
      const result = await base44.users.createUser({
        full_name: createForm.full_name || null,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
      });
      if (result?.user) {
        setUsers((prev) => [result.user, ...prev]);
      }
      setShowCreateModal(false);
    } catch (error) {
      setCreateError(error?.message || "Failed to create user.");
    } finally {
      setCreating(false);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ profile_picture: file_url });
    setCurrentUser((prev) => (prev ? { ...prev, profile_picture: file_url } : null));
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, profile_picture: file_url } : u)));
    setUploading(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <PageHeader
        title="User Management"
        subtitle={`${users.length} user${users.length !== 1 ? "s" : ""} in the app`}
        actions={
          <Button size="sm" onClick={openCreateModal}>
            <UserPlus className="w-4 h-4 mr-1" />
            Create User
          </Button>
        }
      />

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border text-xs">
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Role</th>
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t border-border/50">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-muted animate-pulse rounded w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground flex items-center gap-2">
                    {u.profile_picture ? (
                      <img src={u.profile_picture} alt={u.full_name} className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {(u.full_name || u.email || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {u.full_name || "—"}
                      {currentUser?.id === u.id && (
                        <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                          <Upload className="w-3 h-3" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureUpload}
                            disabled={uploading}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <Badge variant="outline" className={`text-xs border ${roleColors[u.role] || roleColors.farm_manager}`}>
                      {u.role === "admin" ? (
                        <Shield className="w-3 h-3 mr-1 inline" />
                      ) : (
                        <User className="w-3 h-3 mr-1 inline" />
                      )}
                      {roleLabels[u.role] || roleLabels.farm_manager}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                    {u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showCreateModal && (
        <Modal open={showCreateModal} title="Create User" onClose={() => setShowCreateModal(false)}>
          <div className="space-y-4">
            {createError && (
              <div className="text-sm rounded-lg px-3 py-2 bg-danger/10 text-danger">
                {createError}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Full name</label>
              <Input
                placeholder="Jane Doe"
                value={createForm.full_name}
                onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email address</label>
              <Input
                type="email"
                placeholder="manager@farm.com"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <Input
                type="password"
                placeholder="Minimum 8 characters"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCreateForm((f) => ({ ...f, role: "farm_manager" }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    createForm.role === "farm_manager" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <User className="w-4 h-4 mb-1 text-muted-foreground" />
                  <div className="font-semibold text-sm">Farm Manager</div>
                  <div className="text-xs text-muted-foreground">Can manage farm operations data</div>
                </button>
                <button
                  onClick={() => setCreateForm((f) => ({ ...f, role: "admin" }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    createForm.role === "admin" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <Shield className="w-4 h-4 mb-1 text-primary" />
                  <div className="font-semibold text-sm">Admin</div>
                  <div className="text-xs text-muted-foreground">Full access and user management</div>
                </button>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={!createForm.email || !createForm.password || creating}>
                <UserPlus className="w-4 h-4 mr-1" />
                {creating ? "Creating..." : "Create User"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
