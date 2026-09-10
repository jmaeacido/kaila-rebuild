"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Columns3,
  Eye,
  GripVertical,
  LayoutList,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Smartphone,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { Button } from "@kaila/ui";
import { prepareCsrf } from "../auth-client";
import { AdminDialog } from "../../components/admin-dialog";
import { AdminPageHeader } from "../../components/admin-page";
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
  lastActiveAt: string | null;
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
  canSendOpsMail: boolean;
};
type Directory = {
  items: Account[];
  summary: { total: number; staff: number; active: number; deactivated: number };
  capabilities: Capabilities;
  viewer: { id: string; staffRole: StaffRole | null };
  pagination: { currentPage: number; lastPage: number; total: number };
};
type PendingDanger =
  | { kind: "delete"; account: Account }
  | { kind: "move-deleted"; account: Account };

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
  const [view, setView] = useState<"table" | "board">("board");
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
  const [pendingDanger, setPendingDanger] = useState<PendingDanger | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
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
      const directory = ((await response.json()) as { data: Directory }).data;
      setData(directory);
      const visible = new Set(directory.items.map((item) => item.id));
      setSelectedIds((current) => current.filter((id) => visible.has(id)));
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

  const canSendOpsMail = Boolean(data?.capabilities.canSendOpsMail);

  const selectedAccounts = useMemo(() => {
    if (!data) return [] as Account[];
    const selected = new Set(selectedIds);
    return data.items.filter((item) => selected.has(item.id));
  }, [data, selectedIds]);

  const pastedInviteEmails = useMemo(() => parsePastedEmails(inviteEmails), [inviteEmails]);

  const inviteRecipientCount = useMemo(() => {
    const selectedEmails = new Set(selectedAccounts.map((account) => account.email.trim().toLowerCase()).filter(Boolean));
    let extras = 0;
    for (const email of pastedInviteEmails) {
      if (!selectedEmails.has(email)) extras += 1;
    }
    return selectedAccounts.length + extras;
  }, [pastedInviteEmails, selectedAccounts]);

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
    if (action === "delete") {
      setPendingDanger({ kind: "delete", account });
      return;
    }

    setBusyId(account.id);
    setNotice("");
    try {
      const token = await prepareCsrf();
      const response = await fetch(`/api/v1/admin/marketplace/users/${account.id}/${action}`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
      });
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

  async function deleteAccount(account: Account) {
    setBusyId(account.id);
    setNotice("");
    try {
      const token = await prepareCsrf();
      const response = await fetch(`/api/v1/admin/marketplace/users/${account.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
      });
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
    if (nextStatus === "deleted") {
      setPendingDanger({ kind: "move-deleted", account });
      return;
    }

    await applyStatusMove(account, nextStatus);
  }

  async function applyStatusMove(account: Account, nextStatus: AccountStatus) {
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

  async function confirmDangerAction() {
    if (!pendingDanger) return;
    setConfirmBusy(true);
    try {
      if (pendingDanger.kind === "delete") {
        await deleteAccount(pendingDanger.account);
      } else {
        await applyStatusMove(pendingDanger.account, "deleted");
      }
      setPendingDanger(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  function toggleSelected(accountId: string) {
    setSelectedIds((current) =>
      current.includes(accountId) ? current.filter((id) => id !== accountId) : [...current, accountId],
    );
  }

  function toggleSelectAllVisible() {
    if (!data) return;
    const visibleIds = data.items.map((item) => item.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : visibleIds);
  }

  async function sendAndroidInvite(event: FormEvent) {
    event.preventDefault();
    const emails = parsePastedEmails(inviteEmails);
    if (selectedIds.length === 0 && emails.length === 0) {
      setNotice("Select at least one account or paste at least one email.");
      return;
    }

    setSendingInvite(true);
    setNotice("");
    try {
      const token = await prepareCsrf();
      const response = await fetch("/api/v1/admin/marketplace/mail/android-internal-test", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: JSON.stringify({
          userIds: selectedIds,
          emails,
        }),
      });
      const body = (await response.json()) as {
        error?: { message?: string; fields?: Record<string, string[]> };
        data?: { sent?: number; skipped?: number; inboxSent?: number };
      };
      if (!response.ok) {
        const fieldMessage = body.error?.fields
          ? Object.values(body.error.fields).flat().find((value) => typeof value === "string" && value.trim())
          : undefined;
        throw new Error(fieldMessage || body.error?.message || "Android test invites could not be sent.");
      }
      const sent = body.data?.sent ?? 0;
      const inboxSent = body.data?.inboxSent ?? 0;
      const skipped = body.data?.skipped ?? 0;
      const parts = [`Sent ${sent} email invite${sent === 1 ? "" : "s"}`];
      if (inboxSent > 0) {
        parts.push(`${inboxSent} in-app inbox message${inboxSent === 1 ? "" : "s"}`);
      }
      if (skipped > 0) {
        parts.push(`${skipped} skipped`);
      }
      setNotice(`${parts.join(" · ")}.`);
      setInviteOpen(false);
      setInviteEmails("");
      setSelectedIds([]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Android test invites could not be sent.");
    } finally {
      setSendingInvite(false);
    }
  }

  function renderActions(account: Account) {
    const busy = busyId === account.id;
    return (
      <div className={styles.actions}>
        <Link
          className={styles.iconAction}
          href={`/users/${account.id}`}
          title="View profile"
          aria-label={`View profile for ${account.name}`}
        >
          <Eye />
        </Link>
        {account.actions.canEdit && (
          <button
            type="button"
            className={styles.iconAction}
            disabled={busy}
            title="Edit"
            aria-label={`Edit ${account.name}`}
            onClick={() => openEdit(account)}
          >
            <Pencil />
          </button>
        )}
        {account.actions.canActivate && (
          <button
            type="button"
            className={styles.iconAction}
            disabled={busy}
            title="Activate"
            aria-label={`Activate ${account.name}`}
            onClick={() => void runAction(account, "activate")}
          >
            <UserCheck />
          </button>
        )}
        {account.actions.canDeactivate && (
          <button
            type="button"
            className={styles.iconAction}
            disabled={busy}
            title="Deactivate"
            aria-label={`Deactivate ${account.name}`}
            onClick={() => void runAction(account, "deactivate")}
          >
            <UserMinus />
          </button>
        )}
        {account.actions.canDelete && (
          <button
            type="button"
            className={`${styles.iconAction} ${styles.danger}`}
            disabled={busy}
            title="Delete"
            aria-label={`Delete ${account.name}`}
            onClick={() => void runAction(account, "delete")}
          >
            <Trash2 />
          </button>
        )}
      </div>
    );
  }

  function renderPerson(account: Account) {
    return (
      <>
        <Link className={styles.personLink} href={`/users/${account.id}`}>
          <strong>
            {account.name}
            {account.isSelf ? " (you)" : ""}
          </strong>
        </Link>
        <span>{account.email}</span>
      </>
    );
  }

  return (
    <main className={styles.page}>
      <AdminPageHeader
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
            {canSendOpsMail ? (
              <button type="button" className={styles.inviteLaunch} onClick={() => setInviteOpen(true)}>
                <Smartphone /> Send Android test invite
                {selectedIds.length > 0 ? <span className={styles.inviteCount}>{selectedIds.length}</span> : null}
              </button>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => void load()} disabled={state === "loading"}>
              <RefreshCw className={state === "loading" ? styles.spinner : ""} /> Refresh
            </Button>
          </>
        }
      />

      <section className={styles.stats} aria-label="Directory summary">
        <article>
          <span>
            <Users />
          </span>
          <div>
            <strong>{data?.summary.total ?? "—"}</strong>
            <p>Total accounts</p>
          </div>
        </article>
        <article>
          <span>
            <Shield />
          </span>
          <div>
            <strong>{data?.summary.staff ?? "—"}</strong>
            <p>Staff seats</p>
          </div>
        </article>
        <article className={styles.completed}>
          <span>
            <UserCheck />
          </span>
          <div>
            <strong>{data?.summary.active ?? "—"}</strong>
            <p>Active</p>
          </div>
        </article>
        <article className={styles.blocked}>
          <span>
            <UserMinus />
          </span>
          <div>
            <strong>{data?.summary.deactivated ?? "—"}</strong>
            <p>Deactivated</p>
          </div>
        </article>
      </section>

      {createOptions.length > 0 && (
        <section className={styles.createCard} aria-label="Create account">
          <header>
            <h2>
              <Plus /> Create account
            </h2>
            <p>Admins can create staff and users. Super admins can also create admins.</p>
          </header>
          <form className={styles.createForm} onSubmit={(event) => void createAccount(event)}>
            <label>
              Name
              <input
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label>
              Temporary password
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>
            <label>
              Account type
              <select
                value={resolvedCreateType}
                onChange={(event) => setForm((current) => ({ ...current, accountType: event.target.value as AccountType }))}
              >
                {createOptions.map((option) => (
                  <option key={option} value={option}>
                    {roleLabel[option]}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={creating} isLoading={creating}>
              {creating ? "Creating…" : "Create account"}
            </Button>
          </form>
        </section>
      )}

      <section className={styles.workspace}>
        <header>
          <div className={styles.workspaceTop}>
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
              <select
                aria-label="Filter by status"
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="deactivated">Deactivated</option>
                <option value="restricted">Restricted</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
          </div>
          {canSendOpsMail && selectedIds.length > 0 ? (
            <div className={styles.selectionBar} role="status">
              <p>
                <strong>{selectedIds.length}</strong> selected for Android invite
              </p>
              <div className={styles.selectionBarActions}>
                <button type="button" onClick={() => setSelectedIds([])}>
                  Clear
                </button>
                <button type="button" className={styles.inviteLaunch} onClick={() => setInviteOpen(true)}>
                  <Mail /> Continue
                </button>
              </div>
            </div>
          ) : null}
        </header>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}
        {state === "loading" && (
          <div className={styles.skeletons} aria-label="Loading accounts">
            <span />
            <span />
            <span />
          </div>
        )}
        {state === "error" && (
          <div className={styles.error} role="alert">
            <AlertCircle />
            <div>
              <h3>Directory unavailable</h3>
              <p>Check your staff session and try again.</p>
              <Button type="button" variant="secondary" onClick={() => void load()}>
                Try again
              </Button>
            </div>
          </div>
        )}
        {state === "ready" && data?.items.length === 0 && (
          <div className={styles.empty}>
            <Users />
            <h3>No matching accounts</h3>
            <p>Adjust filters or create a new account.</p>
          </div>
        )}

        {state === "ready" && data && data.items.length > 0 && view === "table" && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {canSendOpsMail ? (
                    <th scope="col" className={styles.selectCol}>
                      <input
                        type="checkbox"
                        aria-label="Select all visible accounts"
                        checked={data.items.length > 0 && data.items.every((item) => selectedIds.includes(item.id))}
                        onChange={toggleSelectAllVisible}
                      />
                    </th>
                  ) : null}
                  <th scope="col">Person</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Registered</th>
                  <th scope="col">Last activity</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((account) => (
                  <tr key={account.id} className={selectedIds.includes(account.id) ? styles.rowSelected : undefined}>
                    {canSendOpsMail ? (
                      <td className={styles.selectCol}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${account.name}`}
                          checked={selectedIds.includes(account.id)}
                          onChange={() => toggleSelected(account.id)}
                        />
                      </td>
                    ) : null}
                    <td className={styles.personCell}>{renderPerson(account)}</td>
                    <td>
                      <span className={styles.roleBadge}>{roleLabel[account.staffRole]}</span>
                    </td>
                    <td>
                      <span className={statusClass(account.accountStatus, styles)}>{account.accountStatus}</span>
                    </td>
                    <td className={styles.dateCell} title={formatExactDate(account.createdAt)}>
                      {formatDate(account.createdAt)}
                    </td>
                    <td className={styles.dateCell} title={formatExactDate(account.lastActiveAt)}>
                      {formatDate(account.lastActiveAt, "Never")}
                    </td>
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
                    const accountId =
                      event.dataTransfer.getData("text/kaila-account-id") || event.dataTransfer.getData("text/plain");
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
                          className={`${styles.card} ${draggingId === account.id ? styles.cardDragging : ""} ${draggable ? styles.cardDraggable : ""} ${selectedIds.includes(account.id) ? styles.cardSelected : ""}`}
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
                            {canSendOpsMail ? (
                              <label className={styles.cardSelect} onClick={(event) => event.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${account.name}`}
                                  checked={selectedIds.includes(account.id)}
                                  onChange={() => toggleSelected(account.id)}
                                />
                              </label>
                            ) : null}
                            {draggable ? <GripVertical className={styles.dragHandle} aria-hidden="true" /> : null}
                            <div className={styles.personCell}>
                              <Link className={styles.personLink} href={`/users/${account.id}`}>
                                <strong>{account.name}</strong>
                              </Link>
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
              <label>
                Name
                <input
                  required
                  value={editForm.name}
                  onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  value={editForm.email}
                  onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label>
                New password <span className={styles.muted}>(optional)</span>
                <input
                  type="password"
                  minLength={8}
                  value={editForm.password}
                  placeholder="Leave blank to keep"
                  onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))}
                />
              </label>
              <label>
                Account type
                <select
                  value={editForm.accountType}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, accountType: event.target.value as AccountType }))
                  }
                >
                  {editOptions.map((option) => (
                    <option key={option} value={option}>
                      {roleLabel[option]}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.dialogActions}>
                <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingEdit} isLoading={savingEdit}>
                  {savingEdit ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {inviteOpen ? (
        <div className={styles.dialogBackdrop} role="presentation" onClick={() => !sendingInvite && setInviteOpen(false)}>
          <section
            className={`${styles.dialog} ${styles.inviteDialog}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="android-invite-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p>ANDROID INTERNAL TEST</p>
                <h2 id="android-invite-title">Send KAILA test invite</h2>
              </div>
              <button
                type="button"
                aria-label="Close Android invite dialog"
                disabled={sendingInvite}
                onClick={() => setInviteOpen(false)}
              >
                <X />
              </button>
            </header>
            <form className={styles.inviteForm} onSubmit={(event) => void sendAndroidInvite(event)}>
              <p className={styles.inviteCopy}>
                KAILA accounts get a branded email plus an in-app inbox invitation. Pasted emails that are not accounts
                receive email only. Testers open the Play link with that Google account, then become a tester.
              </p>

              <section className={styles.inviteSection} aria-labelledby="invite-recipients-heading">
                <div className={styles.inviteSectionHead}>
                  <h3 id="invite-recipients-heading">Recipients</h3>
                  <span className={styles.inviteMeta}>{inviteRecipientCount} total</span>
                </div>

                {selectedAccounts.length > 0 ? (
                  <ul className={styles.inviteRecipientList}>
                    {selectedAccounts.map((account) => (
                      <li key={account.id}>
                        <div>
                          <strong>{account.name}</strong>
                          <span>{account.email}</span>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${account.name}`}
                          disabled={sendingInvite}
                          onClick={() => toggleSelected(account.id)}
                        >
                          <X />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.inviteEmptyRecipients}>
                    No accounts selected yet. Paste emails below, or cancel and select rows first.
                  </p>
                )}
              </section>

              <label className={styles.inviteEmailField}>
                <span className={styles.inviteSectionHead}>
                  <span>Add emails</span>
                  {pastedInviteEmails.length > 0 ? (
                    <span className={styles.inviteMeta}>{pastedInviteEmails.length} pasted</span>
                  ) : null}
                </span>
                <textarea
                  rows={4}
                  placeholder={"one@email.com\nanother@email.com"}
                  value={inviteEmails}
                  disabled={sendingInvite}
                  onChange={(event) => setInviteEmails(event.target.value)}
                />
                <span className={styles.inviteHint}>
                  Separate with commas or new lines. Works for people who are not KAILA accounts yet.
                </span>
              </label>

              <div className={styles.inviteActions}>
                <Button type="button" variant="secondary" disabled={sendingInvite} onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <button
                  type="submit"
                  className={styles.inviteSubmit}
                  disabled={sendingInvite || inviteRecipientCount === 0}
                  aria-busy={sendingInvite || undefined}
                >
                  {sendingInvite
                    ? "Sending…"
                    : inviteRecipientCount === 0
                      ? "Add recipients to send"
                      : `Send ${inviteRecipientCount} invite${inviteRecipientCount === 1 ? "" : "s"}`}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <AdminDialog
        open={pendingDanger !== null}
        eyebrow="Dangerous action"
        title={pendingDanger ? `Delete ${pendingDanger.account.name}?` : "Delete account?"}
        description="They will no longer be able to sign in. This status change should only be used when the account must be removed from active use."
        confirmLabel="Delete account"
        confirmVariant="danger"
        busy={confirmBusy}
        onClose={() => {
          if (!confirmBusy) setPendingDanger(null);
        }}
        onConfirm={() => void confirmDangerAction()}
      />
    </main>
  );
}

function parsePastedEmails(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function statusClass(status: AccountStatus, stylesMap: Record<string, string>) {
  if (status === "active") return stylesMap.doneBadge;
  if (status === "deleted") return stylesMap.dangerBadge;
  return stylesMap.blockBadge;
}

function formatDate(value: string | null, fallback = "Unknown"): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatExactDate(value: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleString();
}
