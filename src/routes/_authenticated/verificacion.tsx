import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, FileUp, Clock, CheckCircle2, XCircle, Sparkles } from "lucide-react";

import { useMyRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getMyVerification, submitVerification } from "@/lib/profiles.functions";
import { Card } from "@/components/ui/card";
import { FormSkeleton } from "@/components/ui/skeletons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/verificacion")({
  head: () => ({
    meta: [
      { title: "Verificación | Velorze" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VerificationPage,
});

const FREE_DOMAINS = new Set([
  "gmail.com","googlemail.com","outlook.com","hotmail.com","live.com","msn.com",
  "yahoo.com","yahoo.es","yahoo.co.uk","icloud.com","me.com","mac.com",
  "aol.com","proton.me","protonmail.com","pm.me","gmx.com","gmx.es",
  "mail.com","zoho.com","yandex.com","yandex.ru","tutanota.com",
]);
function isCorpEmail(email: string) {
  const m = email.match(/^[^@\s]+@([^@\s]+\.[^@\s]+)$/);
  if (!m) return false;
  return !FREE_DOMAINS.has(m[1].toLowerCase());
}
function isUrl(s: string) {
  if (!s) return false;
  try { new URL(s); return true; } catch { return false; }
}

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
  const [contactEmail, setContactEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [taxId, setTaxId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [requestManual, setRequestManual] = useState(false);
  const [busy, setBusy] = useState(false);

  // Prefill from profile
  useEffect(() => {
    if (!data?.profile) return;
    setLegalName(data.profile.legal_name || "");
    setCountry(data.profile.country || "");
    setContactEmail(data.profile.contact_email || "");
    setWebsite(data.profile.website || "");
    setLinkedin(data.profile.linkedin || "");
    setTaxId(data.profile.tax_id || "");
  }, [data?.profile]);

  if (!user || isLoading) return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Card className="p-6"><FormSkeleton fields={5} /></Card>
      </div>
    );

  const status = data?.status ?? "unverified";
  const trustLevel = data?.trust_level ?? "unverified";

  // Live trust preview
  const previewLevel = (() => {
    const hasEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail);
    if (!legalName.trim() || !country.trim() || !hasEmail) return "unverified";
    if (isCorpEmail(contactEmail) || isUrl(website)) return "trusted";
    return "basic";
  })();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let docPath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("verification-docs").upload(path, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
        if (up.error) throw up.error;
        docPath = path;
      }
      const res = await submit({
        data: {
          kind,
          legal_name: legalName.trim(),
          country: country.trim(),
          contact_email: contactEmail.trim(),
          website: website.trim() || null,
          linkedin: linkedin.trim() || null,
          tax_id: taxId.trim() || null,
          doc_path: docPath,
          request_manual: requestManual,
        },
      });
      res.auto
        ? toast.success(t("toast.verified"), { description: t("toast.verifiedSub") })
        : toast.success(t("verification.submitted"));
      setFile(null);
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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <TrustBadge level={trustLevel} />
        </div>
      </Card>

      {status === "pending" ? (
        <Card className="p-6 text-sm text-muted-foreground">{t("verification.pendingNote")}</Card>
      ) : (
        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>{kind === "individual" ? t("verification.fullLegalName") : t("verification.legalCompanyName")}</Label>
              <Input required value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label>{t("verification.country")}</Label>
              <Input required value={country} onChange={(e) => setCountry(e.target.value)} maxLength={80} />
            </div>
            <div>
              <Label>{t("verification.contactEmail")}</Label>
              <Input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@yourcompany.com"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t("verification.contactEmailHint")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("verification.website")}</Label>
                <Input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div>
                <Label>{t("verification.linkedin")}</Label>
                <Input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/company/..."
                />
              </div>
            </div>
            <div>
              <Label>{t("verification.taxId")}</Label>
              <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} maxLength={40} placeholder="VAT / CIF / EIN" />
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium">{t("verification.previewLabel")}</span>
                <TrustBadge level={previewLevel} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("verification.previewHint")}</p>
            </div>

            <details className="rounded-md border border-border p-3">
              <summary className="text-sm font-medium cursor-pointer">{t("verification.optionalDocs")}</summary>
              <div className="mt-3 space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <FileUp className="h-4 w-4" />
                  {kind === "individual" ? t("verification.idDoc") : t("verification.companyDoc")}
                </Label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">{t("verification.docHint")}</p>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={requestManual}
                    onCheckedChange={(v) => setRequestManual(v === true)}
                  />
                  <span>{t("verification.requestManual")}</span>
                </label>
              </div>
            </details>

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
  const map: Record<string, { Icon: typeof ShieldCheck; cls: string; label: string }> = {
    unverified: { Icon: ShieldCheck, cls: "text-muted-foreground bg-muted", label: t("verification.statusUnverified") },
    pending: { Icon: Clock, cls: "text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/30", label: t("verification.statusPending") },
    verified: { Icon: CheckCircle2, cls: "text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/30", label: t("verification.statusVerified") },
    rejected: { Icon: XCircle, cls: "text-destructive bg-destructive/10", label: t("verification.statusRejected") },
  };
  const v = map[status] ?? map.unverified;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${v.cls}`}>
      <v.Icon className="h-3.5 w-3.5" />
      {v.label}
    </span>
  );
}

function TrustBadge({ level }: { level: string }) {
  const { t } = useTranslation();
  const map: Record<string, { cls: string; label: string }> = {
    unverified: { cls: "text-muted-foreground bg-muted", label: t("verification.trustUnverified") },
    basic: { cls: "text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/30", label: t("verification.trustBasic") },
    trusted: { cls: "text-sky-700 bg-sky-100 dark:text-sky-200 dark:bg-sky-900/30", label: t("verification.trustTrusted") },
    manual: { cls: "text-violet-700 bg-violet-100 dark:text-violet-200 dark:bg-violet-900/30", label: t("verification.trustManual") },
  };
  const v = map[level] ?? map.unverified;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${v.cls}`}>
      <ShieldCheck className="h-3.5 w-3.5" />
      {v.label}
    </span>
  );
}
