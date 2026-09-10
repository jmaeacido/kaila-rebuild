"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Clock3,
  IdCard,
  Pencil,
  RefreshCw,
  Shield,
  Trash2,
  UserCheck,
  UserMinus,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@kaila/ui";
import { prepareCsrf } from "../../auth-client";
import { AdminDialog } from "../../../components/admin-dialog";
import { AdminEmpty, AdminPage, AdminPageHeader, AdminSkeletons } from "../../../components/admin-page";
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
  updatedAt: string | null;
  statusUpdatedAt: string | null;
  actions: {
    canEdit: boolean;
    canActivate: boolean;
    canDeactivate: boolean;
    canRestrict: boolean;
    canDelete: boolean;
    canDrag: boolean;
  };
};

type Dossier = {
  account: Account;
  client: {
    displayName: string;
    area: { id: number; name: string } | null;
    updatedAt: string | null;
    avatarUrl: string | null;
  } | null;
  provider: {
    id: number;
    displayName: string;
    bio: string | null;
    status: string;
    yearsExperience: number | null;
    rating: number | null;
    completedJobs: number;
    responseMinutes: number | null;
    offersAtShop: boolean;
    shopName: string | null;
    shopAddress: string | null;
    services: { id: number; name: string }[];
    serviceAreas: { id: number; name: string }[];
    reviewedAt: string | null;
    reviewNote: string | null;
    reviewedBy: { id: string; name: string } | null;
    avatarUrl: string | null;
  } | null;
  identity: {
    status: string;
    submittedAt: string | null;
    reviewedAt: string | null;
    decisionReason: string | null;
  } | null;
  recentJobs: {
    id: string;
    title: string;
    status: string;
    role: "client" | "provider";
    postedAt: string | null;
    updatedAt: string | null;
    areaLabel: string | null;
  }[];
  activity: {
    id: string;
    kind: string;
    title: string;
    at: string;
    href: string | null;
  }[];
  capabilities: {
    canCreateAdmin: boolean;
    canCreateStaff: boolean;
    canCreateUser: boolean;
  };
};

const roleLabel: Record<StaffRole, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  staff: "Staff",
  user: "User",
};

