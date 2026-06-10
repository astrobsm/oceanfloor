import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../store/auth";
import { ApiError } from "../api/client";
import {
  ALL_ROLES,
  deleteUser,
  listUsers,
  ROLE_LABELS,
  updateUserActive,
  updateUserRole,
  type Role,
  type UserPublic,
} from "../api/auth";

export default function Admin() {
  const { user: me, hasRole } = useAuth();
  const isSuperadmin = me?.role === "superadmin";

  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q) ||
        ROLE_LABELS[u.role].toLowerCase().includes(q)
    );
  }, [users, query]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3500);
  }

  async function handleRoleChange(target: UserPublic, role: Role) {
    setPendingId(target.id);
    setError(null);
    try {
      const updated = await updateUserRole(target.id, role);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      flash(`${updated.username} is now ${ROLE_LABELS[updated.role]}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update role.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleToggleActive(target: UserPublic) {
    setPendingId(target.id);
    setError(null);
    try {
      const updated = await updateUserActive(target.id, !target.is_active);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      flash(
        `${updated.username} ${updated.is_active ? "activated" : "deactivated"}.`
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update status.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(target: UserPublic) {
    if (
      !window.confirm(
        `Permanently delete ${target.username}? This cannot be undone.`
      )
    ) {
      return;
    }
    setPendingId(target.id);
    setError(null);
    try {
      await deleteUser(target.id);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      flash(`${target.username} deleted.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to delete user.");
    } finally {
      setPendingId(null);
    }
  }

  if (!hasRole("admin")) {
    return (
      <div className="page">
        <h2>Access denied</h2>
        <p className="muted">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="page admin-page">
      <header className="page-head">
        <div>
          <h2>User management</h2>
          <p className="muted">
            {isSuperadmin
              ? "Manage roles, activation and accounts across the platform."
              : "Activate or deactivate accounts. Role changes require a super admin."}
          </p>
        </div>
        <input
          className="admin-search"
          type="search"
          placeholder="Search name, username, email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>

      {error && <div className="auth-alert error">{error}</div>}
      {notice && <div className="auth-alert success">{notice}</div>}

      {loading ? (
        <p className="muted">Loading users…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isSelf = u.id === me?.id;
                const busyRow = pendingId === u.id;
                return (
                  <tr key={u.id} className={u.is_active ? "" : "row-inactive"}>
                    <td>
                      <div className="cell-user">
                        <span className="cell-name">
                          {u.full_name || u.username}
                        </span>
                        <span className="cell-sub">@{u.username}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-user">
                        <span className="cell-sub">{u.email}</span>
                        {u.phone && <span className="cell-sub">{u.phone}</span>}
                      </div>
                    </td>
                    <td>
                      {isSuperadmin ? (
                        <select
                          value={u.role}
                          disabled={busyRow}
                          aria-label={`Role for ${u.username}`}
                          title={`Role for ${u.username}`}
                          onChange={(e) =>
                            handleRoleChange(u, e.target.value as Role)
                          }
                        >
                          {ALL_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`role-badge role-${u.role}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-dot ${
                          u.is_active ? "active" : "inactive"
                        }`}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                      {u.must_change_password && (
                        <span className="status-flag">Pending password</span>
                      )}
                    </td>
                    <td className="cell-actions">
                      <button
                        className="btn-ghost-sm"
                        disabled={busyRow || isSelf}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                      {isSuperadmin && (
                        <button
                          className="btn-danger-sm"
                          disabled={busyRow || isSelf}
                          onClick={() => handleDelete(u)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted table-empty">
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
