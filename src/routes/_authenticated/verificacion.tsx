import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, FileUp, Clock, CheckCircle2, XCircle } from "lucide-react";

import { useMyRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getMyVerification, submitVerification } from "@/lib/profiles.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/verificacion")({
  head: () => ({
    meta: [
      { title: "Verificación | Capora" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VerificationPage,
});

function VerificationPage() {
  const { t } = useTranslation();
  const { user } = useMyRole();
  const submit = useServerFn(submitVerification);
  const getStatus = useServerFn(getMyVerification);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["my_verification", user?.id],
    enabled: !!user,
    queryFn: () => getStatus(),
  });

  const entity = data?.entity_type ?? "empresa";
  const kind: "company" | "individual" = entity === "persona_fisica" ? "individual" : "company";

  const [legalName, setLegalName] = useState("");
  const [country, setCountry] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user || isLoading) return <div className="p-10">{t("common.loading")}</div>;

  const status = data?.status ?? "unverified";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error(t("verification.docRequired"));
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("verification-docs").upload(path, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });
      if (up.error) throw up.error;
      await submit({
        data: { kind, legal_name: legalName.trim(), country: country.trim(), doc_path: path },
      });
      toast.success(t("verification.submitted"));
      setFile(null);
      setLegalName("");
      setCountry("");
      refetch();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 pb-24 space-y-4">
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("verification.title")}</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {kind === "individual" ? t("verification.subIndividual") : t("verification.subCompany")}
        </p>

        <div className="mt-4">
          <StatusBadge status={status} />
        </div>
      </Card>

      {status === "verified" ? (
        <Card className="p-6 text-sm text-muted-foreground">{t("verification.alreadyVerified")}</Card>
      ) : status === "pending" ? (
        <Card className="p-6 text-sm text-muted-foreground">{t("verification.pendingNote")}</Card>
      ) : (
        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>{kind === "individual" ? t("verification.fullLegalName") : t("verification.legalCompanyName")}</Label>
              <Input required value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </div>
            <div>
              <Label>{t("verification.country")}</Label>
              <Input required value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <FileUp className="h-4 w-4" />
                {kind === "individual" ? t("verification.idDoc") : t("verification.companyDoc")}
              </Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("verification.docHint")}
              </p>
            </div>
            {status === "rejected" && data?.latest && "reason" in (data.latest as object) ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
                <div className="font-medium">{t("verification.rejected")}</div>
                <div className="mt-1 text-muted-foreground">
                  {(data.latest as { reason?: string }).reason}
                </div>
              </div>
            ) : null}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? t("common.loading") : t("verification.submit")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("verification.privacyNote")}</p>
          </form>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map = {
    unverified: { Icon: ShieldCheck, cls: "text-muted-foreground bg-muted", label: t("verification.statusUnverified") },
    pending: { Icon: Clock, cls: "text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/30", label: t("verification.statusPending") },
    verified: { Icon: CheckCircle2, cls: "text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/30", label: t("verification.statusVerified") },
    rejected: { Icon: XCircle, cls: "text-destructive bg-destructive/10", label: t("verification.statusRejected") },
  } as const;
  const v = (map as Record<string, typeof map.unverified>)[status] ?? map.unverified;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${v.cls}`}>
      <v.Icon className="h-3.5 w-3.5" />
      {v.label}
    </span>
  );
}
