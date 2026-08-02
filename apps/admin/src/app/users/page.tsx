"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Columns3,
  GripVertical,
  LayoutList,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { prepareCsrf } from "../auth-client";
import { OperationsHeader } from "../components/operations-header";
import styles from "./page.module.css";

type AccountStatus = "active" | "deactivated" | "restricted" | "deleted";
type StaffRole = "super_admin" | "admin" | "staff" | "user";
type AccountType = "admin" | "staff" | "user";
type Account = {
  id: string;
  name: string;
  email: string;
  staffRole: StaffRole;
  accountStatus: AccountStatus;
  isSelf: boolean;
  createdAt: string | null;
  actions: {
    canEdit: boolean;
    canActivate: boolean;
    canDeactivate: boolean;
    canRestrict: boolean;
    canDelete: boolean;
    canDrag: boolean;
  };
};
type Capabilities = {
  canCreateAdmin: boolean;
  canCreateStaff: boolean;
  canCreateUser: boolean;
  canDeleteAccounts: boolean;
  canManageStatuses: boolean;
  canEditAccounts: boolean;
};
type Directory = {
  items: Account[];
  summary: { total: number; staff: number; active: number; deactivated: number };
  capabilities: Capabilities;
  viewer: { id: string; staffRole: StaffRole | null };
  pagination: { currentPage: number; lastPage: number; total: number };
};

const roleLabel: Record<StaffRole, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  staff: "Staff",
  user: "User",
};

const boardColumns: AccountStatus[] = ["active", "deactivated", "restricted", "deleted"];