export default function UserDossierPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params.id;
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
    accountType: "user" as AccountType,
  });

  const load = useCallback(async () => {
    if (!userId) return;
    setState("loading");
    try {
      const response = await fetch(`/api/v1/admin/marketplace/users/${userId}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setDossier(((await response.json()) as { data: Dossier }).data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const account = dossier?.account ?? null;

  const editOptions = useMemo(() => {
    if (!dossier) return [] as AccountType[];
    const options: AccountType[] = [];
    if (dossier.capabilities.canCreateAdmin) options.push("admin");
    if (dossier.capabilities.canCreateStaff) options.push("staff");
    if (dossier.capabilities.canCreateUser) options.push("user");
    return options;
  }, [dossier]);

  function openEdit() {
    if (!account) return;
    setEditForm({
      name: account.name,
      email: account.email,
      password: "",
      accountType:
        account.staffRole === "super_admin"
          ? "admin"
          : account.staffRole === "user"
            ? "user"
            : account.staffRole,
    });
    setEditing(true);
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!account) return;
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
      const response = await fetch(`/api/v1/admin/marketplace/users/${account.id}`, {
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
      setEditing(false);
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Account could not be updated.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function runStatusAction(action: "activate" | "deactivate") {
    if (!account) return;
    setBusy(true);
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
      setNotice(`${account.name} ${action === "activate" ? "activated" : "deactivated"}.`);
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!account) return;
    setBusy(true);
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
      setNotice(`${account.name} deleted.`);
      setPendingDelete(false);
      router.push("/users");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="ACCOUNT DOSSIER"
        title={account?.name ?? "User profile"}
        description={
          account
            ? `${account.email} · Last activity ${formatDate(account.lastActiveAt, "never")}`
            : "Review account, marketplace profiles, jobs, and recent ops activity."
        }
        actions={
          <>
            <Link className={styles.backLink} href="/users">
              <ArrowLeft /> Back to People
            </Link>
            <button type="button" className={styles.toolbarButton} onClick={() => void load()} disabled={state === "loading"}>
              <RefreshCw className={state === "loading" ? styles.spinner : undefined} /> Refresh
            </button>
          </>
        }
      />

      {notice ? <p className={styles.notice}>{notice}</p> : null}

      {state === "loading" ? <AdminSkeletons label="Loading user dossier" count={4} /> : null}

      {state === "error" ? (
        <div className={styles.error}>
          <AlertCircle />
          <div>
            <h3>Could not load this profile</h3>
            <p>Check your staff access and try again.</p>
            <Button type="button" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      {state === "ready" && dossier && account ? (
        <>
          <section className={styles.hero} aria-label="Account summary">
            <div className={styles.heroCopy}>
              <div className={styles.badges}>
                <span className={styles.roleBadge}>{roleLabel[account.staffRole]}</span>
                <span className={statusClass(account.accountStatus)}>{account.accountStatus}</span>
              </div>
              <h2>{account.name}</h2>
              <p>{account.email}</p>
            </div>
            <div className={styles.actionBar}>
              {account.actions.canEdit ? (
                <button type="button" disabled={busy} onClick={openEdit}>
                  <Pencil /> Edit
                </button>
              ) : null}
              {account.actions.canActivate ? (
                <button type="button" disabled={busy} onClick={() => void runStatusAction("activate")}>
                  <UserCheck /> Activate
                </button>
              ) : null}
              {account.actions.canDeactivate ? (
                <button type="button" disabled={busy} onClick={() => void runStatusAction("deactivate")}>
                  <UserMinus /> Deactivate
                </button>
              ) : null}
              {account.actions.canDelete ? (
                <button
                  type="button"
                  className={styles.danger}
                  disabled={busy}
                  onClick={() => setPendingDelete(true)}
                >
                  <Trash2 /> Delete
                </button>
              ) : null}
              {!account.actions.canEdit &&
              !account.actions.canActivate &&
              !account.actions.canDeactivate &&
              !account.actions.canDelete ? (
                <span className={styles.muted}>View only</span>
              ) : null}
            </div>
          </section>

          <div className={styles.grid}>
            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <Shield />
                <h3>Account</h3>
              </header>
              <dl className={styles.facts}>
                <div>
                  <dt>Role</dt>
                  <dd>{roleLabel[account.staffRole]}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{account.accountStatus}</dd>
                </div>
                <div>
                  <dt>Registered</dt>
                  <dd>{formatDate(account.createdAt)}</dd>
                </div>
                <div>
                  <dt>Last activity</dt>
                  <dd>{formatDate(account.lastActiveAt, "Never")}</dd>
                </div>
                <div>
                  <dt>Status updated</dt>
                  <dd>{formatDate(account.statusUpdatedAt, "—")}</dd>
                </div>
              </dl>
            </section>

            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <UserRound />
                <h3>Client profile</h3>
              </header>
              {dossier.client ? (
                <div className={styles.profileBody}>
                  {dossier.client.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin ops preview of user-uploaded avatar
                    <img
                      className={styles.avatar}
                      src={dossier.client.avatarUrl}
                      alt=""
                      width={64}
                      height={64}
                    />
                  ) : (
                    <span className={styles.avatarFallback} aria-hidden="true">
                      <UserRound />
                    </span>
                  )}
                  <dl className={styles.facts}>
                    <div>
                      <dt>Profile picture</dt>
                      <dd>{dossier.client.avatarUrl ? "Client photo on file" : "Not uploaded"}</dd>
                    </div>
                    <div>
                      <dt>Display name</dt>
                      <dd>{dossier.client.displayName}</dd>
                    </div>
                    <div>
                      <dt>Area</dt>
                      <dd>{dossier.client.area?.name ?? "Not set"}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{formatDate(dossier.client.updatedAt, "—")}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <p className={styles.emptyCopy}>No client profile yet.</p>
              )}
            </section>

            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <Wrench />
                <h3>Provider profile</h3>
              </header>
              {dossier.provider ? (
                <div className={styles.profileBody}>
                  {dossier.provider.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin ops preview of user-uploaded avatar
                    <img
                      className={styles.avatar}
                      src={dossier.provider.avatarUrl}
                      alt=""
                      width={64}
                      height={64}
                    />
                  ) : (
                    <span className={styles.avatarFallback} aria-hidden="true">
                      <Wrench />
                    </span>
                  )}
                  <dl className={styles.facts}>
                    <div>
                      <dt>Provider logo</dt>
                      <dd>{dossier.provider.avatarUrl ? "Provider logo on file" : "Not uploaded"}</dd>
                    </div>
                    <div>
                      <dt>Display name</dt>
                      <dd>{dossier.provider.displayName}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{dossier.provider.status}</dd>
                    </div>
                    <div>
                      <dt>Bio</dt>
                      <dd>{dossier.provider.bio || "—"}</dd>
                    </div>
                    <div>
                      <dt>Experience</dt>
                      <dd>
                        {dossier.provider.yearsExperience != null
                          ? `${dossier.provider.yearsExperience} years`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Rating</dt>
                      <dd>
                        {dossier.provider.rating != null
                          ? `${dossier.provider.rating.toFixed(2)} · ${dossier.provider.completedJobs} jobs`
                          : `${dossier.provider.completedJobs} completed jobs`}
                      </dd>
                    </div>
                    <div>
                      <dt>Services</dt>
                      <dd>
                        {dossier.provider.services.length
                          ? dossier.provider.services.map((item) => item.name).join(", ")
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Service areas</dt>
                      <dd>
                        {dossier.provider.serviceAreas.length
                          ? dossier.provider.serviceAreas.map((item) => item.name).join(", ")
                          : "—"}
                      </dd>
                    </div>
                    {dossier.provider.offersAtShop ? (
                      <div>
                        <dt>Shop</dt>
                        <dd>
                          {[dossier.provider.shopName, dossier.provider.shopAddress]
                            .filter(Boolean)
                            .join(" · ") || "Offers at shop"}
                        </dd>
                      </div>
                    ) : null}
                    {dossier.provider.reviewedAt ? (
                      <div>
                        <dt>Review</dt>
                        <dd>
                          {formatDate(dossier.provider.reviewedAt)}
                          {dossier.provider.reviewedBy ? ` by ${dossier.provider.reviewedBy.name}` : ""}
                          {dossier.provider.reviewNote ? ` — ${dossier.provider.reviewNote}` : ""}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : (
                <p className={styles.emptyCopy}>No provider profile yet.</p>
              )}
            </section>

            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <IdCard />
                <h3>Identity</h3>
              </header>
              {dossier.identity ? (
                <dl className={styles.facts}>
                  <div>
                    <dt>Status</dt>
                    <dd>{dossier.identity.status}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatDate(dossier.identity.submittedAt, "—")}</dd>
                  </div>
                  <div>
                    <dt>Reviewed</dt>
                    <dd>{formatDate(dossier.identity.reviewedAt, "—")}</dd>
                  </div>
                  <div>
                    <dt>Decision reason</dt>
                    <dd>{dossier.identity.decisionReason || "—"}</dd>
                  </div>
                </dl>
              ) : (
                <p className={styles.emptyCopy}>No identity verification record.</p>
              )}
              <Link className={styles.inlineLink} href="/identity-verifications">
                Open Identity queue
              </Link>
            </section>
          </div>

          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <Briefcase />
              <h3>Recent jobs</h3>
            </header>
            {dossier.recentJobs.length === 0 ? (
              <AdminEmpty
                icon={<Briefcase />}
                title="No recent jobs"
                description="Jobs as client or hired provider will appear here."
              />
            ) : (
              <ul className={styles.list}>
                {dossier.recentJobs.map((job) => (
                  <li key={`${job.id}-${job.role}`}>
                    <div>
                      <strong>{job.title}</strong>
                      <span>
                        {job.role} · {job.status}
                        {job.areaLabel ? ` · ${job.areaLabel}` : ""}
                      </span>
                    </div>
                    <time dateTime={job.updatedAt ?? job.postedAt ?? undefined}>
                      {formatDate(job.updatedAt ?? job.postedAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <Clock3 />
              <h3>Activity</h3>
            </header>
            {dossier.activity.length === 0 ? (
              <AdminEmpty
                icon={<Clock3 />}
                title="No recent activity"
                description="Support, identity, disputes, reports, and jobs feed into this timeline."
              />
            ) : (
              <ol className={styles.timeline}>
                {dossier.activity.map((item) => (
                  <li key={item.id}>
                    <span className={styles.kind}>{item.kind.replaceAll("_", " ")}</span>
                    <div>
                      {item.href ? (
                        <Link href={item.href}>{item.title}</Link>
                      ) : (
                        <strong>{item.title}</strong>
                      )}
                      <time dateTime={item.at}>{formatDate(item.at)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : null}

      {editing && account ? (
        <div className={styles.dialogBackdrop} role="presentation" onClick={() => setEditing(false)}>
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-dossier-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p>EDIT ACCOUNT</p>
                <h2 id="edit-dossier-title">{account.name}</h2>
              </div>
              <button type="button" aria-label="Close edit dialog" onClick={() => setEditing(false)}>
                <X />
              </button>
            </header>
            <form className={styles.editForm} onSubmit={(event) => void saveEdit(event)}>
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
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
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

      <AdminDialog
        open={pendingDelete}
        eyebrow="Dangerous action"
        title={account ? `Delete ${account.name}?` : "Delete account?"}
        description="They will no longer be able to sign in. This status change should only be used when the account must be removed from active use."
        confirmLabel="Delete account"
        confirmVariant="danger"
        busy={confirmBusy}
        onClose={() => {
          if (!confirmBusy) setPendingDelete(false);
        }}
        onConfirm={async () => {
          setConfirmBusy(true);
          try {
            await deleteAccount();
          } finally {
            setConfirmBusy(false);
          }
        }}
      />
    </AdminPage>
  );
}

function formatDate(value: string | null | undefined, fallback = "Unknown") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusClass(status: AccountStatus) {
  if (status === "active") return styles.doneBadge;
  if (status === "deleted") return styles.dangerBadge;
  return styles.blockBadge;
}
