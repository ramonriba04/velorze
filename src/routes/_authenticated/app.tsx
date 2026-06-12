import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMyRole } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { assignMyRole } from "@/lib/profiles.functions";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, TrendingUp } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppHome,
});

function AppHome() {
  const { role, loading } = useMyRole();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const assign = useServerFn(assignMyRole);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (loading || picking) return;
    const pending = typeof window !== "undefined" ? localStorage.getItem("capora_pending_role") : null;
    if (!role && pending && (pending === "empresa" || pending === "inversor")) {
      setPicking(true);
      assign({ data: { role: pending } }).finally(() => {
        localStorage.removeItem("capora_pending_role");
        window.location.reload();
      });
      return;
    }
    if (role === "empresa") navigate({ to: "/empresa" });
    else if (role === "inversor") navigate({ to: "/inversor" });
    else if (role === "admin") navigate({ to: "/admin" });
  }, [role, loading, navigate, picking, assign]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">{t("common.loading")}</div>;

  if (!role) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card className="p-8">
          <h1 className="text-2xl font-bold">{t("auth.roleTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.roleSub")}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={async () => { await assign({ data: { role: "empresa" } }); window.location.reload(); }}
              className="rounded-lg border p-5 text-left hover:border-primary hover:bg-primary/5 transition"
            >
              <Building2 className="h-6 w-6 text-primary" />
              <h3 className="mt-2 font-semibold">{t("auth.roleCompany")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("auth.roleCompanyDesc")}</p>
            </button>
            <button
              onClick={async () => { await assign({ data: { role: "inversor" } }); window.location.reload(); }}
              className="rounded-lg border p-5 text-left hover:border-primary hover:bg-primary/5 transition"
            >
              <TrendingUp className="h-6 w-6 text-primary" />
              <h3 className="mt-2 font-semibold">{t("auth.roleInvestor")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("auth.roleInvestorDesc")}</p>
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return <div className="p-10 text-center text-muted-foreground">{t("common.loading")}</div>;
}