export default function UsersDirectoryPage() {
  const [data, setData] = useState<Directory | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [view, setView] = useState<"table" | "board">("table");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | StaffRole>("all");
  const [status, setStatus] = useState<"all" | AccountStatus>("all");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<AccountStatus | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", accountType: "user" as AccountType });
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", accountType: "user" as AccountType });

  const load = useCallback(async () => {
    setState("loading");
    setNotice("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (role !== "all") params.set("role", role);
      if (status !== "all") params.set("status", status);
      params.set("perPage", view === "board" ? "100" : "25");
      const response = await fetch(`/api/v1/admin/marketplace/users?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setData(((await response.json()) as { data: Directory }).data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [query, role, status, view]);

  const createOptions = useMemo(() => {
    if (!data) return [] as AccountType[];
    const options: AccountType[] = [];
    if (data.capabilities.canCreateAdmin) options.push("admin");
    if (data.capabilities.canCreateStaff) options.push("staff");
    if (data.capabilities.canCreateUser) options.push("user");
    return options;
  }, [data]);

  const editOptions = useMemo(() => {
    if (!data) return [] as AccountType[];
    const options: AccountType[] = [];
    if (data.capabilities.canCreateAdmin) options.push("admin");
    if (data.capabilities.canCreateStaff) options.push("staff");
    if (data.capabilities.canCreateUser) options.push("user");
    return options;
  }, [data]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const resolvedCreateType = createOptions.includes(form.accountType)
    ? form.accountType
    : (createOptions[0] ?? "user");

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setNotice("");
    try {
      const token = await prepareCsrf();
      const response = await fetch("/api/v1/admin/marketplace/users", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: JSON.stringify({ ...form, accountType: resolvedCreateType }),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Account could not be created.");
      setForm({ name: "", email: "", password: "", accountType: createOptions[0] ?? "user" });
      setNotice("Account created.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Account could not be created.");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(account: Account) {
    setEditing(account);
    setEditForm({
      name: account.name,
      email: account.email,
      password: "",
      accountType: account.staffRole === "super_admin" ? "admin" : account.staffRole === "user" ? "user" : account.staffRole,
    });
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    setNotice("");
    try {
      const token = await prepareCsrf();
      const payload: Record<string, string> = {
        name: editForm.name,
        email: editForm.email,
        accountType: editForm.accountType,
      };
      if (editForm.password.trim()) payload.password = editForm.password.trim();
      const response = await fetch(`/api/v1/admin/marketplace/users/${editing.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Account could not be updated.");
      setNotice(`${editForm.name} updated.`);
      setEditing(null);
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Account could not be updated.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function runAction(account: Account, action: "activate" | "deactivate" | "delete") {
    if (action === "delete" && !window.confirm(`Delete ${account.name}? They will no longer be able to sign in.`)) return;
    setBusyId(account.id);
    setNotice("");
    try {
      const token = await prepareCsrf();
      const response = await fetch(
        action === "delete"
          ? `/api/v1/admin/marketplace/users/${account.id}`
          : `/api/v1/admin/marketplace/users/${account.id}/${action}`,
        {
          method: action === "delete" ? "DELETE" : "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            ...(token ? { "X-XSRF-TOKEN": token } : {}),
          },
        },
      );
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Action failed.");
      setNotice(`${account.name} updated.`);
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  function canDropAccount(account: Account, nextStatus: AccountStatus): boolean {
    if (account.accountStatus === nextStatus) return false;
    if (account.accountStatus === "deleted") return false;
    if (nextStatus === "deleted") return account.actions.canDelete;
    return account.actions.canDrag;
  }

  async function moveAccount(account: Account, nextStatus: AccountStatus) {
    if (!canDropAccount(account, nextStatus)) {
      setNotice(
        nextStatus === "deleted"
          ? "Only a super admin can move accounts to Deleted."
          : "You cannot move this account.",
      );
      return;
    }
    if (nextStatus === "deleted" && !window.confirm(`Delete ${account.name}? They will no longer be able to sign in.`)) {
      return;
    }

    const previous = account.accountStatus;
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item) =>
          item.id === account.id ? { ...item, accountStatus: nextStatus } : item,
        ),
      };
    });
    setBusyId(account.id);
    setNotice("");
    try {
      const token = await prepareCsrf();
      const response = await fetch(`/api/v1/admin/marketplace/users/${account.id}/status`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: JSON.stringify({ accountStatus: nextStatus }),
      });
      const body = (await response.json()) as { error?: { message?: string }; data?: Account };
      if (!response.ok) throw new Error(body.error?.message ?? "Status update failed.");
      if (body.data) {
        setData((current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((item) => (item.id === account.id ? { ...item, ...body.data } : item)),
          };
        });
      }
      setNotice(`${account.name} moved to ${nextStatus}.`);
      await load();
    } catch (error) {
      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((item) =>
            item.id === account.id ? { ...item, accountStatus: previous } : item,
          ),
        };
      });
      setNotice(error instanceof Error ? error.message : "Status update failed.");
    } finally {
      setBusyId(null);
      setDraggingId(null);
      setDropTarget(null);
    }
  }

  function renderActions(account: Account) {
    return (
      <div className={styles.actions}>
        {account.actions.canEdit && (
          <button type="button" disabled={busyId === account.id} onClick={() => openEdit(account)}>
            <Pencil /> Edit
          </button>
        )}
        {account.actions.canActivate && (
          <button type="button" disabled={busyId === account.id} onClick={() => void runAction(account, "activate")}>
            <UserCheck /> Activate
          </button>
        )}
        {account.actions.canDeactivate && (
          <button type="button" disabled={busyId === account.id} onClick={() => void runAction(account, "deactivate")}>
            <UserMinus /> Deactivate
          </button>
        )}
        {account.actions.canDelete && (
          <button type="button" className={styles.danger} disabled={busyId === account.id} onClick={() => void runAction(account, "delete")}>
            <Trash2 /> Delete
          </button>
        )}
        {!account.actions.canEdit && !account.actions.canActivate && !account.actions.canDeactivate && !account.actions.canDelete && (
          <span className={styles.muted}>View only</span>
        )}
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <OperationsHeader
        eyebrow="ACCOUNT DIRECTORY"
        title="People"
        description="View every KAILA account. Super admins and admins can edit accounts and move board cards between statuses."
        actions={
          <>
            <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>
              <LayoutList /> Table
            </button>
            <button type="button" aria-pressed={view === "board"} onClick={() => setView("board")}>
              <Columns3 /> Board
            </button>
            <button type="button" onClick={() => void load()} disabled={state === "loading"}>
              <RefreshCw className={state === "loading" ? styles.spinner : ""} /> Refresh
            </button>
          </>
        }
      />

      <section className={styles.stats} aria-label="Directory summary">
        <article><span><Users /></span><div><strong>{data?.summary.total ?? "—"}</strong><p>Total accounts</p></div></article>
        <article><span><Shield /></span><div><strong>{data?.summary.staff ?? "—"}</strong><p>Staff seats</p></div></article>
        <article className={styles.completed}><span><UserCheck /></span><div><strong>{data?.summary.active ?? "—"}</strong><p>Active</p></div></article>
        <article className={styles.blocked}><span><UserMinus /></span><div><strong>{data?.summary.deactivated ?? "—"}</strong><p>Deactivated</p></div></article>
      </section>

      {createOptions.length > 0 && (
        <section className={styles.createCard} aria-label="Create account">
          <header>
            <h2><Plus /> Create account</h2>
            <p>Admins can create staff and users. Super admins can also create admins.</p>
          </header>
          <form className={styles.createForm} onSubmit={(event) => void createAccount(event)}>
            <label>Name<input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label>Email<input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
            <label>Temporary password<input required type="password" minLength={8} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></label>
            <label>Account type
              <select value={resolvedCreateType} onChange={(event) => setForm((current) => ({ ...current, accountType: event.target.value as AccountType }))}>
                {createOptions.map((option) => <option key={option} value={option}>{roleLabel[option]}</option>)}
              </select>
            </label>
            <button type="submit" disabled={creating}>{creating ? "Creating…" : "Create account"}</button>
          </form>
        </section>
      )}

      <section className={styles.workspace}>
        <header>
          <div>
            <h2>All accounts</h2>
            <p>Search and filter by role or status. Drag board cards across panels to change status.</p>
          </div>
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Search aria-hidden="true" />
              <input
                aria-label="Search accounts"
                placeholder="Search name or email"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select aria-label="Filter by role" value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
              <option value="all">All roles</option>
              <option value="super_admin">Super admin</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="user">User</option>
            </select>
            <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
              <option value="restricted">Restricted</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>
        </header>

        {notice && <p className={styles.notice} role="status">{notice}</p>}
        {state === "loading" && <div className={styles.skeletons} aria-label="Loading accounts"><span /><span /><span /></div>}
        {state === "error" && (
          <div className={styles.error} role="alert">
            <AlertCircle />
            <div>
              <h3>Directory unavailable</h3>
              <p>Check your staff session and try again.</p>
              <button type="button" onClick={() => void load()}>Try again</button>
            </div>
          </div>
        )}
        {state === "ready" && data?.items.length === 0 && (
          <div className={styles.empty}><Users /><h3>No matching accounts</h3><p>Adjust filters or create a new account.</p></div>
        )}

        {state === "ready" && data && data.items.length > 0 && view === "table" && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Person</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.name}{account.isSelf ? " (you)" : ""}</strong>
                      <span>{account.email}</span>
                    </td>
                    <td><span className={styles.roleBadge}>{roleLabel[account.staffRole]}</span></td>
                    <td><span className={statusClass(account.accountStatus, styles)}>{account.accountStatus}</span></td>
                    <td>{renderActions(account)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {state === "ready" && data && data.items.length > 0 && view === "board" && (
          <div className={styles.board} aria-label="Account status board">
            {boardColumns.map((column) => {
              const cards = data.items.filter((item) => item.accountStatus === column);
              const isDropActive = dropTarget === column;
              return (
                <section
                  key={column}
                  className={`${styles.column} ${isDropActive ? styles.columnDropTarget : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (dropTarget !== column) setDropTarget(column);
                  }}
                  onDragLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                    if (dropTarget === column) setDropTarget(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const accountId = event.dataTransfer.getData("text/kaila-account-id") || event.dataTransfer.getData("text/plain");
                    const account = data.items.find((item) => item.id === accountId);
                    setDropTarget(null);
                    setDraggingId(null);
                    if (account) void moveAccount(account, column);
                  }}
                >
                  <header>
                    <h3>{column}</h3>
                    <span>{cards.length}</span>
                  </header>
                  <div className={styles.cards}>
                    {cards.length === 0 && (
                      <p className={styles.dropHint}>{isDropActive ? "Drop to move here" : "Drop accounts here"}</p>
                    )}
                    {cards.map((account) => {
                      const draggable = account.actions.canDrag || account.actions.canDelete;
                      return (
                        <article
                          key={account.id}
                          className={`${styles.card} ${draggingId === account.id ? styles.cardDragging : ""} ${draggable ? styles.cardDraggable : ""}`}
                          draggable={draggable}
                          onDragStart={(event) => {
                            if (!draggable) {
                              event.preventDefault();
                              return;
                            }
                            event.dataTransfer.setData("text/kaila-account-id", account.id);
                            event.dataTransfer.setData("text/plain", account.id);
                            event.dataTransfer.effectAllowed = "move";
                            setDraggingId(account.id);
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDropTarget(null);
                          }}
                        >
                          <div className={styles.cardTop}>
                            {draggable ? <GripVertical className={styles.dragHandle} aria-hidden="true" /> : null}
                            <div>
                              <strong>{account.name}</strong>
                              <span>{account.email}</span>
                            </div>
                          </div>
                          <span className={styles.roleBadge}>{roleLabel[account.staffRole]}</span>
                          {renderActions(account)}
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>

      {editing ? (
        <div className={styles.dialogBackdrop} role="presentation" onClick={() => setEditing(null)}>
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-account-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p>EDIT ACCOUNT</p>
                <h2 id="edit-account-title">{editing.name}</h2>
              </div>
              <button type="button" aria-label="Close edit dialog" onClick={() => setEditing(null)}>
                <X />
              </button>
            </header>
            <form className={styles.createForm} onSubmit={(event) => void saveEdit(event)}>
              <label>Name<input required value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label>Email<input required type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} /></label>
              <label>New password <span className={styles.muted}>(optional)</span>
                <input type="password" minLength={8} value={editForm.password} placeholder="Leave blank to keep" onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))} />
              </label>
              <label>Account type
                <select value={editForm.accountType} onChange={(event) => setEditForm((current) => ({ ...current, accountType: event.target.value as AccountType }))}>
                  {editOptions.map((option) => <option key={option} value={option}>{roleLabel[option]}</option>)}
                </select>
              </label>
              <div className={styles.dialogActions}>
                <button type="button" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" disabled={savingEdit}>{savingEdit ? "Saving…" : "Save changes"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function statusClass(status: AccountStatus, stylesMap: Record<string, string>) {
  if (status === "active") return stylesMap.doneBadge;
  if (status === "deleted") return stylesMap.dangerBadge;
  return stylesMap.blockBadge;
}
