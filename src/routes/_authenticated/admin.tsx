import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, FileText, Clock, Flag } from "lucide-react";
import { adminListUserReports, adminListProjectReports, adminModerationAction } from "@/lib/moderation.functions";

import { listAllUsers, listAllProjects, adminSetProjectStatus, adminDeleteProject } from "@/lib/admin.functions";
import {
  adminListVerifications,
  adminGetVerificationDocUrl,
  adminDecideVerification,
} from "@/lib/profiles.functions";
import { useMyRole } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPanel,
});

function AdminPanel() {
  const { t } = useTranslation();
  const { role, loading } = useMyRole();
  const qc = useQueryClient();
  const usersFn = useServerFn(listAllUsers);
  const projectsFn = useServerFn(listAllProjects);
  const setStatus = useServerFn(adminSetProjectStatus);
  const del = useServerFn(adminDeleteProject);

  const { data: users } = useQuery({ queryKey: ["admin_users"], queryFn: () => usersFn(), enabled: role === "admin" });
  const { data: projects } = useQuery({ queryKey: ["admin_projects"], queryFn: () => projectsFn(), enabled: role === "admin" });

  if (loading) return <div className="p-10">{t("common.loading")}</div>;
  if (role !== "admin") return <div className="p-10 text-center text-muted-foreground">403 — Acceso restringido</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t("admin.title")}</h1>
      <Tabs defaultValue="verifications" className="mt-6">
        <TabsList>
          <TabsTrigger value="verifications">
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            {t("admin.verifications")}
          </TabsTrigger>
          <TabsTrigger value="moderation">
            <Flag className="mr-1.5 h-4 w-4" />
            {t("admin.moderation")}
          </TabsTrigger>
          <TabsTrigger value="users">{t("admin.users")}</TabsTrigger>
          <TabsTrigger value="projects">{t("admin.projects")}</TabsTrigger>
        </TabsList>

        <TabsContent value="verifications" className="mt-4">
          <VerificationQueue />
        </TabsContent>

        <TabsContent value="moderation" className="mt-4">
          <ModerationQueue />
        </TabsContent>


        <TabsContent value="users" className="mt-4 space-y-2">
          {users?.map((u: any) => (
            <Card key={u.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{u.full_name ?? u.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">{u.role ?? "—"}</p>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="projects" className="mt-4 space-y-2">
          {projects?.map((p: any) => (
            <Card key={p.id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.sector} · {p.country}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{p.status}</Badge>
                <Button size="sm" variant="outline" onClick={async () => {
                  await setStatus({ data: { id: p.id, status: p.status === "published" ? "draft" : "published" } });
                  qc.invalidateQueries({ queryKey: ["admin_projects"] });
                }}>{p.status === "published" ? t("admin.unpublish") : t("admin.publish")}</Button>
                <Button size="sm" variant="destructive" onClick={async () => {
                  if (!confirm("¿Eliminar?")) return;
                  await del({ data: { id: p.id } });
                  qc.invalidateQueries({ queryKey: ["admin_projects"] });
                }}>{t("common.delete")}</Button>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Filter = "pending" | "verified" | "rejected" | "all";

function VerificationQueue() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");

  const listFn = useServerFn(adminListVerifications);
  const docFn = useServerFn(adminGetVerificationDocUrl);
  const decideFn = useServerFn(adminDecideVerification);

  const { data, isLoading } = useQuery({
    queryKey: ["admin_verifications", filter],
    queryFn: () => listFn({ data: { status: filter } }),
  });

  const decide = useMutation({
    mutationFn: (vars: { id: string; decision: "verified" | "rejected"; reason?: string }) =>
      decideFn({ data: vars }),
    onSuccess: (_d, vars) => {
      toast.success(vars.decision === "verified" ? t("admin.approved") : t("admin.rejected"));
      qc.invalidateQueries({ queryKey: ["admin_verifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openDoc = async (id: string) => {
    try {
      const { url } = await docFn({ data: { id } });
      if (!url) return toast.error(t("admin.docDeleted"));
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["pending", "verified", "rejected", "all"] as Filter[]).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {t(`admin.filter.${f}`)}
          </Button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">{t("admin.noVerifications")}</Card>
      )}

      {data?.map((r: any) => (
        <Card key={r.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{r.legal_name}</p>
                <Badge variant="outline" className="text-xs">
                  {r.kind === "individual" ? t("verification.fullLegalName") : t("verification.legalCompanyName")}
                </Badge>
                <StatusPill status={r.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {r.country} · {new Date(r.submitted_at).toLocaleString()}
              </p>
              {r.full_name && (
                <p className="text-xs text-muted-foreground">{r.full_name}</p>
              )}
              {r.reason && (
                <p className="mt-1 text-xs text-destructive">{t("admin.reasonLabel")}: {r.reason}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {r.doc_path ? (
                <Button size="sm" variant="outline" onClick={() => openDoc(r.id)}>
                  <FileText className="mr-1.5 h-4 w-4" />
                  {t("admin.viewDoc")}
                </Button>
              ) : (
                <span className="inline-flex items-center text-xs text-muted-foreground gap-1">
                  <Clock className="h-3 w-3" />
                  {t("admin.docDeleted")}
                </span>
              )}
            </div>
          </div>

          {r.status === "pending" && (
            <DecisionBar
              busy={decide.isPending}
              onApprove={() => decide.mutate({ id: r.id, decision: "verified" })}
              onReject={(reason) => decide.mutate({ id: r.id, decision: "rejected", reason })}
            />
          )}
        </Card>
      ))}
    </div>
  );
}

function DecisionBar({
  busy,
  onApprove,
  onReject,
}: {
  busy: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center border-t border-border pt-3">
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t("admin.reasonPlaceholder")}
        className="sm:max-w-xs"
      />
      <div className="flex gap-2 sm:ml-auto">
        <Button
          size="sm"
          variant="destructive"
          disabled={busy || reason.trim().length < 3}
          onClick={() => onReject(reason.trim())}
        >
          {t("admin.reject")}
        </Button>
        <Button size="sm" disabled={busy} onClick={onApprove}>
          {t("admin.approve")}
        </Button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "verified"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
      : status === "rejected"
        ? "bg-destructive/10 text-destructive"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{status}</span>;
}

/* -------------------------- Moderation Queue -------------------------- */

type ModStatus = "pending" | "reviewed" | "resolved" | "dismissed" | "all";
type ModKind = "users" | "projects";

function ModerationQueue() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [kind, setKind] = useState<ModKind>("users");
  const [status, setStatus] = useState<ModStatus>("pending");

  const listU = useServerFn(adminListUserReports);
  const listP = useServerFn(adminListProjectReports);
  const actFn = useServerFn(adminModerationAction);

  const { data: uReports, isLoading: uLoading } = useQuery({
    queryKey: ["admin_user_reports", status],
    queryFn: () => listU({ data: { status } }),
    enabled: kind === "users",
  });
  const { data: pReports, isLoading: pLoading } = useQuery({
    queryKey: ["admin_project_reports", status],
    queryFn: () => listP({ data: { status } }),
    enabled: kind === "projects",
  });

  const act = useMutation({
    mutationFn: (vars: { id: string; action: any; target_type: "user_report" | "project_report"; notes?: string }) =>
      actFn({ data: vars }),
    onSuccess: () => {
      toast.success(t("common.saved"));
      qc.invalidateQueries({ queryKey: ["admin_user_reports"] });
      qc.invalidateQueries({ queryKey: ["admin_project_reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["users", "projects"] as ModKind[]).map((k) => (
          <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>
            {t(`admin.mod.kind.${k}`)}
          </Button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          {(["pending", "reviewed", "resolved", "dismissed", "all"] as ModStatus[]).map((s) => (
            <Button key={s} size="sm" variant={status === s ? "secondary" : "ghost"} onClick={() => setStatus(s)}>
              {t(`admin.mod.status.${s}`)}
            </Button>
          ))}
        </div>
      </div>

      {kind === "users" && (
        <>
          {uLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
          {!uLoading && (uReports?.length ?? 0) === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">{t("admin.mod.empty")}</Card>
          )}
          {(uReports ?? []).map((r: any) => (
            <Card key={r.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium truncate">{r.reported_name ?? r.reported_user_id.slice(0, 8)}</p>
                    <Badge variant="outline" className="text-[10px]">{t(`safety.report.userReasons.${r.reason}`)}</Badge>
                    <StatusPill status={r.status} />
                    {r.reported_suspended && <Badge variant="destructive" className="text-[10px]">{t("admin.mod.suspended")}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("admin.mod.reportedBy")}: {r.reporter_name ?? r.reporter_id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}
                  </p>
                  {r.summary && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px]">
                        {t("admin.mod.totalReports", { count: r.summary.total })}
                      </Badge>
                      {r.summary.last_at && (
                        <span>{t("admin.mod.lastReport", { date: new Date(r.summary.last_at).toLocaleDateString() })}</span>
                      )}
                      {r.summary.top_reason && (
                        <span>
                          · {t("admin.mod.topReason")}: {t(`safety.report.userReasons.${r.summary.top_reason}`)}
                        </span>
                      )}
                    </div>
                  )}

                  {r.details && <p className="mt-1 text-sm">{r.details}</p>}
                  {r.admin_notes && <p className="mt-1 text-xs text-muted-foreground">{t("admin.mod.notes")}: {r.admin_notes}</p>}
                </div>
              </div>
              {r.status !== "resolved" && r.status !== "dismissed" && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button size="sm" variant="outline" onClick={() => act.mutate({ id: r.id, action: "mark_reviewed", target_type: "user_report" })}>
                    {t("admin.mod.markReviewed")}
                  </Button>
                  {!r.reported_suspended ? (
                    <Button size="sm" variant="destructive" onClick={() => act.mutate({ id: r.id, action: "suspend_user", target_type: "user_report" })}>
                      {t("admin.mod.suspendUser")}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => act.mutate({ id: r.id, action: "restore_user", target_type: "user_report" })}>
                      {t("admin.mod.restoreUser")}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => act.mutate({ id: r.id, action: "dismiss", target_type: "user_report" })}>
                    {t("admin.mod.dismiss")}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </>
      )}

      {kind === "projects" && (
        <>
          {pLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
          {!pLoading && (pReports?.length ?? 0) === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">{t("admin.mod.empty")}</Card>
          )}
          {(pReports ?? []).map((r: any) => (
            <Card key={r.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium truncate">{r.projects?.title ?? r.project_id.slice(0, 8)}</p>
                    <Badge variant="outline" className="text-[10px]">{t(`safety.report.projectReasons.${r.reason}`)}</Badge>
                    <StatusPill status={r.status} />
                    {r.projects?.hidden_by_moderation && <Badge variant="destructive" className="text-[10px]">{t("admin.mod.hidden")}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</p>
                  {r.details && <p className="mt-1 text-sm">{r.details}</p>}
                </div>
              </div>
              {r.status !== "resolved" && r.status !== "dismissed" && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button size="sm" variant="outline" onClick={() => act.mutate({ id: r.id, action: "mark_reviewed", target_type: "project_report" })}>
                    {t("admin.mod.markReviewed")}
                  </Button>
                  {!r.projects?.hidden_by_moderation ? (
                    <Button size="sm" variant="destructive" onClick={() => act.mutate({ id: r.id, action: "hide_project", target_type: "project_report" })}>
                      {t("admin.mod.hideProject")}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => act.mutate({ id: r.id, action: "restore_project", target_type: "project_report" })}>
                      {t("admin.mod.restoreProject")}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => act.mutate({ id: r.id, action: "dismiss", target_type: "project_report" })}>
                    {t("admin.mod.dismiss")}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
