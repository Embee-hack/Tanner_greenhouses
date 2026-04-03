import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Shield, User, Upload, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import Modal from "@/components/shared/Modal";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog.jsx";
import ErrorBanner from "@/components/shared/ErrorBanner.jsx";
import { getErrorMessage } from "@/lib/errors.js";

const roleColors = {
  admin: "bg-primary/10 text-primary border-primary/20",
  farm_manager: "bg-muted text-muted-foreground border-border",
};

const roleLabels = {
  admin: "Admin",
  farm_manager: "Farm Manager",
};

const defaultUserForm = {
  full_name: "",
  email: "",
  password: "",
  role: "farm_manager",
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [savingUser, setSavingUser] = useState(false);
  const [formError, setFormError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [u, me] = await Promise.all([base44.entities.User.list(), base44.auth.me()]);
      setUsers(u);
      setCurrentUser(me);
      setLoadError("");
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load users."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setUserForm(defaultUserForm);
    setFormError("");
    setShowPassword(false);
    setShowUserModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setUserForm({
      full_name: user.full_name || "",
      email: user.email || "",
      password: "",
      role: user.role || "farm_manager",
    });
    setFormError("");
    setShowPassword(false);
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    setUserForm(defaultUserForm);
    setFormError("");
    setShowPassword(false);
  };

  const handleSaveUser = async () => {
    if (!userForm.email) return;
    if (!editingUser && !userForm.password) return;
    if (userForm.password && userForm.password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    setSavingUser(true);
    setFormError("");
    try {
      if (editingUser) {
        await base44.entities.User.update(editingUser.id, {
          full_name: userForm.full_name || null,
          email: userForm.email,
          role: userForm.role,
          ...(userForm.password ? { password: userForm.password } : {}),
        });
      } else {
        await base44.users.createUser({
          full_name: userForm.full_name || null,
          email: userForm.email,
          password: userForm.password,
          role: userForm.role,
        });
      }
      closeUserModal();
      await load();
    } catch (error) {
      setFormError(error?.message || `Failed to ${editingUser ? "update" : "create"} user.`);
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await base44.entities.User.delete(deleteUser.id);
      setDeleteUser(null);
      if (editingUser?.id === deleteUser.id) {
        closeUserModal();
      }
      await load();
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to delete user."));
    } finally {
      setDeleting(false);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ profile_picture: file_url });
      setCurrentUser((prev) => (prev ? { ...prev, profile_picture: file_url } : null));
      setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, profile_picture: file_url } : u)));
      setLoadError("");
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to update profile picture."));
    } finally {
      setUploading(false);
    }
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

      <ErrorBanner message={loadError} onRetry={load} />

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border text-xs">
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Role</th>
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Joined</th>
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t border-border/50">
                  {Array.from({ length: 5 }).map((_, j) => (
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
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => openEditModal(u)}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-danger hover:text-danger"
                        onClick={() => setDeleteUser(u)}
                        disabled={currentUser?.id === u.id}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showUserModal && (
        <Modal open={showUserModal} title={editingUser ? "Edit User" : "Create User"} onClose={closeUserModal}>
          <div className="space-y-4">
            {formError && (
              <div className="text-sm rounded-lg px-3 py-2 bg-danger/10 text-danger">
                {formError}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Full name</label>
              <Input
                placeholder="Jane Doe"
                value={userForm.full_name}
                onChange={(e) => setUserForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email address</label>
              <Input
                type="email"
                placeholder="manager@farm.com"
                value={userForm.email}
                onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                {editingUser ? "New password" : "Password"}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={editingUser ? "Leave blank to keep current password" : "Minimum 8 characters"}
                  value={userForm.password}
                  onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                  autoComplete="new-password"
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
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setUserForm((f) => ({ ...f, role: "farm_manager" }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    userForm.role === "farm_manager" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <User className="w-4 h-4 mb-1 text-muted-foreground" />
                  <div className="font-semibold text-sm">Farm Manager</div>
                  <div className="text-xs text-muted-foreground">Can manage farm operations data</div>
                </button>
                <button
                  onClick={() => setUserForm((f) => ({ ...f, role: "admin" }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    userForm.role === "admin" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <Shield className="w-4 h-4 mb-1 text-primary" />
                  <div className="font-semibold text-sm">Admin</div>
                  <div className="text-xs text-muted-foreground">Full access and user management</div>
                </button>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={closeUserModal}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveUser}
                disabled={!userForm.email || (!editingUser && !userForm.password) || savingUser}
              >
                <UserPlus className="w-4 h-4 mr-1" />
                {savingUser ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <DeleteConfirmDialog
        open={!!deleteUser}
        onOpenChange={(open) => {
          if (!open) setDeleteUser(null);
        }}
        title="Delete this user?"
        description="This user account will be removed from the app. This action cannot be undone."
        confirmLabel="Delete User"
        loading={deleting}
        onConfirm={handleDeleteUser}
      />
    </div>
  );
}
